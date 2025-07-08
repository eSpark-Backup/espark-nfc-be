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

export const generatePresignedUrl = async (key) => {
  const params = {
    Bucket: envConfig.s3.bucket,
    Key: key,
    Expires: 60 * 60, // valid for 1 hour
  };

  return s3.getSignedUrlPromise('getObject', params);
};

export default s3;
