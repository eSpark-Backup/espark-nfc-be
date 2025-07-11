import inquirer from 'inquirer';
import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import Admin from '../src/models/admin.model.js';
import connectDB from '../src/db/connection.js';
import envConfig from '../src/config/envConfig.js';

const createSuperAdmin = async () => {
  try {
    await connectDB();

    const existingSuperAdmin = await Admin.findOne({ role: 'super-admin' });
    if (existingSuperAdmin) {
      console.log('\n❌ A super-admin already exists. Creation aborted.');
      return mongoose.connection.close();
    }

    const { secret } = await inquirer.prompt([
      {
        type: 'password',
        name: 'secret',
        message: '\nEnter super admin creation secret:',
        mask: '*',
        validate: (input) =>
          input === envConfig.superAdmin.secret || '❌ Invalid secret. Access denied.',
      },
    ]);

    console.log('\n🛠️  Super Admin Creation Wizard\n');

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'full_name',
        message: 'Full Name:',
        validate: (input) => {
          const trimmed = input.trim();
          if (!trimmed) return 'Full name is required';
          if (trimmed.length < 3 || trimmed.length > 100) {
            return 'Full name must be between 3 and 100 characters';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'email',
        message: 'Email:',
        validate: (input) => validator.isEmail(input) || 'Please enter a valid email address',
      },
      {
        type: 'input',
        name: 'phone_number',
        message: 'Phone Number:',
        validate: (input) => {
          const trimmed = input.trim();
          const digitsOnly = trimmed.replace(/\D/g, '');
          const phoneRegex = /^\+?[0-9\-]+$/;
          if (!trimmed) return 'Phone number is required';
          if (digitsOnly.length < 7 || digitsOnly.length > 15 || !phoneRegex.test(trimmed)) {
            return 'Phone number must be 7 to 15 digits and may include "+" or hyphens';
          }
          return true;
        },
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password:',
        mask: '*',
        validate: (input) => {
          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[\S]{8,}$/;
          return (
            passwordRegex.test(input) ||
            'Password must be at least 8 characters, include uppercase and lowercase letters, a number, and a special character'
          );
        },
      },
    ]);

    const existing = await Admin.findOne({
      $or: [{ email: answers.email }, { phone_number: answers.phone_number }],
    });

    if (existing) {
      console.log('❌ An admin with this email or phone number already exists.');
      return mongoose.connection.close();
    }

    const admin = new Admin({
      ...answers,
      role: 'super-admin',
    });

    await admin.save();
    console.log('\n✅ Super admin created successfully!\n');
  } catch (err) {
    console.error('\n❌ Error creating super admin:', err.message);
  } finally {
    mongoose.connection.close();
  }
};

createSuperAdmin();
