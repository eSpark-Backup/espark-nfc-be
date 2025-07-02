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
      unique: [true, 'Email must be unique'],
      validate: {
        validator: validator.isEmail,
        message: 'Invalid email address',
      },
    },
    phone_number: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      unique: [true, 'Phone number must be unique'],
      validate: {
        validator: function (v) {
          return /^\+?[0-9]{7,15}$/.test(v);
        },
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
      trim: true,
      default: '',
      required: [true, 'Address is required'],
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
      trim: true,
      default: '',
      required: [true, 'About me is required'],
    },
    profile_image: {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
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
  }
);

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
