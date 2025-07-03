import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Grid, Box, CircularProgress, Typography } from '@mui/material';
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
  const [loading, setLoading] = useState(true); // ✅ loading state
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
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchJobs();
    } else {
      setLoading(false); // stop loading if no user
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
    } catch (error) {
      console.error('Error deleting job:', error);
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
