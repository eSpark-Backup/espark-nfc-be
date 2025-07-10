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
        validator: (value) => validator.isMobilePhone(value, 'any'),
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
      // Removed immutable: true so role can be updated if needed by controller logic
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
    last_login: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        ret.id = ret._id;
        delete ret._id;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
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

// Hash password before saving
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Hash password on update
adminSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();
  if (update?.password) {
    const salt = await bcrypt.genSalt(10);
    update.password = await bcrypt.hash(update.password, salt);
  }

  // ✅ Ensure validation runs on updates
  this.setOptions({ runValidators: true });
  next();
});

// Compare passwords
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
