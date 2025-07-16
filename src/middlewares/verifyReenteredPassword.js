import bcrypt from 'bcryptjs';
import CustomError from '../utils/customError.js';
import HTTP_STATUS from '../constants/httpStatus.js';

const verifyReenteredPassword = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return next(
        new CustomError(HTTP_STATUS.BAD_REQUEST, 'Password is required to confirm deletion')
      );
    }

    const admin = req.admin;

    // Fetch hashed password from DB (since you exclude it in auth middleware)
    const adminWithPassword = await admin.constructor.findById(admin._id).select('+password');
    if (!adminWithPassword) {
      return next(new CustomError(HTTP_STATUS.UNAUTHORIZED, 'Admin not found'));
    }

    const isMatch = await bcrypt.compare(password, adminWithPassword.password);
    if (!isMatch) {
      return next(new CustomError(HTTP_STATUS.UNAUTHORIZED, 'Incorrect password'));
    }

    next();
  } catch (err) {
    next(err);
  }
};

export default verifyReenteredPassword;
