import { Request, Response } from 'express';
import User from '../models/user.model';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError'; // Custom error class
import { sendEmail } from '../config/sendEmail'; 
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth.middleware';

import crypto from 'crypto';


export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ where: { email } });
  if (existing) throw new AppError('Email already exists', 400);

  const user = await User.create({ name, email, password });

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    user: { id: user.id, email: user.email },
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  console.log("Email ", email);
  console.log("Password ", password)
  const user = await User.findOne({ where: { email } });
  
  if (!user || !(await user.validPassword(password))) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET as string,
    { expiresIn: '2d' }
  );
 
  res.status(200).json({
    status: 'success',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Generate a secure random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  user.passwordResetToken = resetToken;
  user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
  await user.save();

  const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const resetLink = `${frontendBaseUrl}/reset-password/${resetToken}`;


  await sendEmail({
    to: user.email,
    subject: 'Password Reset',
    html: `
      <p>Hello ${user.name},</p>
      <p>Click below to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link will expire in 15 minutes.</p>
    `,
  });

  res.status(200).json({ message: 'Reset link sent to email' });
};


export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body;

  const user = await User.findOne({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { [Op.gt]: new Date() }, // Not expired
    },
  });

  if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

  const hashed = await bcrypt.hash(password, 10);
  user.password = hashed;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  res.status(200).json({ message: 'Password successfully reset' });
};

export const createRecruiter = async (req: AuthRequest, res: Response) => {
  const { name, email, password } = req.body;
  const currentUser = req.user;

  // Check if current user is superadmin
  if (currentUser?.role !== 'superadmin') {
    throw new AppError('Unauthorized: Only superadmin can create recruiters', 403);
  }

  const existing = await User.findOne({ where: { email } });
  if (existing) throw new AppError('Email already exists', 400);

  const user = await User.create({ name, email, password, role: 'recruiter' });

  res.status(201).json({
    status: 'success',
    message: 'Recruiter created successfully',
    user: { 
      id: user.id, 
      name: user.name,
      email: user.email, 
      role: user.role 
    },
  });
};

export const createSuperadmin = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ where: { email } });
  if (existing) throw new AppError('Email already exists', 400);

  const user = await User.create({ name, email, password, role: 'superadmin' });

  res.status(201).json({
    status: 'success',
    message: 'Superadmin created successfully',
    user: { 
      id: user.id, 
      name: user.name,
      email: user.email, 
      role: user.role 
    },
  });
};