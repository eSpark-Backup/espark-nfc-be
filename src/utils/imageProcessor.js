import sharp from 'sharp';

/**
 * Process image using Sharp
 * - Validates format
 * - Resizes to max 512x512 (preserving aspect ratio)
 * - Converts to WebP (can change if needed)
 * - Compresses output
 *
 * @param {Buffer} buffer - Image buffer from multer
 * @returns {Promise<Buffer>} - Processed image buffer
 */
export const processImage = async (buffer) => {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  // Validate format
  if (!['jpeg', 'png', 'webp'].includes(metadata.format)) {
    throw new Error('Unsupported image format');
  }

  // Resize & convert
  return await image
    .resize({
      width: 512,
      height: 512,
      fit: sharp.fit.inside,
      withoutEnlargement: true,
    })
    .toFormat('webp', { quality: 80 }) // You can use 'jpeg' or 'png' instead
    .toBuffer();
};
