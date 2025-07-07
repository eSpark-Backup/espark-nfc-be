import mongoose from 'mongoose';
import validator from 'validator';

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
      max_length: [100, 'Department name must not exceed 100 characters'],
      unique: [true, 'Department name must be unique'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      unique: [true, 'Email must be unique'],
      lowercase: true,
      validate: {
        validator: validator.isEmail,
        message: 'Invalid email address',
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

// Virtual to get full list of employees in this department
departmentSchema.virtual('employees', {
  ref: 'Employee',
  localField: '_id',
  foreignField: 'department_id',
});

// Virtual to get total count of employees in this department
departmentSchema.virtual('employee_count', {
  ref: 'Employee',
  localField: '_id',
  foreignField: 'department_id',
  count: true,
});

const Department = mongoose.model('Department', departmentSchema);

export default Department;
