import pg from 'pg';
import { db_user, db_password, db_base, db_host, db_port } from '../envs.js';


const { Client } = pg;


export const db_client = new Client({
  user: db_user,
  host: db_host,
  database: db_base,
  password: db_password,
  port: db_port,
});

export async function initdb() {
  await db_client.connect();
}
