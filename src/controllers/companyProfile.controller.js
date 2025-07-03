import CompanyProfile from '../models/companyProfile.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import HTTP_STATUS from '../constants/httpStatus.js';
import { deleteFromCloudinary } from '../utils/cloudinary.js';

export const createCompanyProfile = asyncWrapper(async (req, res, next) => {
  const {
    company_name,
    website_link,
    established,
    address,
    button_name,
    button_redirect_url,
  } = req.body;

  const profileImage = req.file;

  if (!profileImage) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Profile image is required'));
  }

  const existingProfile = await CompanyProfile.findOne();
  if (existingProfile) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Company profile already exists'));
  }

  const companyProfile = await CompanyProfile.create({
    company_name,
    website_link,
    established,
    address,
    button_name,
    button_redirect_url,
    profile_image: {
      public_id: profileImage.public_id,
      url: profileImage.secure_url,
    },
  });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Company profile created successfully',
    company_profile: companyProfile,
  });
});

export const getCompanyProfile = asyncWrapper(async (req, res, next) => {
  const companyProfile = await CompanyProfile.findOne();

  if (!companyProfile) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Company profile not found'));
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    company_profile: companyProfile,
  });
});

export const updateCompanyProfile = asyncWrapper(async (req, res, next) => {
  const {
    company_name,
    website_link,
    established,
    address,
    button_name,
    button_redirect_url,
  } = req.body;

  const { id } = req.params;
  const profileImage = req.file;

  const companyProfile = await CompanyProfile.findById(id);
  if (!companyProfile) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Company profile not found'));
  }

  if (!profileImage) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Profile image is required'));
  }

  // Delete previous image from Cloudinary
  await deleteFromCloudinary(companyProfile.profile_image.public_id);

  companyProfile.company_name = company_name;
  companyProfile.website_link = website_link;
  companyProfile.established = established;
  companyProfile.address = address;
  companyProfile.button_name = button_name;
  companyProfile.button_redirect_url = button_redirect_url;
  companyProfile.profile_image = {
    public_id: profileImage.public_id,
    url: profileImage.secure_url,
  };

  await companyProfile.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Company profile updated successfully',
    company_profile: companyProfile,
  });
});

export const deleteCompanyProfile = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const companyProfile = await CompanyProfile.findById(id);
  if (!companyProfile) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Company profile not found'));
  }

  await deleteFromCloudinary(companyProfile.profile_image.public_id);
  await companyProfile.deleteOne();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Company profile deleted successfully',
  });
});
