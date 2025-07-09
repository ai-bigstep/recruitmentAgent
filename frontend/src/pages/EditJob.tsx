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
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [locationChips, setLocationChips] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');

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
      // Initialize location chips from job.location
      if (job.location) {
        setLocationChips(job.location.split(',').map(l => l.trim()).filter(Boolean));
      } else {
        setLocationChips([]);
      }
      // Initialize keywords from ats_calculation_prompt
      if (job.ats_calculation_prompt) {
        setKeywords(job.ats_calculation_prompt.split(',').map(k => k.trim()).filter(Boolean));
      }
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
          ats_calculation_prompt: keywords.join(', '), // use keywords
          type,
          location: locationChips.join(', '),
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
    <Container maxWidth="sm">
      <Typography variant="h5" fontWeight={600} textAlign="center" gutterBottom>
        Edit Job
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
            label="Screening Questions"
            value={screeningPrompt}
            onChange={(e) => setScreeningPrompt(e.target.value)}
            multiline
            rows={4}
            fullWidth
            inputProps={{ style: { overflow: 'auto' } }}
            required
          />

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
            select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            fullWidth
            required
          >
            <MenuItem value="Full Time">Full Time</MenuItem>
            <MenuItem value="Freelance">Freelance</MenuItem>
          </TextField>

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
