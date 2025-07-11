import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import imageSchema from './shared/imageSchema.js';
import { auditFields } from './shared/auditFields.js';
import { baseSchemaOptions } from './shared/baseSchemaOptions.js';

const adminSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Full name must not exceed 100 characters'],
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
        validator: (v) => validator.isMobilePhone(v, 'any'),
        message: 'Invalid phone number',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      validate: {
        validator: (pw) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[\S]{8,}$/.test(pw),
        message:
          'Password must be at least 8 characters, include uppercase and lowercase letters, a number, and a special character',
      },
      select: false,
    },
    role: {
      type: String,
      enum: ['super-admin', 'admin'],
      default: 'admin',
      immutable: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
      select: false,
    },
    profile_image: imageSchema,
    ...auditFields,
    last_login: {
      type: Date,
      default: null,
    },
  },
  baseSchemaOptions
);

// Indexes
adminSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { is_deleted: false },
    name: 'partial_unique_email',
  }
);

adminSchema.index(
  { phone_number: 1 },
  {
    unique: true,
    partialFilterExpression: { is_deleted: false },
    name: 'partial_unique_phone_number',
  }
);

// Password hashing
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

adminSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();
  if (update?.password) {
    const salt = await bcrypt.genSalt(10);
    update.password = await bcrypt.hash(update.password, salt);
  }
  this.setOptions({ runValidators: true });
  next();
});

adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
