import CustomError from '../utils/customError.js';
import HTTP_STATUS from '../constants/httpStatus.js';

const isSuperAdmin = (req, res, next) => {
  if (req.admin?.role !== 'super-admin') {
    return next(
      new CustomError(HTTP_STATUS.FORBIDDEN, 'Access denied: Super-admin only')
    );
  }

  next();
};

export default isSuperAdmin;
