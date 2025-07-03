import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Container,
  CircularProgress,
  Paper,
  Button,
  Alert,
  Divider,
  Stack,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const JobDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get(`http://localhost:5000/api/jobs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setJob(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load job');
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4, mt: 4, borderRadius: 4 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Job Details
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={2}>
          <Typography><strong>Title:</strong> {job.title}</Typography>
          <Typography><strong>Description:</strong> {job.description}</Typography>
          <Typography><strong>Type:</strong> {job.type}</Typography>
          <Typography><strong>Location:</strong> {job.location}</Typography>
          <Typography><strong>Screening Prompt:</strong> {job.screening_questions_prompt}</Typography>
          <Typography><strong>ATS Prompt:</strong> {job.ats_calculation_prompt}</Typography>
        </Stack>

        <Box mt={4} textAlign="center">
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate(`/editjob/${id}`)}
          >
            Edit Job
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default JobDetails;
