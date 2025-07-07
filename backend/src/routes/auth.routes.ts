import express from 'express';
import { login, register, resetPassword, createRecruiter, createSuperadmin } from '../controllers/auth.controller';
import catchAsync from '../utils/catchAsync';
import { userSchema, loginSchema } from '../validators/userValidator';
import validate from '../middleware/validate.middleware';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

import { forgotPassword } from '../controllers/auth.controller';
router.post('/register', validate(userSchema),catchAsync(register));
router.post('/login', validate(loginSchema),catchAsync(login));
router.post('/create-recruiter', authenticateToken, validate(userSchema), catchAsync(createRecruiter));
router.post('/create-superadmin', catchAsync(createSuperadmin));

router.post('/forgot-password',catchAsync(forgotPassword));
router.post('/reset-password', resetPassword);
export default router;