// validators/applicationValidator.ts
import Joi from 'joi';

export const applicationSchema = Joi.object({
  name: Joi.string().max(255).required(),
  phone: Joi.string().pattern(/^[0-9+\-()\s]{7,15}$/).required(), // allows basic phone formats
  email: Joi.string().email().required(),
  ats_score: Joi.number().min(0).required(),
  resume_url: Joi.string().uri().required(), // or just Joi.string().required() if not a full URL
  rating: Joi.number().min(0).max(5).optional(),
  call_scheduled: Joi.date().optional(),
  call_status: Joi.string().max(255).optional(),
  call_analysis: Joi.string().optional(),
  is_accepted: Joi.boolean().optional(),
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed').default('pending'),
  job_id: Joi.string().guid({ version: 'uuidv4' }).required(),
});
