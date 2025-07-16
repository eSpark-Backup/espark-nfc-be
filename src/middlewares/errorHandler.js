import { HTTP_STATUS } from '../constants/httpStatus.js';

export const errorHandler = (err, req, res, next) => {
  console.error(err);

  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal Server Error';

  // Handle express-validator errors
  if (err.array && typeof err.array === 'function') {
    const errors = err.array();
    if (errors.length > 0) {
      message = errors[0].msg;
      statusCode = HTTP_STATUS.BAD_REQUEST;
    }
  }

  // Handle Multer-specific errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    message = 'File size should not exceed 5MB';
    statusCode = HTTP_STATUS.BAD_REQUEST;
  }

  // Handle unsupported file types (from fileFilter)
  if (err.message === 'Only JPEG, PNG, and WEBP image formats are allowed') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
  }

  return res.status(statusCode).json({
    success: false,
    error: message,
  });
};