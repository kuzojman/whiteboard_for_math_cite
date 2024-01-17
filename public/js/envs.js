import 'dotenv/config';


export const port = process.env.BOARD_PORT || 3000;


export const dbUser = process.env.DB_USER
export const dbHost = process.env.DB_HOST
export const dbBase = process.env.DB_DB
export const dbPassword = process.env.DB_PASSWORD
export const dbPort = process.env.DB_PORT


export const s3EndpointUrl = process.env.S3_ENDPOINT_URL
export const s3AwsAccessKeyID = process.env.S3_AWS_ACCESS_KEY_ID
export const s3AwsSecretAccessKey = process.env.S3_AWS_SECRET_ACCESS_KEY
export const s3Bucket = process.env.S3_BUCKET