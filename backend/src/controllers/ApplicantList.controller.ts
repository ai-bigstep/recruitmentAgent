import { Request, Response } from 'express';
import Application from '../models/application.model';
import AWS from 'aws-sdk';

const QUEUE_URL = process.env.SQS_QUEUE_URL || 'https://sqs.ap-south-1.amazonaws.com/474560118046/resumequeue';
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';

AWS.config.update({ region: AWS_REGION });
const sqs = new AWS.SQS();

export const getApplicantsByJob = async (req: Request, res: Response) => {
  const { jobId } = req.params;

  try {
    const candidates = await Application.findAll({
      where: { job_id: jobId, is_deleted: false },
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json(candidates);
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

export const enqueueCallRequest = async (req: Request, res: Response) => {
  const { jobId, applicationId } = req.params;
  if (!jobId || !applicationId) {
    return res.status(400).json({ message: 'Missing jobId or applicationId' });
  }
  const params = {
    QueueUrl: QUEUE_URL,
    MessageBody: 'call',
    MessageAttributes: {
      'type': {
        DataType: 'String',
        StringValue: 'call',
      },
      'job_id': {
        DataType: 'String',
        StringValue: jobId,
      },
      'application_id': {
        DataType: 'String',
        StringValue: applicationId,
      },
    },
  };
  try {
    await sqs.sendMessage(params).promise();
    return res.status(200).json({ message: 'Call request enqueued successfully' });
  } catch (error) {
    console.error('Error enqueuing call request:', error);
    return res.status(500).json({ message: 'Failed to enqueue call request', error });
  }
};
