import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AccountModel } from '../src/models/Account.js';
import { authHeader, createUser, type TestUser } from './helpers.js';

const app = createApp();

type Holder = { user: TestUser; accountNumber: string };

async function createHolder(): Promise<Holder> {
  const user = await createUser(app);
  const res = await request(app).post('/api/accounts').set(...authHeader(user));
  return { user, accountNumber: res.body.account.accountNumber };
}

async function deposit(holder: Holder, amount: number) {
  return request(app)
    .post('/api/transactions/deposit')
    .set(...authHeader(holder.user))
    .send({ amount });
}

async function balanceOf(holder: Holder): Promise<number> {
  const account = await AccountModel.findOne({ accountNumber: holder.accountNumber });
  return account?.balance ?? Number.NaN;
}

let alice: Holder;

beforeEach(async () => {
  alice = await createHolder();
});

describe('POST /api/transactions/deposit', () => {
  it('increases the balance and records a SUCCESS transaction', async () => {
    const res = await deposit(alice, 150.25);

    expect(res.status).toBe(201);
    expect(res.body.balance).toBe(150.25);
    expect(res.body.transaction).toMatchObject({
      type: 'DEPOSIT',
      status: 'SUCCESS',
      amount: 150.25,
      fromAccount: null,
      toAccount: alice.accountNumber,
    });
    expect(res.body.transaction.referenceId).toEqual(expect.any(String));
    expect(await balanceOf(alice)).toBe(150.25);
  });

  it('accumulates repeated deposits without floating point drift', async () => {
    for (let i = 0; i < 3; i += 1) {
      await deposit(alice, 0.1);
    }

    expect(await balanceOf(alice)).toBe(0.3);
  });

  it.each([
    ['zero', 0],
    ['negative', -10],
    ['non-numeric', 'ten'],
    ['too many decimals', 1.234],
  ])('rejects a %s amount without changing the balance', async (_label, amount) => {
    const res = await request(app)
      .post('/api/transactions/deposit')
      .set(...authHeader(alice.user))
      .send({ amount });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await balanceOf(alice)).toBe(0);
  });

  it('rejects an unauthenticated deposit', async () => {
    const res = await request(app).post('/api/transactions/deposit').send({ amount: 10 });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/transactions/withdraw', () => {
  it('decreases the balance and records a SUCCESS transaction', async () => {
    await deposit(alice, 100);
    const res = await request(app)
      .post('/api/transactions/withdraw')
      .set(...authHeader(alice.user))
      .send({ amount: 40 });

    expect(res.status).toBe(201);
    expect(res.body.balance).toBe(60);
    expect(res.body.transaction).toMatchObject({
      type: 'WITHDRAWAL',
      status: 'SUCCESS',
      amount: 40,
      fromAccount: alice.accountNumber,
      toAccount: null,
    });
    expect(await balanceOf(alice)).toBe(60);
  });

  it('rejects an overdraft and leaves the balance untouched', async () => {
    await deposit(alice, 50);
    const res = await request(app)
      .post('/api/transactions/withdraw')
      .set(...authHeader(alice.user))
      .send({ amount: 50.01 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');
    expect(await balanceOf(alice)).toBe(50);

    const history = await request(app).get('/api/transactions').set(...authHeader(alice.user));
    expect(history.body.transactions).toHaveLength(1);
  });

  it.each([
    ['zero', 0],
    ['negative', -5],
    ['non-numeric', null],
  ])('rejects a %s amount', async (_label, amount) => {
    await deposit(alice, 100);
    const res = await request(app)
      .post('/api/transactions/withdraw')
      .set(...authHeader(alice.user))
      .send({ amount });

    expect(res.status).toBe(400);
    expect(await balanceOf(alice)).toBe(100);
  });

  it('rejects an unauthenticated withdrawal', async () => {
    const res = await request(app).post('/api/transactions/withdraw').send({ amount: 10 });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/transactions/transfer', () => {
  let bob: Holder;

  beforeEach(async () => {
    bob = await createHolder();
    await deposit(alice, 200);
  });

  async function transfer(from: Holder, toAccountNumber: string, amount: unknown) {
    return request(app)
      .post('/api/transactions/transfer')
      .set(...authHeader(from.user))
      .send({ toAccountNumber, amount });
  }

  it('moves money between accounts and records a SUCCESS transaction', async () => {
    const res = await transfer(alice, bob.accountNumber, 75.5);

    expect(res.status).toBe(201);
    expect(res.body.balance).toBe(124.5);
    expect(res.body.transaction).toMatchObject({
      type: 'TRANSFER',
      status: 'SUCCESS',
      amount: 75.5,
      fromAccount: alice.accountNumber,
      toAccount: bob.accountNumber,
    });
    expect(await balanceOf(alice)).toBe(124.5);
    expect(await balanceOf(bob)).toBe(75.5);
  });

  it('rejects a transfer to the same account', async () => {
    const res = await transfer(alice, alice.accountNumber, 10);

    expect(res.status).toBe(400);
    expect(await balanceOf(alice)).toBe(200);
  });

  it('rejects a nonexistent destination without touching the source balance', async () => {
    const res = await transfer(alice, '000000000000', 10);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(await balanceOf(alice)).toBe(200);
  });

  it('rejects an insufficient balance and leaves both accounts unchanged', async () => {
    const res = await transfer(alice, bob.accountNumber, 200.01);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');
    expect(await balanceOf(alice)).toBe(200);
    expect(await balanceOf(bob)).toBe(0);
  });

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['non-numeric', 'abc'],
  ])('rejects a %s amount and leaves both accounts unchanged', async (_label, amount) => {
    const res = await transfer(alice, bob.accountNumber, amount);

    expect(res.status).toBe(400);
    expect(await balanceOf(alice)).toBe(200);
    expect(await balanceOf(bob)).toBe(0);
  });

  it('rejects an unauthenticated transfer', async () => {
    const res = await request(app)
      .post('/api/transactions/transfer')
      .send({ toAccountNumber: bob.accountNumber, amount: 10 });

    expect(res.status).toBe(401);
    expect(await balanceOf(alice)).toBe(200);
  });

  it('never overdraws under concurrent transfers', async () => {
    const results = await Promise.all([
      transfer(alice, bob.accountNumber, 150),
      transfer(alice, bob.accountNumber, 150),
    ]);
    const statuses = results.map((res) => res.status).sort();

    expect(statuses).toEqual([201, 422]);
    expect(await balanceOf(alice)).toBe(50);
    expect(await balanceOf(bob)).toBe(150);
  });
});

describe('GET /api/transactions', () => {
  it('returns the account transactions newest first', async () => {
    const bob = await createHolder();
    await deposit(alice, 100);
    await request(app)
      .post('/api/transactions/withdraw')
      .set(...authHeader(alice.user))
      .send({ amount: 20 });
    await request(app)
      .post('/api/transactions/transfer')
      .set(...authHeader(alice.user))
      .send({ toAccountNumber: bob.accountNumber, amount: 30 });

    const res = await request(app).get('/api/transactions').set(...authHeader(alice.user));

    expect(res.status).toBe(200);
    expect(res.body.transactions.map((t: { type: string }) => t.type)).toEqual([
      'TRANSFER',
      'WITHDRAWAL',
      'DEPOSIT',
    ]);
    const timestamps = res.body.transactions.map((t: { createdAt: string }) =>
      Date.parse(t.createdAt),
    );
    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });

  it('only returns transactions involving the caller account', async () => {
    const bob = await createHolder();
    await deposit(alice, 100);
    await deposit(bob, 500);
    await request(app)
      .post('/api/transactions/transfer')
      .set(...authHeader(alice.user))
      .send({ toAccountNumber: bob.accountNumber, amount: 10 });

    const res = await request(app).get('/api/transactions').set(...authHeader(bob.user));
    const types = res.body.transactions.map((t: { type: string }) => t.type);

    expect(types).toEqual(['TRANSFER', 'DEPOSIT']);
    expect(
      res.body.transactions.every(
        (t: { fromAccount: string | null; toAccount: string | null }) =>
          t.fromAccount === bob.accountNumber || t.toAccount === bob.accountNumber,
      ),
    ).toBe(true);
  });

  it('rejects unauthenticated history retrieval', async () => {
    const res = await request(app).get('/api/transactions');

    expect(res.status).toBe(401);
  });

  it('returns 404 when the caller has no account', async () => {
    const user = await createUser(app);
    const res = await request(app).get('/api/transactions').set(...authHeader(user));

    expect(res.status).toBe(404);
  });
});
