import 'dotenv/config';
import pg from 'pg';


const { Client } = pg;

export const db_client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DB,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

export async function initdb() {
  await db_client.connect();
}
