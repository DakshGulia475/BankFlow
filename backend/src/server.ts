import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';

async function start(): Promise<void> {
  await connectDatabase();
  console.log('Connected to MongoDB');

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`BankFlow API listening on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
