import TelegramBot from 'node-telegram-bot-api';
import env from './env.js';
import logger from '../utils/logger.js';

let bot = null;

/**
 * Initialize the Telegram bot in polling mode (no webhook needed for sending).
 */
export function initTelegram() {
  try {
    bot = new TelegramBot(env.telegramBotToken, { polling: false });
    logger.info('Telegram bot initialized (send-only mode)');
    return bot;
  } catch (error) {
    logger.error(`Telegram bot init failed: ${error.message}`);
    return null;
  }
}

/**
 * Get the Telegram bot instance.
 */
export function getBot() {
  if (!bot) {
    initTelegram();
  }
  return bot;
}

export default { initTelegram, getBot };
