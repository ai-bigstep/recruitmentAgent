import express from 'express';
import { login, register } from '../controllers/auth.controller';
import catchAsync from '../utils/catchAsync';
import { userSchema, loginSchema } from '../validators/userValidator';
import validate from '../middleware/validate.middleware';

const router = express.Router();

router.post('/register', validate(userSchema),catchAsync(register));
router.post('/login', validate(loginSchema),catchAsync(login));

export default router;