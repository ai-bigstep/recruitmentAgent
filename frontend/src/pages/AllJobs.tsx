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

interface Job {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  candidates?: any[];
}

const AllJobs: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/jobs/', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setJobs(response.data);
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
        setMessage({ type: 'error', text: 'Failed to load jobs' });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchJobs();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/jobs/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setJobs(prev => prev.filter(job => job.id !== id));
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
          {jobs.map((job) => (
            <Grid item xs={12} md={4} key={job.id}>
              <JobCard
                title={job.title}
                candidateCount={job.candidates?.length || 0}
                jobId={job.id}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </div>
  );
};

export default AllJobs;
