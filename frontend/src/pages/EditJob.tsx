import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  CircularProgress,
  Stack,
  MenuItem,
  IconButton,
  InputAdornment,
  Snackbar,
  Slide,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

interface Job {
  title: string;
  description: string;
  screening_questions_prompt?: string;
  ats_calculation_prompt?: string;
  type?: string;
  location?: string;
}

const baseURL = import.meta.env.VITE_API_BASE_URL;

const fetchJob = async (id: string | undefined): Promise<Job> => {
  const token = localStorage.getItem('token');
  const res = await axios.get(`${baseURL}/api/jobs/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

const EditJob: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [screeningPrompt, setScreeningPrompt] = useState('');
  const [atsPrompt, setATSPrompt] = useState('');
  const [type, setType] = useState('Full Time');
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Fetch job details
  const {
    data: job,
    isLoading: fetching,
    isError,
    error,
  } = useQuery<Job | undefined>({
    queryKey: ['job', id],
    queryFn: () => fetchJob(id),
    enabled: !!id,
  });

  // Update form state when job data is fetched
  React.useEffect(() => {
    if (job) {
      setJobTitle(job.title || '');
      setJobDescription(job.description || '');
      setScreeningPrompt(job.screening_questions_prompt || '');
      setATSPrompt(job.ats_calculation_prompt || '');
      setType(job.type || 'Full Time');
      setLocation(job.location || '');
    }
  }, [job]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      await axios.put(
        `${baseURL}/api/jobs/${id}`,
        {
          title: jobTitle,
          description: jobDescription,
          screening_questions_prompt: screeningPrompt,
          ats_calculation_prompt: atsPrompt,
          type,
          location,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage({ type: 'success', text: 'Job updated successfully!' });
      setTimeout(() => navigate('/alljobs'), 1000);
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Failed to update job';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerate = () => {
    setShowAIPrompt(true);
  };

  const pollForJD = async (jobId: string) => {
    let attempts = 0;
    const maxAttempts = 30;
    const token = localStorage.getItem('token');
    while (attempts < maxAttempts) {
      const res = await fetch(`${baseURL}/api/jobs/${jobId}/jd-result`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.status === 204) {
        // No content yet, keep polling
      } else if (res.ok) {
        const data = await res.json();
        if (data && data.job_description) {
          setJobDescription(data.job_description);
          setIsGenerating(false);
          return;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;
    }
    setIsGenerating(false);
    setMessage({ type: 'error', text: 'AI generation timed out.' });
  };

  const handleGenerateFromPrompt = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    const jobId = id || uuidv4();
    const token = localStorage.getItem('token');
    try {
      await fetch(`${baseURL}/api/jobs/${jobId}/jd-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ jd_prompt: aiPrompt }),
      });
      pollForJD(jobId);
    } catch (err) {
      setIsGenerating(false);
      setMessage({ type: 'error', text: 'Failed to enqueue AI generation.' });
    }
  };

  const handleCloseAIPrompt = () => {
    setShowAIPrompt(false);
    setAIPrompt('');
    setIsGenerating(false);
  };

  if (fetching) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Container maxWidth="md">
        <Typography color="error" align="center" mt={4}>
          {error instanceof Error ? error.message : 'Failed to fetch job'}
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h5" fontWeight={600} textAlign="center" gutterBottom>
        Bigstep HR Assistant - Edit Job
      </Typography>

      <Snackbar
        open={!!message}
        onClose={() => setMessage(null)}
        autoHideDuration={2000}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={(props) => <Slide {...props} direction="down" />}
        message={message?.text}
      />

      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <TextField
            label="Job Title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            fullWidth
            required
          />

          <Stack spacing={1}>
            <TextField
              label="Job Description"
              value={isGenerating ? 'Typing...' : jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              multiline
              rows={6}
              fullWidth
              required
              inputProps={{ style: { overflow: 'auto' } }}
            />
            <Box textAlign="right">
              <Button variant="outlined" size="small" onClick={handleAIGenerate}>
                Use AI
              </Button>
            </Box>
          </Stack>

          {showAIPrompt && (
            <Stack spacing={1}>
              <TextField
                label="Enter prompt for AI"
                value={aiPrompt}
                onChange={(e) => setAIPrompt(e.target.value)}
                fullWidth
                multiline
                minRows={2}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleCloseAIPrompt}>
                        <CloseIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Box textAlign="right">
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleGenerateFromPrompt}
                  disabled={isGenerating || !aiPrompt.trim()}
                >
                  Generate
                </Button>
              </Box>
            </Stack>
          )}

          <TextField
            label="Screening Questions Prompt"
            value={screeningPrompt}
            onChange={(e) => setScreeningPrompt(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <TextField
            label="ATS Calculation Prompt"
            value={atsPrompt}
            onChange={(e) => setATSPrompt(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <TextField
            select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            fullWidth
          >
            <MenuItem value="Full Time">Full Time</MenuItem>
            <MenuItem value="Freelance">Freelance</MenuItem>
          </TextField>

          <TextField
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            fullWidth
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Stack>
      </form>
    </Container>
  );
};

export default EditJob;
