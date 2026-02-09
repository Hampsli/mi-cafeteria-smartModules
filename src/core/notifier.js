import { getBot } from '../config/telegram.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Notification service powered by Telegram.
 * Any module can call these functions to send messages.
 */

/**
 * Send a plain text notification to the configured Telegram chat.
 * @param {string} message - Text message to send
 */
export async function notify(message) {
  const bot = getBot();
  if (!bot) {
    logger.warn('[Notifier] Telegram bot not initialized, skipping notification');
    return false;
  }

  try {
    await bot.sendMessage(env.telegramChatId, message, { parse_mode: 'HTML' });
    logger.debug(`[Notifier] Sent: ${message.substring(0, 80)}...`);
    return true;
  } catch (error) {
    logger.error(`[Notifier] Failed to send message: ${error.message}`);
    return false;
  }
}

/**
 * Send a structured notification with a title and key-value details.
 * @param {string} title - Notification title
 * @param {object} details - Key-value pairs to display
 */
export async function notifyStructured(title, details = {}) {
  const lines = [`<b>${title}</b>`, ''];
  for (const [key, value] of Object.entries(details)) {
    lines.push(`<b>${key}:</b> ${value}`);
  }
  lines.push('', `<i>${new Date().toISOString()}</i>`);
  return notify(lines.join('\n'));
}

/**
 * Send an error notification to Telegram.
 * @param {string} errorMessage - Error description
 * @param {object} context - Additional context
 */
export async function notifyError(errorMessage, context = {}) {
  return notifyStructured('--- ERROR ---', {
    Error: errorMessage,
    ...context,
    Environment: env.nodeEnv,
  });
}

/**
 * Send a module event notification.
 * @param {string} moduleName - Module that emitted the event
 * @param {string} eventName - Event name
 * @param {object} data - Event data summary
 */
export async function notifyEvent(moduleName, eventName, data = {}) {
  return notifyStructured(`Module Event: ${eventName}`, {
    Module: moduleName,
    Event: eventName,
    ...data,
  });
}

export default { notify, notifyStructured, notifyError, notifyEvent };
