import CompanyProfile from '../models/companyProfile.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import HTTP_STATUS from '../constants/httpStatus.js';
import { uploadToS3, deleteFromS3 } from '../services/s3Uploader.js';
import { generatePresignedUrl } from '../utils/s3.js';
import { processImage } from '../utils/imageProcessor.js';

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

  const optimizedBuffer = await processImage(profileImage.buffer);
  const filename = `company-profile-${Date.now()}.webp`;

  const uploadResult = await uploadToS3(optimizedBuffer, filename, 'image/webp');

  const companyProfile = await CompanyProfile.create({
    company_name,
    website_link,
    established,
    address,
    button_name,
    button_redirect_url,
    profile_image: {
      image_key: uploadResult?.key || null,
      image_url: uploadResult?.url || null,
    },
  });

  if (companyProfile.profile_image?.image_key) {
    companyProfile.profile_image.image_url = await generatePresignedUrl(
      companyProfile.profile_image.image_key
    );
  }

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

  if (companyProfile.profile_image?.image_key) {
    companyProfile.profile_image.image_url = await generatePresignedUrl(
      companyProfile.profile_image.image_key
    );
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

  const trimmedName = company_name?.trim();
  const trimmedWebsite = website_link?.trim();
  const trimmedEstablished = established?.trim();
  const trimmedAddress = address?.trim();
  const trimmedButtonName = button_name?.trim();
  const trimmedButtonUrl = button_redirect_url?.trim();

  let updated = false;
  let imageUpdated = false;

  if (trimmedName && trimmedName !== companyProfile.company_name) {
    companyProfile.company_name = trimmedName;
    updated = true;
  }
  if (trimmedWebsite && trimmedWebsite !== companyProfile.website_link) {
    companyProfile.website_link = trimmedWebsite;
    updated = true;
  }
  if (trimmedEstablished && trimmedEstablished !== companyProfile.established) {
    companyProfile.established = trimmedEstablished;
    updated = true;
  }
  if (trimmedAddress && trimmedAddress !== companyProfile.address) {
    companyProfile.address = trimmedAddress;
    updated = true;
  }
  if (trimmedButtonName && trimmedButtonName !== companyProfile.button_name) {
    companyProfile.button_name = trimmedButtonName;
    updated = true;
  }
  if (trimmedButtonUrl && trimmedButtonUrl !== companyProfile.button_redirect_url) {
    companyProfile.button_redirect_url = trimmedButtonUrl;
    updated = true;
  }

  // ✅ Handle image update
  if (profileImage) {
    if (companyProfile.profile_image?.image_key) {
      await deleteFromS3(companyProfile.profile_image.image_key);
    }

    const optimizedBuffer = await processImage(profileImage.buffer);
    const filename = `company-profile-${Date.now()}.webp`;

    const uploadResult = await uploadToS3(optimizedBuffer, filename, 'image/webp');

    companyProfile.profile_image = {
      image_key: uploadResult?.key || null,
      image_url: uploadResult?.url || null,
    };

    imageUpdated = true;
  }

  // ✅ Handle image removal
  else if (
    !req.file &&
    'profile_image' in req.body &&
    (!req.body.profile_image || req.body.profile_image === 'null')
  ) {
    if (companyProfile.profile_image?.image_key) {
      await deleteFromS3(companyProfile.profile_image.image_key);
    }

    companyProfile.profile_image = { image_key: null, image_url: null };
    imageUpdated = true;
  }

  if (!updated && !imageUpdated) {
    if (companyProfile.profile_image?.image_key) {
      companyProfile.profile_image.image_url = await generatePresignedUrl(
        companyProfile.profile_image.image_key
      );
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Nothing to update',
      company_profile: companyProfile,
    });
  }

  await companyProfile.save();

  if (companyProfile.profile_image?.image_key) {
    companyProfile.profile_image.image_url = await generatePresignedUrl(
      companyProfile.profile_image.image_key
    );
  }

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

  if (companyProfile.profile_image?.image_key) {
    await deleteFromS3(companyProfile.profile_image.image_key);
  }

  await companyProfile.deleteOne();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Company profile deleted successfully',
  });
});
