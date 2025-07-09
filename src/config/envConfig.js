import dotenv from 'dotenv';
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
    throw new Error(`Missing required environment variable: ${key}`);
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
    endpoint: process.env.S3_ENDPOINT || null, // Optional: for localstack or custom S3-compatible services
  },

  superAdmin: {
    secret: process.env.SUPER_ADMIN_CREATION_SECRET,
  },
};

export default envConfig;
