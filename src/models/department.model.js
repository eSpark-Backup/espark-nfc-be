import mongoose from 'mongoose';
import validator from 'validator';

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
    image: {
      image_key: {
        type: String,
        default: null,
        validate: {
          validator: (v) => v === null || typeof v === 'string',
          message: 'Invalid image key',
        },
      },
      image_url: {
        type: String,
        default: null,
        validate: {
          validator: (v) => v === null || validator.isURL(v, { require_protocol: true }),
          message: 'Invalid image URL',
        },
      },
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtual to get all employees in the department
departmentSchema.virtual('employees', {
  ref: 'Employee',
  localField: '_id',
  foreignField: 'department_id',
});

// Virtual to get total count of employees in the department
departmentSchema.virtual('employee_count', {
  ref: 'Employee',
  localField: '_id',
  foreignField: 'department_id',
  count: true,
});

// Unique indexes for database-level enforcement
departmentSchema.index({ name: 1 }, { unique: true });
departmentSchema.index({ email: 1 }, { unique: true });

const Department = mongoose.model('Department', departmentSchema);

export default Department;
