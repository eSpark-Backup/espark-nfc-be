// testS3Upload.js
import AWS from 'aws-sdk';
import {envConfig} from './src/config/envConfig.js'; // adjust path if needed

// Initialize S3 client
const s3 = new AWS.S3({
  region: envConfig.s3.region,
  accessKeyId: envConfig.s3.accessKey,
  secretAccessKey: envConfig.s3.secretKey,
});

// Test upload
const params = {
  Bucket: envConfig.s3.bucket,
  Key: 'images/test.txt', // will upload inside /images folder
  Body: 'Hello world!',
  ContentType: 'text/plain',
};

s3.upload(params, (err, data) => {
  if (err) {
    console.error('❌ Upload failed:', err);
  } else {
    console.log('✅ Upload success:', data);
  }
});
