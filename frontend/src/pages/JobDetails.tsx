import React from 'react';
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
import { useQuery } from '@tanstack/react-query';
const baseURL = import.meta.env.VITE_API_BASE_URL;

const fetchJob = async (id: string | undefined) => {
  console.log("fewfegfer");
  console.log(baseURL);
  const token = localStorage.getItem('token');
  const res = await axios.get(`${baseURL}/api/jobs/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

const JobDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: job,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['job', id],
    queryFn: () => fetchJob(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error instanceof Error ? error.message : 'Failed to load job'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 5, mt: 5, borderRadius: 4, bgcolor: 'background.default' }}>
        <Typography variant="h5" fontWeight={600} gutterBottom color="primary">
          Job Details
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={4}>
          <Typography>
            <strong>Title:</strong> {job.title}
          </Typography>

           <Typography>
            <strong>Type:</strong> {job.type}
          </Typography>

          <Typography>
            <strong>Location:</strong> {job.location}
          </Typography>

          <Box>
            <Typography fontWeight={600} gutterBottom>
              Description:
            </Typography>
            {job.description || '\u2014'}
          </Box>

          <Box>
            <Typography fontWeight={600} gutterBottom>
              Screening Questions Prompt:
            </Typography>
            {job.screening_questions_prompt || '\u2014'}
          </Box>

          <Box>
            <Typography fontWeight={600} gutterBottom>
              Keywords for ATS Calculation:
            </Typography>
            {job.ats_calculation_prompt || '\u2014'}
          </Box>
        </Stack>

        <Box mt={5} textAlign="center">
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
