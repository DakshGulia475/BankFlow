import { Router } from 'express';
import * as transactionController from '../controllers/transaction.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const transactionRouter = Router();

transactionRouter.use(requireAuth);
transactionRouter.post('/deposit', transactionController.deposit);
transactionRouter.post('/withdraw', transactionController.withdraw);
transactionRouter.post('/transfer', transactionController.transfer);
transactionRouter.get('/', transactionController.history);
