import { Router } from 'express';
import * as accountController from '../controllers/account.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const accountRouter = Router();

accountRouter.use(requireAuth);
accountRouter.post('/', accountController.createAccount);
accountRouter.get('/me', accountController.getMyAccount);
