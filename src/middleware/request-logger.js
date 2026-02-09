import morgan from 'morgan';
import env from '../config/env.js';

/**
 * HTTP request logger middleware.
 * Uses 'dev' format in development, 'combined' in production.
 */
const requestLogger = morgan(env.isDev ? 'dev' : 'combined');

export default requestLogger;
