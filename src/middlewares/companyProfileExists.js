import { CompanyProfile } from '../models/companyProfile.model.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';

export const companyProfileExists = asyncWrapper(async (req, res, next) => {
  if (req.user?.role === 'super-admin') {
    const companyExists = await CompanyProfile.exists({});
    if (!companyExists) {
      return res.status(403).json({
        success: false,
        message: 'Company profile is required before accessing this resource.',
      });
    }
  }
  next();
});