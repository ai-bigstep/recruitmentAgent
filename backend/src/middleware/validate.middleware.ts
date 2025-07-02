import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';

const validate = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = {
      ...req.body,
      ...req.params,
    };
    const { error } = schema.validate(data);

    

    if (error) {
      console.error('Validation error:', error.details[0].message);
      return res.status(400).json({ message: error.details[0].message });
    }

    next();
  };
};

export default validate;
