import express from 'express';
import {
  createJob,
  getJobsByRecruiter,
  getJobById,
  updateJob,
  deleteJob,
} from '../controllers/job.controller';

import { authenticateToken } from '../middleware/auth.middleware';


import { jobSchema } from '../validators/jobValidator';
import validate from '../middleware/validate.middleware';



import multer from 'multer';
import { uploadResume } from '../controllers/file.controller';
import catchAsync from '../utils/catchAsync';

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

// Job routes
router.post('/', authenticateToken,validate(jobSchema), catchAsync(createJob));
router.get('/', authenticateToken, catchAsync(getJobsByRecruiter));
router.get('/:id', authenticateToken, catchAsync(getJobById));
router.put('/:id', authenticateToken,validate(jobSchema), catchAsync(updateJob));
router.delete('/:id', authenticateToken, catchAsync(deleteJob));

// File upload route
router.post(
  '/upload/:job_id',
  authenticateToken,
  upload.single('resume'),
  catchAsync(uploadResume)
);

export default router;
