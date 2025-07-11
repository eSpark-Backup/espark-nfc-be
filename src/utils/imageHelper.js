import { uploadToS3, deleteFromS3 } from '../services/s3Uploader.js';
import { processImage } from './imageProcessor.js';
import { generatePresignedUrl } from './s3.js';

/**
 * Replaces the existing image (profile or general) in the document with a new one.
 * @param {Object} doc - Mongoose document.
 * @param {Buffer} buffer - Raw image buffer.
 * @param {String} prefix - Filename prefix.
 * @param {String} field - Field name (default: 'profile_image').
 */
export const replaceImage = async (doc, buffer, prefix, field = 'profile_image') => {
  const current = doc[field];

  if (current?.image_key) {
    await deleteFromS3(current.image_key);
  }

  const optimizedBuffer = await processImage(buffer);
  const filename = `${prefix}-${doc._id || Date.now()}.webp`;

  const uploaded = await uploadToS3(optimizedBuffer, filename, 'image/webp');

  doc[field] = {
    image_key: uploaded?.key || null,
    image_url: uploaded?.url || null,
  };
};

/**
 * Removes the image from a given document field.
 * @param {Object} doc - Mongoose document.
 * @param {String} field - Field name (default: 'profile_image').
 */
export const removeImage = async (doc, field = 'profile_image') => {
  const current = doc[field];

  if (current?.image_key) {
    await deleteFromS3(current.image_key);
  }

  doc[field] = { image_key: null, image_url: null };
};

/**
 * Attaches a presigned URL to the image if a key exists.
 * @param {Object} doc - Mongoose document.
 * @param {String} field - Field name (default: 'profile_image').
 */
export const attachPresignedImageUrl = async (doc, field = 'profile_image') => {
  const imageKey = doc?.[field]?.image_key;
  if (!imageKey) return;

  try {
    doc[field].image_url = await generatePresignedUrl(imageKey);
  } catch (err) {
    // Optional: log error
    doc[field].image_url = null;
  }
};
