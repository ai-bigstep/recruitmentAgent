import express from 'express';
import { getApplicantsByJob } from '../controllers/ApplicantList.controller';
import { softDeleteApplicant } from '../controllers/ApplicantList.controller';
import { applicationSchema } from '../validators/applicationValidator';
import validate from '../middleware/validate.middleware';
import catchAsync from '../utils/catchAsync';
import { updateApplicant } from '../controllers/ApplicantList.controller';

const router = express.Router();

router.get('/job/:jobId', catchAsync(getApplicantsByJob)); // 👈 Add this line

// Soft delete applicant
router.delete('/delete/:applicantId', catchAsync(softDeleteApplicant));

router.patch('/update/:applicantId', catchAsync(updateApplicant));

// New route to trigger a call (enqueue SQS request)
router.post('/call/:jobId/:applicationId', catchAsync(require('../controllers/ApplicantList.controller').enqueueCallRequest));

export default router;
