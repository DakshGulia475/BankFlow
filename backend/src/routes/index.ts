import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { accountRouter } from './account.routes.js';
import { transactionRouter } from './transaction.routes.js';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/accounts', accountRouter);
apiRouter.use('/transactions', transactionRouter);
