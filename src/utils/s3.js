import AWS from 'aws-sdk';
import envConfig from '../config/envConfig.js';

const s3 = new AWS.S3({
  region: envConfig.s3.region,
  endpoint: envConfig.s3.endpoint,
  accessKeyId: envConfig.s3.accessKey,
  secretAccessKey: envConfig.s3.secretKey,
  signatureVersion: 'v4',
  s3ForcePathStyle: true,
});

export default s3;
