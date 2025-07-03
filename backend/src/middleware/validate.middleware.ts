import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';

const validate = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    
    const { error } = schema.validate(req.body);
    const id = req.params.id || req.params.jobId;
    

    if (error) {
      console.error('Validation error:', error.details[0].message);
      return res.status(400).json({ message: error.details[0].message });
    }

    next();
  };
};

export default validate;
