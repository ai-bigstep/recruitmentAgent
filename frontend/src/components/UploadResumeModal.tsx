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
  Alert,
} from '@mui/material';
import axios from 'axios';

interface UploadResumeModalProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
}

const UploadResumeModal: React.FC<UploadResumeModalProps> = ({ open, onClose, jobId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.zip')) {
      setFile(selectedFile);
    } else {
      setSnackbarMessage('Please select a .zip file.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setFile(null);
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
        `http://localhost:5000/api/jobs/upload/${jobId}`,
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
        setSnackbarMessage('Upload complete and resumes processed successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        onClose(); // close modal
        setFile(null);
        setProgress(0);
      } else {
        throw new Error('Server responded with failure.');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setSnackbarMessage('Upload failed. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setUploading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
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
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default UploadResumeModal;
