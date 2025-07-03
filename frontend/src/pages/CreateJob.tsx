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
import { useNavigate } from 'react-router-dom';

const CreateJob: React.FC = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [screeningPrompt, setScreeningPrompt] = useState('');
  const [atsPrompt, setATSPrompt] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const loadInitialData = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setInitialLoading(false);
    };
    loadInitialData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const token = localStorage.getItem('token');

    try {
      await axios.post(
        'http://localhost:5000/api/jobs/',
        {
          title: jobTitle,
          description: jobDescription,
          screening_questions_prompt: screeningPrompt,
          ats_calculation_prompt: atsPrompt,
          type: type,
          location: location,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage({ type: 'success', text: 'Job created successfully!' });

      setJobTitle('');
      setJobDescription('');
      setScreeningPrompt('');
      setATSPrompt('');
      setType('');
      setLocation('');
      setAIPrompt('');
      setShowAIPrompt(false);

      setTimeout(() => {
        navigate('/alljobs');
      }, 1000);
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Failed to submit job';
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
      const generatedText = `AI Generated description for prompt: "${aiPrompt}"`;
      setJobDescription(generatedText);
    } catch (err) {
      console.error('AI generation failed', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloseAIPrompt = () => {
    setShowAIPrompt(false);
    setAIPrompt('');
    setIsGenerating(false);
  };

  if (initialLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h5" fontWeight={600} textAlign="center" gutterBottom>
        Bigstep HR Assistant - Create Job
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

          <Box position="relative">
            <TextField
              label="Job Description"
              value={isGenerating ? 'Typing...' : jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              multiline
              minRows={4}
              fullWidth
              required
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleAIGenerate}
              sx={{ position: 'absolute', top: 8, right: 8 }}
            >
              Use AI
            </Button>
          </Box>

          {showAIPrompt && (
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
              helperText={
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleGenerateFromPrompt}
                  disabled={isGenerating || !aiPrompt.trim()}
                >
                  Generate
                </Button>
              }
            />
          )}

          <TextField
            label="Screening Questions Prompt"
            value={screeningPrompt}
            onChange={(e) => setScreeningPrompt(e.target.value)}
            multiline
            minRows={3}
            fullWidth
          />

          <TextField
            label="ATS Calculation Prompt"
            value={atsPrompt}
            onChange={(e) => setATSPrompt(e.target.value)}
            multiline
            minRows={3}
            fullWidth
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
            minRows={3}
            fullWidth
          />

          <Box textAlign="center">
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Submit / Save'}
            </Button>
          </Box>
        </Stack>
      </form>
    </Container>
  );
};

export default CreateJob;
