import { Request, Response } from 'express';
import User from '../models/user.model';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError'; // Custom error class

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

  const user = await User.findOne({ where: { email } });
  
  if (!user || !(await user.validPassword(password))) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
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
