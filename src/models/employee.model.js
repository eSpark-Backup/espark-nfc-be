import mongoose from 'mongoose';
import validator from 'validator';
import imageSchema from './shared/imageSchema.js';
import socialLinksSchema from './shared/socialLinksSchema.js';
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
        validator: (v) => /^\+?[0-9]{7,15}$/.test(v),
        message: 'Phone number must be between 7 and 15 digits',
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
    profile_image: imageSchema,
    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    ...auditFields,
  },
  baseSchemaOptions
);

// Virtual populate: department info
employeeSchema.virtual('department', {
  ref: 'Department',
  localField: 'department_id',
  foreignField: '_id',
  justOne: true,
});

// Indexes
employeeSchema.index({ email: 1 }, { unique: true });
employeeSchema.index({ phone_number: 1 }, { unique: true });

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;
