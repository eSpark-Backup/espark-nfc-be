import mongoose from 'mongoose';
import validator from 'validator';
import { imageSchema } from './shared/imageSchema.js';
import { socialLinksSchema } from './shared/socialLinksSchema.js';
import { auditFields } from './shared/auditFields.js';
import { baseSchemaOptions } from './shared/baseSchemaOptions.js';

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
      maxlength: [100, 'Employee name must not exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      validate: {
        validator: validator.isEmail,
        message: 'Invalid email address',
      },
    },
    phone_number: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      validate: {
        validator: function (v) {
          const digitsOnly = v.replace(/\D/g, '');
          const phoneRegex = /^\+?[0-9\-]+$/;
          return digitsOnly.length >= 7 && digitsOnly.length <= 15 && phoneRegex.test(v);
        },
        message: 'Invalid phone number format',
      },
    },
    second_phone_number: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          const digitsOnly = v.replace(/\D/g, '');
          const phoneRegex = /^\+?[0-9\-]+$/;
          return digitsOnly.length >= 7 && digitsOnly.length <= 15 && phoneRegex.test(v);
        },
        message: 'Invalid second phone number format',
      },
    },

    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [18, 'Minimum age is 18'],
      max: [100, 'Maximum age is 100'],
    },
    joining_date: {
      type: Date,
      required: [true, 'Joining date is required'],
    },
    designation: {
      type: String,
      required: [true, 'Designation/title is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      minlength: [10, 'Address must be at least 10 characters'],
      maxlength: [300, 'Address must not exceed 300 characters'],
    },
    social_links: socialLinksSchema,
    about_me: {
      type: String,
      required: [true, 'About me is required'],
      trim: true,
      maxlength: [500, 'About me must not exceed 500 characters'],
    },
    profile_image: {
      type: imageSchema,
    },
    qr_url: {
      type: String,
      trim: true,
      default: null,
    },
    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    ...auditFields,
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyProfile',
      required: true,
    },
    employee_id: {
      type: String,
      unique: true,
      required: false,
    },

    view_count: {
      type: Number,
      default: 0,
    },

    wallet_passes: {
      google: {
        object_id: {
          type: String,
          default: null,
        },
        save_url: {
          type: String,
          default: null,
        },
        last_generated: {
          type: Date,
          default: null,
        },
        generation_count: {
          type: Number,
          default: 0,
        },
        status: {
          type: String,
          enum: ['ACTIVE', 'EXPIRED', 'INACTIVE', 'NOT_GENERATED'],
          default: 'NOT_GENERATED',
        },
        last_updated: {
          type: Date,
          default: null,
        },
      },
    },
  },
  baseSchemaOptions
);

employeeSchema.virtual('department', {
  ref: 'Department',
  localField: 'department_id',
  foreignField: '_id',
  justOne: true,
});

employeeSchema.index({ email: 1 }, { unique: true });
employeeSchema.index({ phone_number: 1 }, { unique: true });
employeeSchema.index({ view_count: -1 });
employeeSchema.index({ 'wallet_passes.google.object_id': 1 });

employeeSchema.pre('save', async function (next) {
  if (this.isNew) {
    const lastEmployee = await mongoose.model('Employee').findOne().sort({ created_at: -1 });
    let nextNumber = 1;

    if (lastEmployee && lastEmployee.employee_id) {
      const lastNumber = parseInt(lastEmployee.employee_id.replace('ES', ''), 10);
      nextNumber = lastNumber + 1;
    }

    this.employee_id = `ES${nextNumber.toString().padStart(2, '0')}`;
  }
  next();
});

employeeSchema.methods.updateGoogleWalletPass = function (passData) {
  this.wallet_passes.google = {
    object_id: passData.objectId,
    save_url: passData.saveUrl,
    last_generated: new Date(),
    generation_count: (this.wallet_passes?.google?.generation_count || 0) + 1,
    status: 'ACTIVE',
    last_updated: new Date(),
  };
  return this.save();
};

employeeSchema.methods.deactivateGoogleWalletPass = function () {
  if (this.wallet_passes?.google) {
    this.wallet_passes.google.status = 'EXPIRED';
    this.wallet_passes.google.last_updated = new Date();
  }
  return this.save();
};

employeeSchema.statics.findWithActiveGooglePasses = function () {
  return this.find({ 'wallet_passes.google.status': 'ACTIVE' });
};

export const Employee = mongoose.model('Employee', employeeSchema);
