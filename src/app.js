import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import requestLogger from './middleware/request-logger.js';
import errorHandler from './middleware/error-handler.js';
import { globalLimiter, webhookLimiter } from './middleware/rate-limiter.js';
import { loadModules, getLoadedModules } from './core/module-loader.js';
import webhookManager from './core/webhook-manager.js';
import { success, badRequest } from './utils/response.js';
import logger from './utils/logger.js';

const app = express();

// ─── GLOBAL MIDDLEWARE ────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(globalLimiter);

// ─── HEALTH CHECK ─────────────────────────────────────────
app.get('/health', (req, res) => {
  success(res, {
    status: 'healthy',
    uptime: process.uptime(),
    modules: getLoadedModules().map((m) => ({ name: m.name, version: m.version })),
  });
});

// ─── SYSTEM ROUTES ────────────────────────────────────────

// List all loaded modules and their info
app.get('/api/system/modules', (req, res) => {
  success(res, getLoadedModules(), 'Loaded modules');
});

// ─── INCOMING WEBHOOK ENDPOINT (from Java / external apps) ─
app.post('/api/webhooks/incoming', webhookLimiter, async (req, res, next) => {
  try {
    const { event, payload } = req.body;
    if (!event) return badRequest(res, 'Missing "event" field in body');

    logger.info(`[Incoming Webhook] Received event: ${event}`);
    await webhookManager.dispatch(event, payload || {});

    return success(res, { event, received: true }, 'Webhook received and dispatched');
  } catch (error) {
    next(error);
  }
});

// ─── WEBHOOK SUBSCRIPTION MANAGEMENT ─────────────────────
app.post('/api/webhooks/subscribe', async (req, res, next) => {
  try {
    const { event_name, target_url, description } = req.body;
    if (!event_name || !target_url) {
      return badRequest(res, 'Missing "event_name" or "target_url"');
    }
    const subscription = await webhookManager.subscribe(event_name, target_url, description);
    return success(res, subscription, 'Subscribed successfully');
  } catch (error) {
    next(error);
  }
});

app.post('/api/webhooks/unsubscribe', async (req, res, next) => {
  try {
    const { event_name, target_url } = req.body;
    if (!event_name || !target_url) {
      return badRequest(res, 'Missing "event_name" or "target_url"');
    }
    await webhookManager.unsubscribe(event_name, target_url);
    return success(res, null, 'Unsubscribed successfully');
  } catch (error) {
    next(error);
  }
});

app.get('/api/webhooks/subscriptions', async (req, res, next) => {
  try {
    const { event_name } = req.query;
    const subscriptions = await webhookManager.listSubscriptions(event_name);
    return success(res, subscriptions, 'Active subscriptions');
  } catch (error) {
    next(error);
  }
});

// ─── LOAD MODULES ─────────────────────────────────────────
await loadModules(app);

// ─── 404 HANDLER ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  });
});

// ─── ERROR HANDLER (must be last) ─────────────────────────
app.use(errorHandler);

export default app;
