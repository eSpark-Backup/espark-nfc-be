import mongoose from 'mongoose';
import validator from 'validator';

const companyProfileSchema = new mongoose.Schema(
  {
    company_name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      max_length: [150, 'Company name must not exceed 150 characters'],
    },
    website_link: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => !value || validator.isURL(value),
        message: 'Invalid website URL',
      },
    },
    established: {
      type: String,
      trim: true,
      max_length: [30, 'Established field must not exceed 30 characters'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    button_name: {
      type: String,
      trim: true,
      max_length: [50, 'Button name must not exceed 50 characters'],
    },
    button_redirect_url: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => !value || validator.isURL(value),
        message: 'Invalid redirect URL',
      },
    },
    image_url: {
      type: String,
      required: true,
    },
    image_key: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    toJSON: {
      virtual: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const CompanyProfile = mongoose.model('CompanyProfile', companyProfileSchema);

export default CompanyProfile;
