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

const BUCKET = envConfig.s3.bucket;

export const uploadToS3 = async (fileBuffer, originalName, mimeType) => {
    const uniqueFileName = `${Date.now()}-${originalName}`;

    // Defensive check: ensure fileBuffer is a Buffer
    if (!Buffer.isBuffer(fileBuffer)) {
      throw new Error('Provided fileBuffer is not a valid Buffer.');
    }

    const params = {
      Bucket: BUCKET,
      Key: uniqueFileName,
      Body: fileBuffer, // must be a Buffer
      ContentType: mimeType,
    };

    const uploaded = await s3.upload(params).promise();

    return {
      key: uploaded.Key,
      url: uploaded.Location,
    };
};

export const deleteFromS3 = async (key) => {
  const params = {
    Bucket: BUCKET,
    Key: key,
  };

  await s3.deleteObject(params).promise();
};
