import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import {globalErrorHandler} from './middleware/errorHandler.middleware';

import sequelize from './config/database';

import authRoutes from './routes/auth.routes';
import jobRoutes from './routes/job.routes';

import candidateListRoutes from './routes/applicant.routes'; // Import the candidate list routes
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.use('/api/jobs', jobRoutes);

app.use('/api/auth', authRoutes);

app.use('/api/applicant', candidateListRoutes); // Use the candidate list routes);






app.use(globalErrorHandler);





// DB Connection + Server Start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL');

    await sequelize.sync(); // sync all models
    console.log('📦 Models synchronized');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err);
  }
};

startServer();
