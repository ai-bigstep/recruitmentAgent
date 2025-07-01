import express from 'express';
import { getCandidatesByJob } from '../controllers/candidateList.controller';

const router = express.Router();

router.get('/job/:jobId', getCandidatesByJob); // 👈 Add this line

export default router;
