import { Response } from 'express';
import fs from 'fs';
import AdmZip from 'adm-zip';
import mime from 'mime-types';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

import s3 from '../config/s3';
import File from '../models/file.model';
import Application from '../models/application.model';
import { AuthRequest } from '../middleware/auth.middleware';

const sqs = new SQSClient({ region: process.env.AWS_REGION });
const QUEUE_URL = process.env.SQS_QUEUE_URL;

export const uploadResume = async (req: AuthRequest, res: Response) => {
  const { job_id } = req.params;
  const file = req.file;
  const user_id = req.user?.id;

  if (!user_id) {
    return res.status(401).json({ message: 'Unauthorized: Missing user ID' });
  }

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const zip = new AdmZip(file.path);
    const zipEntries = zip.getEntries();

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const fileBuffer = entry.getData();
      const fileName = entry.entryName;
      const contentType = mime.lookup(fileName) || 'application/octet-stream';

      // Step 1: Create file record in DB
      const createdFile = await File.create({
        job_id,
        name: fileName,
        user_id,
        type: mime.extension(contentType) || 'unknown',
        path: 'placeholder',
        size: fileBuffer.length,
        storage: 's3',
      });

      const fileId = createdFile.get({ plain: true }).id;
      const s3Key = `${job_id}/resume/${fileId}-${fileName}`;

      // Step 2: Upload file to S3
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME!,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: contentType,
        })
      );

      // Step 3: Update DB file record with final S3 path
      await createdFile.update({ path: s3Key });

      // Step 4: Create application entry
      const application = await Application.create({
        job_id,
        name: '',
        phone: '',
        email: '',
        ats_score: 0,
        resume_url: s3Key,
        status: 'pending',
      });
    }
    

    // Step 5: Send message to SQS
    const messageCommand = new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: 'JobToProcess',
      MessageAttributes: {
        job_id: { DataType: 'String', StringValue: job_id },
        type: { DataType: 'String', StringValue: 'resume' } // or 'jd_gen'
        // For JD generation:
        // jd_prompt: { DataType: 'String', StringValue: jd_prompt }
      },
    });

    try {
      await sqs.send(messageCommand);
      console.log(`Enqueued all resumes for job ID ${job_id} to SQS`);
    } catch (err) {
      console.error('Error sending SQS message:', err);
    }

    // Step 6: Clean up ZIP file from disk
    fs.unlinkSync(file.path);

    return res.status(200).json({
      message: 'Resumes uploaded successfully',
    });
  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(500).json({ error: 'Failed to upload resumes' });
  }
};
