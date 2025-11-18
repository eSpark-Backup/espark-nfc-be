import AWS from 'aws-sdk';
import { envConfig } from '../config/envConfig.js';
import { CustomError } from '../utils/customError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const s3 = new AWS.S3({
  region: envConfig.s3.region,
  endpoint: envConfig.s3.endpoint,
  accessKeyId: envConfig.s3.accessKey,
  secretAccessKey: envConfig.s3.secretKey,
  signatureVersion: 'v4',
  s3ForcePathStyle: true,
});

// export const generatePresignedUrl = async (key) => {
//   if (!key || typeof key !== 'string') {
//     throw new CustomError(HTTP_STATUS.BAD_REQUEST, 'Invalid S3 object key');
//   }

//   return `https://www.eurosystemsint.com/${key}`;
// };

export const generatePresignedUrl = async (key) => {
  if (!key || typeof key !== 'string') {
    throw new CustomError(HTTP_STATUS.BAD_REQUEST, 'Invalid S3 object key');
  }

  const cleanedKey = key.startsWith('images/') ? key : `images/${key}`;
  return `https://www.eurosystemsint.com/${cleanedKey}`;
};
