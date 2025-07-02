import { Response } from 'express';
import Job from '../models/job.model';
import { AuthRequest } from '../middleware/auth.middleware';

import AppError from '../utils/AppError';

export const createJob = async (req: AuthRequest, res: Response) => {
  const { title, description, screening_questions_prompt, ats_calculation_prompt, type, location } = req.body;
  const user_id = req.user?.id;

  if (!user_id) throw new AppError('Unauthorized: Missing user ID', 401);

  const job = await Job.create({
    title,
    description,
    screening_questions_prompt,
    ats_calculation_prompt,
    type,
    location,
    user_id,
  });
  console.log('Job created:', job);

  res.status(201).json(job);
};

export const getJobsByRecruiter = async (req: AuthRequest, res: Response) => {
  const user_id = req.user?.id;
  if (!user_id) throw new AppError('Unauthorized: Missing user ID', 401);

  const jobs = await Job.findAll({ where: { user_id } });
  res.status(200).json(jobs);
};

export const getJobById = async (req: AuthRequest, res: Response) => {
  const job = await Job.findOne({
    where: {
      id: req.params.id,
      user_id: req.user?.id,
    },
  });

  if (!job) throw new AppError('Job not found', 404);

  res.status(200).json(job);
};

export const updateJob = async (req: AuthRequest, res: Response) => {
  const { title, description, screening_questions_prompt, ats_calculation_prompt, type, location } = req.body;

  const job = await Job.findOne({ where: { id: req.params.id, user_id: req.user?.id } });
  if (!job) throw new AppError('Job not found', 404);

  job.title = title;
  job.description = description;
  job.screening_questions_prompt = screening_questions_prompt;
  job.ats_calculation_prompt = ats_calculation_prompt;
  job.type = type;
  job.location = location;

  await job.save();
  res.status(200).json(job);
};

export const deleteJob = async (req: AuthRequest, res: Response) => {
  const job = await Job.findOne({ where: { id: req.params.id, user_id: req.user?.id } });
  if (!job) throw new AppError('Job not found', 404);

  await job.destroy();
  res.status(204).send();
};
