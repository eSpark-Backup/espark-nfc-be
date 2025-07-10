import jwt from 'jsonwebtoken';
import envConfig from '../config/envConfig.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import Admin from '../models/admin.model.js';
import HTTP_STATUS from '../constants/httpStatus.js';

const verifyToken = asyncWrapper(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new CustomError(HTTP_STATUS.UNAUTHORIZED, 'Authorization token missing'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, envConfig.jwt.secret);
    const admin = await Admin.findById(decoded.id).select('-password');

    if (!admin || admin.is_deleted || !admin.is_active) {
      return next(new CustomError(HTTP_STATUS.UNAUTHORIZED, 'Access Denied'));
    }

    req.admin = admin;
    next();
  } catch (error) {
    return next(new CustomError(HTTP_STATUS.UNAUTHORIZED, 'Invalid or expired token'));
  }
});

export default verifyToken;
