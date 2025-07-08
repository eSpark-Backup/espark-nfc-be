import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import Admin from '../../src/models/admin.model.js';
import { generateToken } from '../../src/utils/token.js';
import envConfig from '../../src/config/envConfig.js';

jest.setTimeout(30000);

let superAdminToken;
let nonSuperAdminToken;

beforeAll(async () => {
  await mongoose.connect(envConfig.mongoUri);
  await Admin.deleteMany();

  const superAdmin = await Admin.create({
    full_name: 'Super Admin',
    email: 'superadmin@example.com',
    phone_number: '+923001112222',
    password: 'SuperAdmin123!',
    role: 'super-admin',
  });

  const regularAdmin = await Admin.create({
    full_name: 'Regular Admin',
    email: 'regular@example.com',
    phone_number: '+923001113333',
    password: 'Regular123!',
    role: 'admin',
  });

  superAdminToken = generateToken({ id: superAdmin._id });
  nonSuperAdminToken = generateToken({ id: regularAdmin._id });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('POST /api/admins', () => {
  it('should create a new admin (without image)', async () => {
    const res = await request(app)
      .post('/api/admins')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .field('full_name', 'New Admin')
      .field('email', 'newadmin@example.com')
      .field('phone_number', '+923451234567')
      .field('password', 'Password123!');

    expect(res.statusCode).toBe(201);
    expect(res.body.admin.email).toBe('newadmin@example.com');
  });

  it('should create a new admin with image upload (mocked)', async () => {
    const res = await request(app)
      .post('/api/admins')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .field('full_name', 'Image Admin')
      .field('email', 'imageadmin@example.com')
      .field('phone_number', '+923456789000')
      .field('password', 'Password123!')
      .attach('profile_image', Buffer.from('fake image content'), 'test.png');

    expect(res.statusCode).toBe(201);
    expect(res.body.admin.email).toBe('imageadmin@example.com');
  });

  it('should fail when email is invalid', async () => {
    const res = await request(app)
      .post('/api/admins')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .field('full_name', 'Invalid Email')
      .field('email', 'invalid-email')
      .field('phone_number', '+923456789001')
      .field('password', 'Password123!');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Invalid email address');
  });

  it('should fail when password is weak', async () => {
    const res = await request(app)
      .post('/api/admins')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .field('full_name', 'Weak Password')
      .field('email', 'weak@example.com')
      .field('phone_number', '+923456789002')
      .field('password', 'pass');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Password must contain a lowercase letter');
  });

  it('should fail on duplicate email', async () => {
    const res = await request(app)
      .post('/api/admins')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .field('full_name', 'Duplicate Email')
      .field('email', 'newadmin@example.com') // already used above
      .field('phone_number', '+923456789003')
      .field('password', 'Password123!');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('An admin with this email or phone number already exists');
  });

  it('should fail on duplicate phone number', async () => {
    const res = await request(app)
      .post('/api/admins')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .field('full_name', 'Duplicate Phone')
      .field('email', 'dup@example.com')
      .field('phone_number', '+923451234567') // reused
      .field('password', 'Password123!');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('An admin with this email or phone number already exists');
  });

  it('should fail when profile_image is missing but field is present', async () => {
    const res = await request(app)
      .post('/api/admins')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .field('full_name', 'Image Field Fail')
      .field('email', 'imagefield@example.com')
      .field('phone_number', '+923456789004')
      .field('password', 'Password123!')
      .field('profile_image', '');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid.*image/i);
  });

  it('should fail if unsupported file type is uploaded', async () => {
    const res = await request(app)
      .post('/api/admins')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .field('full_name', 'Invalid File')
      .field('email', 'filefail@example.com')
      .field('phone_number', '+923456789005')
      .field('password', 'Password123!')
      .attach('profile_image', Buffer.from('dummy content'), 'file.pdf');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/only image files/i);
  });

  it('should fail on missing token', async () => {
    const res = await request(app)
      .post('/api/admins')
      .field('full_name', 'No Token')
      .field('email', 'notoken@example.com')
      .field('phone_number', '+923456789006')
      .field('password', 'Password123!');

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Authorization token missing');
  });

  it('should fail if requester is not super-admin', async () => {
    const res = await request(app)
      .post('/api/admins')
      .set('Authorization', `Bearer ${nonSuperAdminToken}`)
      .field('full_name', 'Not Super')
      .field('email', 'notsuper@example.com')
      .field('phone_number', '+923456789007')
      .field('password', 'Password123!');

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('Access denied: Super-admin only');
  });

  it('should fail if full_name is missing', async () => {
    const res = await request(app)
      .post('/api/admins')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .field('email', 'nofullname@example.com')
      .field('phone_number', '+923456789008')
      .field('password', 'Password123!');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Full name is required');
  });

  it('should fail if phone number is invalid', async () => {
    const res = await request(app)
      .post('/api/admins')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .field('full_name', 'Bad Phone')
      .field('email', 'badphone@example.com')
      .field('phone_number', 'invalid-phone')
      .field('password', 'Password123!');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Invalid phone number');
  });

  it('should handle password just meeting minimum requirements', async () => {
    const res = await request(app)
      .post('/api/admins')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .field('full_name', 'Edge Password')
      .field('email', 'edgepass@example.com')
      .field('phone_number', '+923456789009')
      .field('password', 'A1b2c3d4!');

    expect(res.statusCode).toBe(201);
    expect(res.body.admin.email).toBe('edgepass@example.com');
  });

  it('should ignore unexpected extra fields in request', async () => {
    const res = await request(app)
      .post('/api/admins')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .field('full_name', 'Extra Fields')
      .field('email', 'extrafields@example.com')
      .field('phone_number', '+923456789010')
      .field('password', 'Password123!')
      .field('unexpected', 'should-be-ignored');

    expect(res.statusCode).toBe(201);
    expect(res.body.admin.email).toBe('extrafields@example.com');
  });
});
