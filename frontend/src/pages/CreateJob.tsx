import React, { useState, useEffect, useRef } from 'react';
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
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const quillModules = {
  toolbar: [
    [{ 'font': [] }],
    [{ 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'script': 'sub' }, { 'script': 'super' }],
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['blockquote', 'code-block'],
    ['link'],
    ['clean']
  ]
};

const CreateJob: React.FC = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [screeningPrompt, setScreeningPrompt] = useState('');
  const [atsPrompt, setATSPrompt] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [type, setType] = useState('');
  const [locationChips, setLocationChips] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const loadInitialData = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setInitialLoading(false);
    };
    loadInitialData();
  }, []);

  const handleKeywordAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && keywordInput.trim()) {
      e.preventDefault();
      if (!keywords.includes(keywordInput.trim())) {
        setKeywords([...keywords, keywordInput.trim()]);
      }
      setKeywordInput('');
    }
  };
  const handleKeywordDelete = (toDelete: string) => {
    setKeywords(keywords.filter((k) => k !== toDelete));
  };

  const handleLocationAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && locationInput.trim()) {
      e.preventDefault();
      if (!locationChips.includes(locationInput.trim())) {
        setLocationChips([...locationChips, locationInput.trim()]);
      }
      setLocationInput('');
    }
  };
  const handleLocationDelete = (toDelete: string) => {
    setLocationChips(locationChips.filter((l) => l !== toDelete));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const token = localStorage.getItem('token');

    try {
      const response = await axios.post(
        `${baseURL}/api/jobs/`,
        {
          title: jobTitle,
          description: jobDescription,
          screening_questions_prompt: screeningPrompt,
          ats_calculation_prompt: keywords.join(', '), // use keywords only
          type,
          location: locationChips.join(', '),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setJobId(response.data.id);
      setMessage({ type: 'success', text: 'Job created successfully!' });

      setJobTitle('');
      setJobDescription('');
      setScreeningPrompt('');
      setATSPrompt('');
      setType('');
      setLocationChips([]); // Clear location chips after submission
      setKeywords([]); // Clear keywords after submission

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
        console.log("job description received: ");
        console.log(data.job_description);
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

    const currentJobId = jobId || uuidv4();
    setJobId(currentJobId);
    console.log("Insite handleGeneratefromprompt")
    const token = localStorage.getItem('token');
    try {
      await fetch(`${baseURL}/api/jobs/${currentJobId}/jd-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ jd_prompt: aiPrompt }),
      });
      pollForJD(currentJobId);
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

          <Stack spacing={1}>
            <ReactQuill
              value={isGenerating ? '<p>Typing...</p>' : jobDescription}
              onChange={setJobDescription}
              theme="snow"
              style={{ minHeight: 180, marginBottom: 8 }}
              placeholder="Enter job description or generate with AI"
              modules={quillModules}
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

          {/* Replace ATS Calculation Prompt textarea with keyword chip input */}
          <Stack spacing={1}>
            <TextField
              label="Keywords (for ATS Calculation)"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordAdd}
              placeholder="Type a keyword for ATS Calculation and press Enter"
              fullWidth
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {keywords.map((keyword) => (
                <Chip
                  key={keyword}
                  label={keyword}
                  onDelete={() => handleKeywordDelete(keyword)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Stack>

          {/* Location as chip input */}
          <Stack spacing={1}>
            <TextField
              label="Location(s)"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={handleLocationAdd}
              placeholder="Type a location and press Enter"
              fullWidth
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {locationChips.map((loc) => (
                <Chip
                  key={loc}
                  label={loc}
                  onDelete={() => handleLocationDelete(loc)}
                  color="secondary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Stack>

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