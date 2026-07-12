import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { checkRole } from '../middleware/checkRole';
import { validate } from '../middleware/validate';
import { getAllExpenses, createExpense, CreateExpenseSchema } from '../controllers/expenses.controller';

const router = Router();

router.get('/', requireAuth, checkRole('fuel', 'view'), getAllExpenses);
router.post('/', requireAuth, checkRole('fuel', 'full'), validate(CreateExpenseSchema), createExpense);

export default router;
