import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator';

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
      unique: true,
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
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['super-admin', 'admin'],
      default: 'admin',
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Hash password before saving
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare passwords
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
