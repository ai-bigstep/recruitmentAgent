import express from 'express';
import { getApplicantsByJob } from '../controllers/ApplicantList.controller';
import { applicationSchema } from '../validators/applicationValidator';
import validate from '../middleware/validate.middleware';
import catchAsync from '../utils/catchAsync';

const router = express.Router();

router.get('/job/:jobId',validate(applicationSchema), catchAsync(getApplicantsByJob)); // 👈 Add this line

export default router;
