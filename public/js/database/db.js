import pg from 'pg';
import { dbUser, dbPassword, dbBase, dbHost, dbPort } from '../envs.js';


const { Client } = pg;


export const db_client = new Client({
  user: dbUser,
  host: dbHost,
  database: dbBase,
  password: dbPassword,
  port: dbPort,
});

export async function initdb() {
  await db_client.connect();
}
