import { CompanyProfile } from '../models/companyProfile.model.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { CustomError } from '../utils/customError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const companyProfileExists = asyncWrapper(async (req, res, next) => {
  const companyExists = await CompanyProfile.exists({});
  if (!companyExists) {
    return next(
      new CustomError(HTTP_STATUS.FORBIDDEN, 'You need to create a company profile to continue')
    );
  }
  next();
});
