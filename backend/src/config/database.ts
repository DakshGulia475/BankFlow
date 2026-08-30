import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase(uri: string = env.mongodbUri): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  return mongoose.connect(uri);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
