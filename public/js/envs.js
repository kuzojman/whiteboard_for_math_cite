import 'dotenv/config';


export const port = process.env.BOARD_PORT || 3000;


export const db_user = process.env.DB_USER
export const db_host = process.env.DB_HOST
export const db_base = process.env.DB_DB
export const db_password = process.env.DB_PASSWORD
export const db_port = process.env.DB_PORT