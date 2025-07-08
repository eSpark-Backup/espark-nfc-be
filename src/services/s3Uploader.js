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

export const uploadToS3 = async (fileBuffer, originalName, mimeType) => {
  const timestamp = Date.now();
  const fileKey = `${timestamp}-${originalName}`; // ✅ Consistent, clean key

  // Defensive check
  if (!Buffer.isBuffer(fileBuffer)) {
    throw new Error('Provided fileBuffer is not a valid Buffer.');
  }

  const params = {
    Bucket: envConfig.s3.bucket,
    Key: fileKey,
    Body: fileBuffer,
    ContentType: mimeType,
  };

  const uploaded = await s3.upload(params).promise();
  console.log('✅ Full Upload Response:', uploaded);

  return {
    key: uploaded.Key,
    url: uploaded.Location,
  };
};

export const deleteFromS3 = async (key) => {
  const params = {
    Bucket: envConfig.s3.bucket,
    Key: key,
  };

  await s3.deleteObject(params).promise();
};
