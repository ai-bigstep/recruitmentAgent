import express from 'express';
import { getCandidatesByJob } from '../controllers/candidateList.controller';
import { applicationSchema } from '../validators/applicationValidator';
import validate from '../middleware/validate.middleware';


const router = express.Router();

router.get('/job/:jobId',validate(applicationSchema), getCandidatesByJob); // 👈 Add this line

export default router;
