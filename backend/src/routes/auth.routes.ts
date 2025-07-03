import express from 'express';
import { login, register, resetPassword } from '../controllers/auth.controller';
import catchAsync from '../utils/catchAsync';
import { userSchema, loginSchema } from '../validators/userValidator';
import validate from '../middleware/validate.middleware';

const router = express.Router();


import { forgotPassword } from '../controllers/auth.controller';
router.post('/register', validate(userSchema),catchAsync(register));
router.post('/login', validate(loginSchema),catchAsync(login));

router.post('/forgot-password',catchAsync(forgotPassword));
router.post('/reset-password', resetPassword);
export default router;