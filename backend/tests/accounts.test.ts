import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authHeader, createUser } from './helpers.js';

const app = createApp();

describe('POST /api/accounts', () => {
  it('creates an account with a zero balance for the authenticated user', async () => {
    const user = await createUser(app);
    const res = await request(app).post('/api/accounts').set(...authHeader(user));

    expect(res.status).toBe(201);
    expect(res.body.account).toMatchObject({ balance: 0 });
    expect(res.body.account.accountNumber).toMatch(/^\d{12}$/);
    expect(res.body.account.createdAt).toEqual(expect.any(String));
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(res.body.account.userId).toBeUndefined();
  });

  it('rejects unauthenticated creation', async () => {
    const res = await request(app).post('/api/accounts');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a second account for the same user', async () => {
    const user = await createUser(app);
    await request(app).post('/api/accounts').set(...authHeader(user));
    const res = await request(app).post('/api/accounts').set(...authHeader(user));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('generates a unique account number per account', async () => {
    const accountNumbers = new Set<string>();
    for (let i = 0; i < 5; i += 1) {
      const user = await createUser(app);
      const res = await request(app).post('/api/accounts').set(...authHeader(user));
      accountNumbers.add(res.body.account.accountNumber);
    }

    expect(accountNumbers.size).toBe(5);
  });
});

describe('GET /api/accounts/me', () => {
  it('returns the authenticated user account', async () => {
    const user = await createUser(app);
    const created = await request(app).post('/api/accounts').set(...authHeader(user));
    const res = await request(app).get('/api/accounts/me').set(...authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.account).toEqual(created.body.account);
    expect(res.body.account.balance).toBe(0);
  });

  it('rejects unauthenticated retrieval', async () => {
    const res = await request(app).get('/api/accounts/me');

    expect(res.status).toBe(401);
  });

  it('returns 404 when the user has no account', async () => {
    const user = await createUser(app);
    const res = await request(app).get('/api/accounts/me').set(...authHeader(user));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('never returns another user account', async () => {
    const owner = await createUser(app);
    const other = await createUser(app);
    const ownerAccount = await request(app).post('/api/accounts').set(...authHeader(owner));
    const otherAccount = await request(app).post('/api/accounts').set(...authHeader(other));

    const res = await request(app).get('/api/accounts/me').set(...authHeader(other));

    expect(res.status).toBe(200);
    expect(res.body.account.id).toBe(otherAccount.body.account.id);
    expect(res.body.account.id).not.toBe(ownerAccount.body.account.id);
  });
});
