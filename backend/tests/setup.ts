import { afterAll, beforeAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';

const TEST_MONGODB_URI =
  process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/bankflow_test?replicaSet=rs0';

beforeAll(async () => {
  await connectDatabase(TEST_MONGODB_URI);
});

beforeEach(async () => {
  const collections = await mongoose.connection.db?.collections();
  await Promise.all((collections ?? []).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase();
  await disconnectDatabase();
});
