import HTTP_STATUS from '../constants/httpStatus.js';

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal Server Error';

  // Handle express-validator errors
  if (err.array && typeof err.array === 'function') {
    const errors = err.array();
    if (errors.length > 0) {
      message = errors[0].msg; // return first validation message
      statusCode = HTTP_STATUS.BAD_REQUEST;
    }
  }

  return res.status(statusCode).json({
    success: false,
    error: message,
  });
};

export default errorHandler;
