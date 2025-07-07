import AWS from 'aws-sdk';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const s3 = new AWS.S3({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  signatureVersion: 'v4',
  s3ForcePathStyle: true,
});

const testUpload = async () => {
  const buffer = fs.readFileSync('./iphone.jpg'); // place a test.jpg in root

  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: `test-${Date.now()}.jpg`,
    Body: buffer,
    ContentType: 'image/jpeg'
  };

  try {
    const result = await s3.upload(params).promise();
    console.log('✅ Upload successful:', result.Location);
  } catch (err) {
    console.error('❌ Upload failed:', err);
  }
};

testUpload();
