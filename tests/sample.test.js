import request from 'supertest';
import app from '../src/app.js'; // Adjust path as per your Express app setup

describe('Sample API Test', () => {
  it('should return 404 on root path', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(404);
  });
});
