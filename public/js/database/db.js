require('dotenv').config();
const { Client } = require('pg');

const db_client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DB,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function initdb() {
  await db_client.connect();
}

module.exports = {
  initdb,
  db_client,
};
