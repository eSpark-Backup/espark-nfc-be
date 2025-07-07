import CompanyProfile from '../models/companyProfile.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import HTTP_STATUS from '../constants/httpStatus.js';
import { uploadToS3, deleteFromS3 } from '../services/s3Uploader.js';

export const createCompanyProfile = asyncWrapper(async (req, res, next) => {
  const { company_name, website_link, established, address, button_name, button_redirect_url } =
    req.body;

  const profileImage = req.file;

  if (!profileImage) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Profile image is required'));
  }

  const existingProfile = await CompanyProfile.findOne();
  if (existingProfile) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Company profile already exists'));
  }

  const fileKey = `${Date.now()}-${profileImage.originalname}`;
  const uploadResult = await uploadToS3(profileImage.buffer, fileKey, profileImage.mimetype);

  const companyProfile = await CompanyProfile.create({
    company_name,
    website_link,
    established,
    address,
    button_name,
    button_redirect_url,
    image_url: uploadResult.url,
    image_key: fileKey,
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
  const { company_name, website_link, established, address, button_name, button_redirect_url } =
    req.body;

  const { id } = req.params;
  const profileImage = req.file;

  const companyProfile = await CompanyProfile.findById(id);
  if (!companyProfile) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Company profile not found'));
  }

  const isSameName = company_name ? companyProfile.company_name === company_name : true;
  const isSameWebsite = website_link ? companyProfile.website_link === website_link : true;
  const isSameEstablished = established ? companyProfile.established === established : true;
  const isSameAddress = address ? companyProfile.address === address : true;
  const isSameButtonName = button_name ? companyProfile.button_name === button_name : true;
  const isSameButtonUrl = button_redirect_url
    ? companyProfile.button_redirect_url === button_redirect_url
    : true;
  const isSameImage = profileImage ? false : true;

  if (
    isSameName &&
    isSameWebsite &&
    isSameEstablished &&
    isSameAddress &&
    isSameButtonName &&
    isSameButtonUrl &&
    isSameImage
  ) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Company profile updated successfully',
      company_profile: companyProfile,
    });
  }

  if (profileImage) {
    if (companyProfile.image_key) {
      await deleteFromS3(companyProfile.image_key);
    }

    const fileKey = `${Date.now()}-${profileImage.originalname}`;
    const uploadResult = await uploadToS3(profileImage.buffer, fileKey, profileImage.mimetype);

    companyProfile.image_url = uploadResult.url;
    companyProfile.image_key = fileKey;
  }

  if (company_name) companyProfile.company_name = company_name;
  if (website_link) companyProfile.website_link = website_link;
  if (established) companyProfile.established = established;
  if (address) companyProfile.address = address;
  if (button_name) companyProfile.button_name = button_name;
  if (button_redirect_url) companyProfile.button_redirect_url = button_redirect_url;

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

  if (companyProfile.image_key) {
    await deleteFromS3(companyProfile.image_key);
  }

  await companyProfile.deleteOne();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Company profile deleted successfully',
  });
});
