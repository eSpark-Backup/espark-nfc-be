import multer from 'multer';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const storage = multer.memoryStorage();
const upload = multer({ storage });

const cloudinaryUpload = (folder) => async (req, res, next) => {
  if (!req.file) return next();

  try {
    const result = await uploadToCloudinary(req.file.buffer, folder);
    req.file = {
      public_id: result.public_id,
      secure_url: result.secure_url,
    };
    next();
  } catch (error) {
    next(error);
  }
};

export default upload;
export { cloudinaryUpload };
