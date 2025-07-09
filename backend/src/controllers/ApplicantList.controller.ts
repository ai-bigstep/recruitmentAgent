import { Request, Response } from 'express';
import Application from '../models/application.model';

export const getApplicantsByJob = async (req: Request, res: Response) => {
  const { jobId } = req.params;
  
  
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;
  
  const offset = (page - 1) * pageSize;

  try {
    const { rows, count } = await Application.findAndCountAll({
      where: { job_id: jobId, is_deleted: false },
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize,
      raw: true, // Only return plain objects
    });
    
    return res.status(200).json({ rows, count });
  } catch (error) {
    console.error('Error fetching candidates for job:', error);
    return res.status(500).json({ message: 'Failed to retrieve candidates for the job' });
  }
};

export const softDeleteApplicant = async (req: Request, res: Response) => {
  const { applicantId } = req.params;
  try {
    const [affectedRows] = await Application.update(
      { is_deleted: true },
      { where: { id: applicantId } }
    );
    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Applicant not found' });
    }
    return res.status(200).json({ message: 'Applicant soft deleted successfully' });
  } catch (error) {
    console.error('Error soft deleting applicant:', error);
    return res.status(500).json({ message: 'Failed to soft delete applicant' });
  }
};

export const updateApplicant = async (req: Request, res: Response) => {
  const { applicantId } = req.params;
  const { is_accepted, rating } = req.body;
  try {
    const [affectedRows] = await Application.update(
      { ...(is_accepted !== undefined ? { is_accepted } : {}), ...(rating !== undefined ? { rating } : {}) },
      { where: { id: applicantId } }
    );
    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Applicant not found' });
    }
    return res.status(200).json({ message: 'Applicant updated successfully' });
  } catch (error) {
    console.error('Error updating applicant:', error);
    return res.status(500).json({ message: 'Failed to update applicant' });
  }
};
