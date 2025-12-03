import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { getTestDb, getTestSchema } from '../setup.js';

describe('Auth Integration Tests', () => {
  const sql = getTestDb();
  const schema = getTestSchema();

  it('should login successfully with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testadmin',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.username).toBe('testadmin');
  });

  it('should fail login with invalid password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testadmin',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  it('should fail login with non-existent user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'nonexistent',
        password: 'password123'
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  it('should validate input fields', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: '',
        password: ''
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('errors');
  });
});
