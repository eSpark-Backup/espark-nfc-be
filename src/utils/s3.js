import AWS from 'aws-sdk';
import envConfig from '../config/envConfig.js';

const s3 = new AWS.S3({
  accessKeyId: envConfig.s3.accessKey,
  secretAccessKey: envConfig.s3.secretKey,
  region: envConfig.s3.region,
  endpoint: envConfig.s3.endpoint, // Optional, use only if needed (e.g. custom S3-compatible storage)
});

export default s3;
