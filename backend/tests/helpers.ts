import request from 'supertest';
import type { Express } from 'express';

export type TestUser = { token: string; id: string; email: string };

export async function createUser(
  app: Express,
  overrides: { name?: string; email?: string; password?: string } = {},
): Promise<TestUser> {
  const credentials = {
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? `user-${Math.random().toString(36).slice(2)}@example.com`,
    password: overrides.password ?? 'correct-horse',
  };

  const registered = await request(app).post('/api/auth/register').send(credentials);
  const loggedIn = await request(app)
    .post('/api/auth/login')
    .send({ email: credentials.email, password: credentials.password });

  return {
    token: loggedIn.body.token,
    id: registered.body.user.id,
    email: registered.body.user.email,
  };
}

export function authHeader(user: TestUser): [string, string] {
  return ['Authorization', `Bearer ${user.token}`];
}
