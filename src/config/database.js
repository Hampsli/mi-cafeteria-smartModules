import pg from 'pg';
import env from './env.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: env.isDev ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err.message);
});

/**
 * Execute a query against the database.
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<pg.QueryResult>}
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Query executed in ${duration}ms | rows: ${result.rowCount}`);
    return result;
  } catch (error) {
    logger.error(`Query failed: ${error.message}`);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions.
 * @returns {Promise<pg.PoolClient>}
 */
export async function getClient() {
  return pool.connect();
}

/**
 * Test the database connection.
 */
export async function testConnection() {
  try {
    const result = await query('SELECT NOW() as current_time');
    logger.info(`Database connected at ${result.rows[0].current_time}`);
    return true;
  } catch (error) {
    logger.error(`Database connection failed: ${error.message}`);
    return false;
  }
}

export default { query, getClient, testConnection, pool };
