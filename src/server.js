import env from './config/env.js';
import { testConnection } from './config/database.js';
import { initTelegram } from './config/telegram.js';
import { notify } from './core/notifier.js';
import logger from './utils/logger.js';
import app from './app.js';

async function start() {
  logger.info('==============================================');
  logger.info('  Mi Cafeteria - Smart Modules Server');
  logger.info(`  Environment: ${env.nodeEnv}`);
  logger.info('==============================================');

  // 1. Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    logger.error('Cannot start without database. Exiting.');
    process.exit(1);
  }

  // 2. Initialize Telegram bot
  initTelegram();

  // 3. Start HTTP server
  const server = app.listen(env.port, () => {
    logger.info(`Server running on http://localhost:${env.port}`);
    logger.info('Ready to accept requests');

    // Non-blocking startup notification
    notify(`Server started on port ${env.port} (${env.nodeEnv})`).catch(() => {});
  });

  // ─── GRACEFUL SHUTDOWN ──────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    await notify('Server shutting down...').catch(() => {});

    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error.message);
    process.exit(1);
  });
}

start();
