import { Request, Response } from 'express';
import Application from '../models/application.model';
import Job from '../models/job.model';

export const getCandidatesByJob = async (req: Request, res: Response) => {
  const { jobId } = req.params;

  try {
    const candidates = await Application.findAll({
      where: { job_id: jobId },
      include: [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'description'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json(candidates);
  } catch (error) {
    console.error('Error fetching candidates for job:', error);
    return res.status(500).json({ message: 'Failed to retrieve candidates for the job' });
  }
};
