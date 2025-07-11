import dotenv from 'dotenv';
import fs from 'fs';

// Optional: Warn if .env file is missing (useful in development)
if (!fs.existsSync('.env')) {
  console.warn(
    '⚠️  .env file not found. Make sure environment variables are set manually or in deployment config.'
  );
}

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnv = [
  'MONGODB_URI',
  'JWT_SECRET',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'S3_REGION',
  'S3_BUCKET',
];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`❌ Missing required environment variable: ${key}`);
  }
});

const envConfig = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  mongoUri: process.env.MONGODB_URI,

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  s3: {
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET,
    endpoint: process.env.S3_ENDPOINT || null, // Optional for custom S3-compatible services
  },

  superAdmin: {
    secret: process.env.SUPER_ADMIN_CREATION_SECRET,
  },
};

export default envConfig;
