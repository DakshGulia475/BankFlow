import { describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/models/User.js';
import { env } from '../src/config/env.js';

const app = createApp();

const credentials = {
  name: 'Ada Lovelace',
  email: 'Ada@Example.com',
  password: 'correct-horse',
};

async function registerUser(overrides: Partial<typeof credentials> = {}) {
  return request(app)
    .post('/api/auth/register')
    .send({ ...credentials, ...overrides });
}

describe('POST /api/auth/register', () => {
  it('registers a user and never returns the password hash', async () => {
    const res = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: credentials.name, email: 'ada@example.com' });
    expect(res.body.user.id).toEqual(expect.any(String));
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain(credentials.password);

    const stored = await UserModel.findOne({ email: 'ada@example.com' });
    expect(stored?.passwordHash).toBeTruthy();
    expect(stored?.passwordHash).not.toBe(credentials.password);
    expect(JSON.stringify(stored?.toJSON())).not.toContain('passwordHash');
  });

  it('rejects a duplicate email regardless of casing', async () => {
    await registerUser();
    const res = await registerUser({ email: 'ADA@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects invalid input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toEqual([
      'name',
      'email',
      'password',
    ]);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a JWT for valid credentials', async () => {
    await registerUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: credentials.password });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    const decoded = jwt.verify(res.body.token, env.jwtSecret) as { sub: string };
    expect(decoded.sub).toBe(res.body.user.id);
  });

  it('rejects an incorrect password without revealing which field was wrong', async () => {
    await registerUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('returns the same error for a nonexistent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: credentials.password });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('rejects missing input', async () => {
    const res = await request(app).post('/api/auth/login').send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('JWT middleware (GET /api/auth/me)', () => {
  it('rejects a missing token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a malformed token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-jwt');

    expect(res.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const token = jwt.sign({ sub: '507f1f77bcf86cd799439011' }, env.jwtSecret, {
      expiresIn: '-1s',
    });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const token = jwt.sign({ sub: '507f1f77bcf86cd799439011' }, 'a-different-secret');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it('accepts a valid token and attaches the user to the request', async () => {
    await registerUser();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: credentials.password });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'ada@example.com', name: credentials.name });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });
});
