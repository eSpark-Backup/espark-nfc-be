import QRCode from 'qrcode';

/**
 * Generate a QR code PNG buffer from a URL
 * @param {string} url - The URL to encode in QR
 * @returns {Promise<Buffer>} - PNG buffer
 */
export async function generateQRCodePNG(url) {
  try {
    return await QRCode.toBuffer(url, {
      type: 'png',
      errorCorrectionLevel: 'H',
      margin: 2,
      scale: 8,
      width: 300,
    });
  } catch (err) {
    throw new Error(`QR code generation failed: ${err.message}`);
  }
}
