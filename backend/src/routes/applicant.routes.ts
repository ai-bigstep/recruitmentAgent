import express from 'express';
import { getApplicantsByJob } from '../controllers/ApplicantList.controller';
import { softDeleteApplicant } from '../controllers/ApplicantList.controller';
import { applicationSchema } from '../validators/applicationValidator';
import validate from '../middleware/validate.middleware';
import catchAsync from '../utils/catchAsync';
import { updateApplicant } from '../controllers/ApplicantList.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/job/:jobId', authenticateToken, catchAsync(getApplicantsByJob));

// Soft delete applicant
router.delete('/delete/:applicantId', authenticateToken, catchAsync(softDeleteApplicant));

router.patch('/update/:applicantId', authenticateToken, catchAsync(updateApplicant));

// New route to trigger a call (enqueue SQS request)
router.post('/call/:jobId/:applicationId', authenticateToken, catchAsync(require('../controllers/ApplicantList.controller').enqueueCallRequest));

export default router;
