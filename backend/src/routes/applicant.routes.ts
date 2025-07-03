import express from 'express';
import { getApplicantsByJob } from '../controllers/ApplicantList.controller';
import { softDeleteApplicant } from '../controllers/ApplicantList.controller';
import { applicationSchema } from '../validators/applicationValidator';
import validate from '../middleware/validate.middleware';
import catchAsync from '../utils/catchAsync';

const router = express.Router();

router.get('/job/:jobId', catchAsync(getApplicantsByJob)); // 👈 Add this line

// Soft delete applicant
router.delete('/delete/:applicantId', catchAsync(softDeleteApplicant));

export default router;
