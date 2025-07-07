import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Typography,
  Box,
  Snackbar,
  Slide,
  Alert
} from '@mui/material';
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL;

interface UploadResumeModalProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
}

const UploadResumeModal: React.FC<UploadResumeModalProps> = ({ open, onClose, jobId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [snackbar, setSnackbar] = useState<{
      open: boolean;
      message: string;
      severity: 'error' | 'success';
      redirectAfterClose?: boolean;
    }>({
      open: false,
      message: '',
      severity: 'error',
      redirectAfterClose: false,
    });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.zip')) {
      setFile(selectedFile);
    } else {
      setFile(null);
      setSnackbar({
        open: true,
        message: 'Please upload a valid ZIP file.',
        severity: 'error',
      });
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('job_id', jobId);

    try {
      setUploading(true);
      setProgress(0);

      const response = await axios.post(
        `${baseURL}/api/jobs/upload/${jobId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          onUploadProgress: (e) => {
            if (e.total) {
              const percent = Math.round((e.loaded / e.total) * 100);
              setProgress(percent);
            }
          },
        }
      );

      if (response.status === 200) {
        setSnackbar({
        open: true,
        message: 'Resume upload successfully.',
        severity: 'success',
      });

        setTimeout(() => {
          onClose();
          setFile(null);
          setProgress(0);
        }, 3000);
      } else {
        throw new Error('Server responded with failure.');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setSnackbar({
        open: true,
        message: 'Failed to upload resume. Please try again.',
        severity: 'error',
      });
    } finally {
      setUploading(false);
    }
  };
  const handleCloseSnackbar = () => {
    setMessage(null);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Upload ZIP Resume</DialogTitle>
        <DialogContent>
          <Typography mb={2}>Please upload a ZIP file containing resumes.</Typography>
          <input type="file" onChange={handleFileChange} accept=".zip" disabled={uploading} />
          {progress > 0 && (
            <Box mt={2}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="body2" color="textSecondary" align="right" mt={1}>
                {progress < 100 ? `${progress}%` : '100% - Uploaded, processing...'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={uploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? (progress < 100 ? 'Uploading...' : 'Processing...') : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
              open={snackbar.open}
              autoHideDuration={4000}
              onClose={handleCloseSnackbar}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
              <Alert
                severity={snackbar.severity}
                onClose={handleCloseSnackbar}
                sx={{ width: '100%' }}
              >
                {snackbar.message}
              </Alert>
            </Snackbar>
    </>
  );
};

export default UploadResumeModal;
