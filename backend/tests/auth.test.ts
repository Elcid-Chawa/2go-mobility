import request from 'supertest';
import { createApp } from '../src/app';
import { setupTestDB } from './setup';
import { UserRole } from '../src/constants/roles';

setupTestDB();

const app = createApp();

describe('Foundation & Auth Endpoints', () => {
  describe('GET /health', () => {
    it('should return 200 OK and health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('UP');
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new customer successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+1234567890',
          password: 'password123',
          role: UserRole.CUSTOMER,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('jane@example.com');
      expect(res.body.data.user.role).toBe(UserRole.CUSTOMER);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
      expect(res.body.data.profileId).toBeDefined();
    });

    it('should register a new driver with profile', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'John Driver',
          email: 'john.driver@example.com',
          phone: '+1987654321',
          password: 'driverPassword123',
          role: UserRole.DRIVER,
          licenseNumber: 'DL-999888',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(UserRole.DRIVER);
      expect(res.body.data.profileId).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'First User',
          email: 'duplicate@example.com',
          phone: '+1111111111',
          password: 'password123',
        });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Second User',
          email: 'duplicate@example.com',
          phone: '+2222222222',
          password: 'password123',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Email is already registered');
    });

    it('should validate invalid input schema', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'A', // too short
          email: 'not-an-email',
          password: '123', // too short
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Alice Smith',
          email: 'alice@example.com',
          phone: '+1444333222',
          password: 'securePassword123',
        });
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'securePassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'wrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Protected Endpoints & Token Refresh', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const reg = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Bob Auth',
          email: 'bob@example.com',
          phone: '+1555666777',
          password: 'password123',
        });
      accessToken = reg.body.data.tokens.accessToken;
      refreshToken = reg.body.data.tokens.refreshToken;
    });

    it('should access /me with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('bob@example.com');
    });

    it('should reject request without Bearer token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('should refresh access token using valid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });
  });
});
