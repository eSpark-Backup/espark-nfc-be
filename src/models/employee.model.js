import mongoose from 'mongoose';
import validator from 'validator';

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
      default: '',
    },
    social_links: {
      facebook: {
        type: String,
        default: '',
        validate: {
          validator: (v) => !v || validator.isURL(v),
          message: 'Invalid Facebook URL',
        },
      },
      twitter: {
        type: String,
        default: '',
        validate: {
          validator: (v) => !v || validator.isURL(v),
          message: 'Invalid Twitter URL',
        },
      },
      instagram: {
        type: String,
        default: '',
        validate: {
          validator: (v) => !v || validator.isURL(v),
          message: 'Invalid Instagram URL',
        },
      },
      youtube: {
        type: String,
        default: '',
        validate: {
          validator: (v) => !v || validator.isURL(v),
          message: 'Invalid YouTube URL',
        },
      },
    },
    about_me: {
      type: String,
      required: [true, 'About me is required'],
      trim: true,
      default: '',
    },
    profile_image: {
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
    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtual populate: department info
employeeSchema.virtual('department', {
  ref: 'Department',
  localField: 'department_id',
  foreignField: '_id',
  justOne: true,
});

// Indexes for uniqueness
employeeSchema.index({ email: 1 }, { unique: true });
employeeSchema.index({ phone_number: 1 }, { unique: true });

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
