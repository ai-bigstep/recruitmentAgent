import { Response } from 'express';
import Job from '../models/job.model';
import { AuthRequest } from '../middleware/auth.middleware';
import Application from '../models/application.model';
import User from '../models/user.model';
import AppError from '../utils/AppError';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

// Temporary in-memory store for generated JDs
const tempJDStore: { [jobId: string]: { status: 'pending' | 'ready', job_description?: string } } = {};

const sqs = new SQSClient({ region: process.env.AWS_REGION });
const QUEUE_URL = process.env.SQS_QUEUE_URL;

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

  res.status(201).json(job);
};

export const getJobsByRecruiter = async (req: AuthRequest, res: Response) => {
  const user_id = req.user?.id;
  const user_role = req.user?.role;
  if (!user_id) throw new AppError('Unauthorized: Missing user ID', 401);

  // If user is superadmin, show all jobs, otherwise show only user's jobs
  const whereClause = user_role === 'superadmin' ? {} : { user_id };

  const jobs = await Job.findAll({
    where: whereClause,
    include: [
      {
        model: Application,
        as: 'candidates',
        attributes: ['id'], // Only fetch IDs
        where: { is_deleted: false }, // Only include not-deleted
        required: false, // So jobs with 0 candidates are still included
      },
      // Include job creator info for superadmin
      ...(user_role === 'superadmin' ? [{
        model: User,
        as: 'recruiter',
        attributes: ['id', 'name', 'email'],
        required: false,
      }] : []),
    ],
  });
  res.status(200).json(jobs);
};

export const getJobById = async (req: AuthRequest, res: Response) => {
  const user_role = req.user?.role;
  
  // If user is superadmin, they can view any job, otherwise only their own
  const whereClause = user_role === 'superadmin' 
    ? { id: req.params.id }
    : { id: req.params.id, user_id: req.user?.id };

  const job = await Job.findOne({
    where: whereClause,
  });

  if (!job) throw new AppError('Job not found', 404);

  res.status(200).json(job);
};

export const updateJob = async (req: AuthRequest, res: Response) => {
  const { title, description, screening_questions_prompt, ats_calculation_prompt, type, location } = req.body;
  const user_role = req.user?.role;

  // If user is superadmin, they can update any job, otherwise only their own
  const whereClause = user_role === 'superadmin' 
    ? { id: req.params.id }
    : { id: req.params.id, user_id: req.user?.id };

  const job = await Job.findOne({ where: whereClause });
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
  const user_role = req.user?.role;

  // If user is superadmin, they can delete any job, otherwise only their own
  const whereClause = user_role === 'superadmin' 
    ? { id: req.params.id }
    : { id: req.params.id, user_id: req.user?.id };

  const job = await Job.findOne({ where: whereClause });
  if (!job) throw new AppError('Job not found', 404);

  await job.destroy();
  res.status(204).send();
};


export const enqueueJDGeneration = async (req: AuthRequest, res: Response) => {
  const { jobId } = req.params;
  const { jd_prompt } = req.body;
  
  // Get the auth token from the request headers
  const authHeader = req.headers['authorization'] || '';

  tempJDStore[jobId] = { status: 'pending' };

  const messageCommand = new SendMessageCommand({
    QueueUrl: QUEUE_URL,
    MessageBody: 'JobToProcess',
    MessageAttributes: {
      job_id: { DataType: 'String', StringValue: jobId },
      type: { DataType: 'String', StringValue: 'jd_gen' },
      jd_prompt: { DataType: 'String', StringValue: jd_prompt },
      auth_token: { DataType: 'String', StringValue: authHeader },
    }
  });
  await sqs.send(messageCommand);
  res.status(200).json({ message: 'JD generation enqueued' });
};

// SQS worker posts the result here
export const saveJDResult = async (req: AuthRequest, res: Response) => {
  const { jobId } = req.params;
  const { job_description } = req.body;
  tempJDStore[jobId] = { status: 'ready', job_description };
  res.status(200).json({ message: 'Job description saved temporarily' });
};

// Frontend polls this endpoint
export const getJDResult = async (req: AuthRequest, res: Response) => {
  const { jobId } = req.params;
  const entry = tempJDStore[jobId];
  if (!entry || entry.status !== 'ready') return res.status(204).send();
  const jd = entry.job_description;
  delete tempJDStore[jobId];
  res.status(200).json({ job_description: jd });
};