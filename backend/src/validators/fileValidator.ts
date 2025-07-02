// validators/resumeFileValidator.ts
import Joi from 'joi';

export const fileSchema = Joi.object({
  job_id: Joi.string().guid({ version: 'uuidv4' }).required(),
  user_id: Joi.string().guid({ version: 'uuidv4' }).required(),
  name: Joi.string().required(),
  path: Joi.string().required(),
  type: Joi.string().valid('pdf', 'doc', 'docx', 'txt').default('pdf'), // extend if needed
  size: Joi.number().positive().required(),
  storage: Joi.string().valid('s3', 'local').default('s3'),
});
