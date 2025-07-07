import s3 from '../utils/s3.js';
import { v4 as uuid4 } from 'uuid';

export const uploadToS3 = async (fileBuffer, originalName, mimeType) => {
  const fileKey = `${uuid4()}-${originalName}`;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey,
    Body: fileBuffer,
    ContentType: mimeType,
    ACL: 'public-read',
  };

  await s3.upload(params).promise();

  return {
    key: fileKey,
    url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
  };
};

export const deleteFromS3 = async (fileKey) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey,
  };

  await s3.deleteObject(params).promise();
};
