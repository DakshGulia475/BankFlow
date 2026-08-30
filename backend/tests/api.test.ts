import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authHeader, createUser } from './helpers.js';

const app = createApp();

describe('GET /api/health', () => {
  it('reports a connected database', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'connected' });
  });
});

describe('API conventions', () => {
  it('returns the standard error shape for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(Object.keys(res.body)).toEqual(['error']);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects a malformed JSON body with 400 rather than 500', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('never leaks stack traces or internal details', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.text).not.toContain('at ');
    expect(res.body.error.stack).toBeUndefined();
  });

  it.each([
    ['get', '/api/auth/me'],
    ['post', '/api/accounts'],
    ['get', '/api/accounts/me'],
    ['post', '/api/transactions/deposit'],
    ['post', '/api/transactions/withdraw'],
    ['post', '/api/transactions/transfer'],
    ['get', '/api/transactions'],
  ] as const)('requires authentication for %s %s', async (method, path) => {
    const res = await request(app)[method](path).send({});

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('Transactions without an account', () => {
  it.each([
    ['deposit', '/api/transactions/deposit'],
    ['withdraw', '/api/transactions/withdraw'],
  ])('returns 404 for %s when the user has no account', async (_label, path) => {
    const user = await createUser(app);
    const res = await request(app)
      .post(path)
      .set(...authHeader(user))
      .send({ amount: 10 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a transfer when the sender has no account', async () => {
    const sender = await createUser(app);
    const receiver = await createUser(app);
    const account = await request(app).post('/api/accounts').set(...authHeader(receiver));

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set(...authHeader(sender))
      .send({ toAccountNumber: account.body.account.accountNumber, amount: 10 });

    expect(res.status).toBe(404);
  });
});
