import express from 'express';
import { login, register } from '../controllers/auth.controller';
import catchAsync from '../utils/catchAsync';
const router = express.Router();

router.post('/register', catchAsync(register));
router.post('/login', catchAsync(login));

export default router;