// validators/userValidator.ts
import Joi from 'joi';

export const userSchema = Joi.object({
  name: Joi.string().max(128).required(),
  email: Joi.string().email().max(128).required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid('recruiter', 'superadmin').default('recruiter'),
});

// validators/userValidator.ts (continued)
export const loginSchema = Joi.object({
  email: Joi.string().email().max(128).required(),
  password: Joi.string().min(6).max(128).required(),
});

