import logger from '../utils/logger.js';
import { getBot } from '../config/telegram.js';
import env from '../config/env.js';

/**
 * Global error handling middleware.
 * Logs errors, sends critical ones to Telegram, and returns a clean JSON response.
 */
export default function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`[${req.method}] ${req.originalUrl} -> ${statusCode}: ${message}`);

  // Send critical errors (5xx) to Telegram
  if (statusCode >= 500) {
    notifyTelegram(err, req).catch(() => {});
  }

  res.status(statusCode).json({
    success: false,
    message: env.isDev ? message : 'Internal Server Error',
    ...(env.isDev && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
}

async function notifyTelegram(err, req) {
  const bot = getBot();
  if (!bot) return;

  const text = [
    '--- ERROR ALERT ---',
    `Env: ${env.nodeEnv}`,
    `Endpoint: ${req.method} ${req.originalUrl}`,
    `Error: ${err.message}`,
    `Time: ${new Date().toISOString()}`,
  ].join('\n');

  try {
    await bot.sendMessage(env.telegramChatId, text);
  } catch (telegramErr) {
    logger.error(`Failed to send error to Telegram: ${telegramErr.message}`);
  }
}
