import { EventEmitter } from 'events';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import { notifyError } from './notifier.js';

/**
 * Webhook Manager
 *
 * Handles bidirectional webhook communication:
 * - INTERNAL: EventEmitter-based pub/sub between modules
 * - EXTERNAL: HTTP POST dispatch to registered external URLs (Java app, Next.js, Python, etc.)
 *
 * Retry policy: 3 attempts with exponential backoff (1s, 2s, 4s).
 */

class WebhookManager extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
    this.retryConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
    };
  }

  // ─── INTERNAL EVENTS ────────────────────────────────────

  /**
   * Emit an event to internal module subscribers AND dispatch to external URLs.
   * @param {string} eventName - e.g. 'order.created'
   * @param {object} payload - Event data
   */
  async dispatch(eventName, payload) {
    const eventData = {
      event: eventName,
      payload,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID(),
    };

    logger.info(`[Webhook] Dispatching event: ${eventName} (${eventData.id})`);

    // 1. Emit internally to subscribed modules
    this.emit(eventName, eventData);

    // 2. Log event to database
    await this.logEvent(eventData);

    // 3. Dispatch to external subscribers
    await this.dispatchExternal(eventData);
  }

  // ─── EXTERNAL DISPATCH ──────────────────────────────────

  /**
   * Send event to all external URL subscribers.
   */
  async dispatchExternal(eventData) {
    try {
      const { rows: subscribers } = await query(
        'SELECT * FROM webhook_subscriptions WHERE event_name = $1 AND active = true',
        [eventData.event]
      );

      const dispatches = subscribers.map((sub) =>
        this.sendWithRetry(sub, eventData)
      );

      await Promise.allSettled(dispatches);
    } catch (error) {
      logger.error(`[Webhook] Failed to fetch subscribers: ${error.message}`);
    }
  }

  /**
   * POST to an external URL with retry logic.
   */
  async sendWithRetry(subscriber, eventData, attempt = 1) {
    try {
      const response = await fetch(subscriber.target_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': eventData.event,
          'X-Webhook-Id': eventData.id,
          'X-Webhook-Attempt': String(attempt),
        },
        body: JSON.stringify(eventData),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.info(`[Webhook] Delivered to ${subscriber.target_url} (attempt ${attempt})`);

      // Log successful delivery
      await this.logDelivery(eventData.id, subscriber.id, 'delivered', attempt);
    } catch (error) {
      logger.warn(
        `[Webhook] Delivery failed to ${subscriber.target_url} (attempt ${attempt}): ${error.message}`
      );

      if (attempt < this.retryConfig.maxRetries) {
        const delay = this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendWithRetry(subscriber, eventData, attempt + 1);
      }

      // Max retries exceeded
      logger.error(
        `[Webhook] Permanently failed for ${subscriber.target_url} after ${attempt} attempts`
      );
      await this.logDelivery(eventData.id, subscriber.id, 'failed', attempt);
      await notifyError(
        `Webhook delivery failed after ${attempt} attempts`,
        { url: subscriber.target_url, event: eventData.event }
      );
    }
  }

  // ─── SUBSCRIPTION MANAGEMENT ────────────────────────────

  /**
   * Register an external URL to receive events.
   */
  async subscribe(eventName, targetUrl, description = '') {
    const { rows } = await query(
      `INSERT INTO webhook_subscriptions (event_name, target_url, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_name, target_url) DO UPDATE SET active = true, updated_at = NOW()
       RETURNING *`,
      [eventName, targetUrl, description]
    );
    logger.info(`[Webhook] Subscribed ${targetUrl} to "${eventName}"`);
    return rows[0];
  }

  /**
   * Unsubscribe an external URL from events.
   */
  async unsubscribe(eventName, targetUrl) {
    await query(
      `UPDATE webhook_subscriptions SET active = false, updated_at = NOW()
       WHERE event_name = $1 AND target_url = $2`,
      [eventName, targetUrl]
    );
    logger.info(`[Webhook] Unsubscribed ${targetUrl} from "${eventName}"`);
  }

  /**
   * List all active subscriptions.
   */
  async listSubscriptions(eventName = null) {
    if (eventName) {
      const { rows } = await query(
        'SELECT * FROM webhook_subscriptions WHERE event_name = $1 AND active = true',
        [eventName]
      );
      return rows;
    }
    const { rows } = await query(
      'SELECT * FROM webhook_subscriptions WHERE active = true'
    );
    return rows;
  }

  // ─── EVENT LOGGING ──────────────────────────────────────

  async logEvent(eventData) {
    try {
      await query(
        `INSERT INTO webhook_events (event_id, event_name, payload)
         VALUES ($1, $2, $3)`,
        [eventData.id, eventData.event, JSON.stringify(eventData.payload)]
      );
    } catch (error) {
      logger.error(`[Webhook] Failed to log event: ${error.message}`);
    }
  }

  async logDelivery(eventId, subscriptionId, status, attempts) {
    try {
      await query(
        `INSERT INTO webhook_deliveries (event_id, subscription_id, status, attempts)
         VALUES ($1, $2, $3, $4)`,
        [eventId, subscriptionId, status, attempts]
      );
    } catch (error) {
      logger.error(`[Webhook] Failed to log delivery: ${error.message}`);
    }
  }
}

// Singleton instance
const webhookManager = new WebhookManager();
export default webhookManager;
