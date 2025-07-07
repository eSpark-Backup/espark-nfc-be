import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import Department from '../../src/models/department.model.js';
import { generateToken } from '../../src/utils/token.js';
import { unstable_mockModule } from 'jest';

const API = '/api/departments';
let token;
let s3Uploader;

beforeAll(async () => {
  token = generateToken({ id: new mongoose.Types.ObjectId(), role: 'super-admin' });

  await unstable_mockModule('../../src/services/s3Uploader.js', () => ({
    uploadToS3: jest.fn(),
    deleteFromS3: jest.fn(),
  }));

  s3Uploader = await import('../../src/services/s3Uploader.js');
});

afterEach(async () => {
  await Department.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('POST /api/departments', () => {
  it('should create a department successfully', async () => {
    s3Uploader.uploadToS3.mockResolvedValue({
      key: 'mock-key',
      url: 'https://s3.amazonaws.com/mock-key',
    });

    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Finance')
      .field('email', 'finance@example.com')
      .attach('profile_image', Buffer.from('mock-image'), 'image.jpg');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.department).toHaveProperty('id');
  });

  it('should return 400 if profile image is missing', async () => {
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'HR', email: 'hr@example.com' });

    expect(res.status).toBe(400);
  });

  it('should return 400 if email is invalid', async () => {
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Marketing')
      .field('email', 'invalid-email')
      .attach('profile_image', Buffer.from('mock'), 'image.jpg');

    expect(res.status).toBe(400);
  });

  it('should return 401 if no token is provided', async () => {
    const res = await request(app)
      .post(API)
      .field('name', 'IT')
      .field('email', 'it@example.com')
      .attach('profile_image', Buffer.from('mock'), 'image.jpg');

    expect(res.status).toBe(401);
  });

  it('should return 400 if name already exists', async () => {
    await Department.create({
      name: 'Sales',
      email: 'sales@example.com',
      image_url: 'url',
      image_key: 'key',
    });

    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Sales')
      .field('email', 'sales2@example.com')
      .attach('profile_image', Buffer.from('mock'), 'image.jpg');

    expect(res.status).toBe(400);
  });

  it('should return 400 if email already exists', async () => {
    await Department.create({
      name: 'Legal',
      email: 'legal@example.com',
      image_url: 'url',
      image_key: 'key',
    });

    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'LegalTeam')
      .field('email', 'legal@example.com')
      .attach('profile_image', Buffer.from('mock'), 'image.jpg');

    expect(res.status).toBe(400);
  });
});

describe('GET /api/departments', () => {
  it('should return an empty list if no departments exist', async () => {
    const res = await request(app).get(API).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.departments).toEqual([]);
  });

  it('should return list of departments', async () => {
    await Department.create({
      name: 'Admin',
      email: 'admin@example.com',
      image_url: 'mock-url',
      image_key: 'mock-key',
    });

    const res = await request(app).get(API).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.departments)).toBe(true);
    expect(res.body.departments.length).toBe(1);
  });

  it('should support search by name', async () => {
    await Department.create({
      name: 'Support',
      email: 'support@example.com',
      image_url: 'mock-url',
      image_key: 'mock-key',
    });

    const res = await request(app)
      .get(`${API}?search=support`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.departments[0].name).toBe('Support');
  });

  it('should support sorting by name ASC', async () => {
    await Department.create([
      {
        name: 'Zeta',
        email: 'zeta@example.com',
        image_url: 'url',
        image_key: 'key',
      },
      {
        name: 'Alpha',
        email: 'alpha@example.com',
        image_url: 'url',
        image_key: 'key',
      },
    ]);

    const res = await request(app)
      .get(`${API}?sort_by=name&sort_order=asc`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.departments[0].name).toBe('Alpha');
  });

  it('should support pagination', async () => {
    await Department.insertMany(
      Array.from({ length: 12 }).map((_, i) => ({
        name: `Dept${i}`,
        email: `dept${i}@test.com`,
        image_url: 'url',
        image_key: 'key',
      }))
    );

    const res = await request(app)
      .get(`${API}?page=2&limit=5`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.pagination.current_page).toBe(2);
    expect(res.body.departments.length).toBe(5);
  });
});

describe('GET /api/departments/:id', () => {
  it('should return 400 for invalid department ID', async () => {
    const res = await request(app).get(`${API}/invalid-id`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('should return 404 if department not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`${API}/${fakeId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('should return department by ID', async () => {
    const department = await Department.create({
      name: 'Logistics',
      email: 'logistics@example.com',
      image_url: 'url',
      image_key: 'key',
    });

    const res = await request(app)
      .get(`${API}/${department._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.department.name).toBe('Logistics');
  });
});

describe('PATCH /api/departments/:id', () => {
  it('should return 400 for invalid ID', async () => {
    const res = await request(app)
      .patch(`${API}/invalid-id`)
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Updated')
      .attach('profile_image', Buffer.from('img'), 'img.jpg');

    expect(res.status).toBe(400);
  });

  it('should return 404 if department not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .patch(`${API}/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Updated')
      .attach('profile_image', Buffer.from('img'), 'img.jpg');

    expect(res.status).toBe(404);
  });

  it('should return 400 if image is missing', async () => {
    const dept = await Department.create({
      name: 'ToUpdate',
      email: 'toupdate@example.com',
      image_url: 'url',
      image_key: 'key',
    });

    const res = await request(app)
      .patch(`${API}/${dept._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'NewName' });

    expect(res.status).toBe(400);
  });

  it('should update the department', async () => {
    const dept = await Department.create({
      name: 'Original',
      email: 'original@example.com',
      image_url: 'url',
      image_key: 'key',
    });

    s3Uploader.uploadToS3.mockResolvedValue({
      key: 'new-key',
      url: 'https://s3.amazonaws.com/new-key',
    });

    s3Uploader.deleteFromS3.mockResolvedValue({});

    const res = await request(app)
      .patch(`${API}/${dept._id}`)
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'UpdatedName')
      .field('email', 'updated@example.com')
      .attach('profile_image', Buffer.from('new-img'), 'new-img.jpg');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.department.name).toBe('UpdatedName');
  });

  it('should return 400 if name or email already exists', async () => {
    await Department.create({
      name: 'Existing',
      email: 'existing@example.com',
      image_url: 'url',
      image_key: 'key',
    });

    const dept = await Department.create({
      name: 'ToEdit',
      email: 'toedit@example.com',
      image_url: 'url',
      image_key: 'key',
    });

    const res = await request(app)
      .patch(`${API}/${dept._id}`)
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Existing')
      .field('email', 'other@example.com')
      .attach('profile_image', Buffer.from('img'), 'img.jpg');

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/departments/:id', () => {
  it('should return 400 for invalid department ID', async () => {
    const res = await request(app)
      .delete(`${API}/invalid-id`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('should return 404 if department not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(`${API}/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('should return 400 if department has assigned employees', async () => {
    const dept = await Department.create({
      name: 'WithEmployees',
      email: 'emp@example.com',
      image_url: 'url',
      image_key: 'key',
    });

    const Employee = mongoose.model('Employee');
    await Employee.create({
      name: 'Emp1',
      email: 'emp1@example.com',
      phone_number: '1234567890',
      age: 30,
      joining_date: new Date(),
      department_id: dept._id,
    });

    const res = await request(app)
      .delete(`${API}/${dept._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assigned employees/i);
  });

  it('should delete department successfully if no employees assigned', async () => {
    const dept = await Department.create({
      name: 'NoEmployees',
      email: 'noemp@example.com',
      image_url: 'url',
      image_key: 'key',
    });

    s3Uploader.deleteFromS3.mockResolvedValue({});

    const res = await request(app)
      .delete(`${API}/${dept._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/deleted successfully/i);
  });
});
