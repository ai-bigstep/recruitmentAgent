import React, { useState, useEffect } from 'react';
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

const EditJob: React.FC = () => {
  const { id } = useParams();
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [screeningPrompt, setScreeningPrompt] = useState('');
  const [atsPrompt, setATSPrompt] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchJob = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get(`http://localhost:5000/api/jobs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const job = res.data;
        setJobTitle(job.title);
        setJobDescription(job.description);
        setScreeningPrompt(job.screening_questions_prompt || '');
        setATSPrompt(job.ats_calculation_prompt || '');
        setType(job.type || 'Full Time');
        setLocation(job.location || '');
      } catch (err: any) {
        const errMsg = err.response?.data?.message || err.message || 'Failed to fetch job';
        setMessage({ type: 'error', text: errMsg });
      } finally {
        setFetching(false);
      }
    };

    fetchJob();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const token = localStorage.getItem('token');

    try {
      await axios.put(
        `http://localhost:5000/api/jobs/${id}`,
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

  const handleGenerateFromPrompt = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const aiGenerated = `AI-generated description for prompt: "${aiPrompt}"`;
      setJobDescription(aiGenerated);
    } catch (err) {
      console.error('AI generation failed:', err);
    } finally {
      setIsGenerating(false);
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
            multiline
            rows={4}
            fullWidth
            inputProps={{ style: { overflow: 'auto' } }}
          />

          <TextField
            label="ATS Calculation Prompt"
            value={atsPrompt}
            onChange={(e) => setATSPrompt(e.target.value)}
            multiline
            rows={4}
            fullWidth
            inputProps={{ style: { overflow: 'auto' } }}
          />

          <TextField
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            select
            fullWidth
          >
            <MenuItem value="Full Time">Full Time</MenuItem>
            <MenuItem value="Freelance">Freelance</MenuItem>
          </TextField>

          <TextField
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            multiline
            rows={1}
            fullWidth
            inputProps={{ style: { overflow: 'auto' } }}
          />

          <Box textAlign="center">
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Update Job'}
            </Button>
          </Box>
        </Stack>
      </form>
    </Container>
  );
};

export default EditJob;
