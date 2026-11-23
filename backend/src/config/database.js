import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

export async function openDatabase({ url = process.env.DATABASE_URL, schema } = {}) {
  if (!url?.trim()) throw new Error('Set DATABASE_URL to your Supabase Session pooler connection string.');
  const pool = new Pool({
    connectionString: url,
    max: 10,
    connectionTimeoutMillis: 5000,
    onConnect: schema && ((client) => client.query("SELECT set_config('search_path', quote_ident($1) || ', pg_catalog', false)", [schema])),
  });
  pool.on('error', (error) => console.error('PostgreSQL connection error', error.code));
  try {
    await pool.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  } catch (error) {
    await pool.end();
    throw error;
  }
  return {
    query: (sql, values) => pool.query(sql, values),
    close: () => pool.end(),
    async transaction(work) {
      const connection = await pool.connect();
      try {
        await connection.query('BEGIN');
        const result = await work(connection);
        await connection.query('COMMIT');
        return result;
      } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
      } finally {
        connection.release();
      }
    },
  };
}

let database;
export function getDatabase() {
  database ??= openDatabase();
  return database;
}
