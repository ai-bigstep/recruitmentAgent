import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Box,
  CircularProgress,
  Typography,
  Snackbar,
  Slide,
} from '@mui/material';
import JobCard from '../components/JobCard';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Job {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  candidates?: any[];
  recruiter?: {
    id: string;
    name: string;
    email: string;
  };
}

const baseURL = import.meta.env.VITE_API_BASE_URL;

const fetchJobs = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${baseURL}/api/jobs/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

const AllJobs: React.FC = () => {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: jobs = [],
    isLoading: loading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['jobs', user?.id],
    queryFn: fetchJobs,
    enabled: !!user,
  });

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${baseURL}/api/jobs/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['jobs', user?.id] });
      setMessage({ type: 'success', text: 'Job deleted successfully!' });
    } catch (error) {
      console.error('Error deleting job:', error);
      setMessage({ type: 'error', text: 'Failed to delete job' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Typography variant="h4" align="center" color="primary" gutterBottom>
        All Jobs
      </Typography>

      <Snackbar
        open={!!message}
        onClose={() => setMessage(null)}
        autoHideDuration={2000}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={(props) => <Slide {...props} direction="down" />}
        message={message?.text}
      />

      {jobs.length === 0 ? (
        <Typography variant="body1" align="center" color="textSecondary">
          No jobs found.
        </Typography>
      ) : (
        <Grid container spacing={4} justifyContent="center">
          {jobs.map((job: Job) => (
            <Grid item xs={12} md={4} key={job.id as string}>
              <JobCard
                title={job.title}
                candidateCount={job.candidates?.length || 0}
                jobId={job.id}
                onDelete={handleDelete}
                recruiter={job.recruiter}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </div>
  );
};

export default AllJobs;
