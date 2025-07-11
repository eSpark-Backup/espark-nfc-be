import mongoose from 'mongoose';
import validator from 'validator';
import imageSchema from './shared/imageSchema.js';
import { auditFields } from './shared/auditFields.js';
import { baseSchemaOptions } from './shared/baseSchemaOptions.js';

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
      maxlength: [100, 'Department name must not exceed 100 characters'],
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
    image: imageSchema,
    ...auditFields,
  },
  baseSchemaOptions
);

// Virtual populate: all employees in department
departmentSchema.virtual('employees', {
  ref: 'Employee',
  localField: '_id',
  foreignField: 'department_id',
});

// Virtual populate: employee count
departmentSchema.virtual('employee_count', {
  ref: 'Employee',
  localField: '_id',
  foreignField: 'department_id',
  count: true,
});

// Unique indexes
departmentSchema.index({ name: 1 }, { unique: true });
departmentSchema.index({ email: 1 }, { unique: true });

const Department = mongoose.model('Department', departmentSchema);
export default Department;
