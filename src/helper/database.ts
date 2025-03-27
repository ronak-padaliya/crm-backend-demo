import pg, { PoolConfig } from 'pg';

const { Pool } = pg;

import { config } from '../config/ind.js';

//  Debug: Check if DATABASE_URL is available
// console.log('NODE_ENV:', process.env.NODE_ENV);
// console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Loaded' : '❌ MISSING');

//  Validate database configuration
if (!config.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not defined in environment variables');
  process.exit(1);
}

//  Correct PostgreSQL connection config
const dbConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};


//  Log database config (without sensitive data)
// console.log('DB Connection Config:', {
//   host: new URL(config.DATABASE_URL).hostname,
//   database: new URL(config.DATABASE_URL).pathname.replace('/', ''),
//   ssl: true
// });

//  Create the PostgreSQL pool
const pool = new Pool(dbConfig);

//  Handle unexpected errors in the pool
pool.on('error', (err: Error) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

//  Function to test database connection
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    return false;
  }
};

//  Query helper function with error handling
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // console.log(' Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Query error:', error);
    throw error;
  }
};

//  Transaction helper function
export const transaction = async <T>(callback: (client: any) => Promise<T>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const closeConnection = async () => {
  // Logic to close the database connection
  await pool.end(); // Example for a PostgreSQL pool
};

//  Export pool and helpers
export default {
  pool,
  query,
  transaction,
  testConnection,
  closeConnection
};
