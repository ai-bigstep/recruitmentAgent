// validators/jobValidator.ts
import Joi from 'joi';

export const jobSchema = Joi.object({
  title: Joi.string().max(255).required(),
  description: Joi.string().required(),
  screening_questions_prompt: Joi.string().required(),
  ats_calculation_prompt: Joi.string().required(),
  type: Joi.string().valid('Full Time','Freelance').required(),
  location: Joi.string().required(),
  is_active: Joi.boolean().default(true),
  is_published: Joi.boolean().default(true),
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed').default('pending'),
  user_id: Joi.string().guid({ version: 'uuidv4' }).allow(null),
});
