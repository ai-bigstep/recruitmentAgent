import React, { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UploadResumeModal from '../components/UploadResumeModal';

const UploadResumeModalWrapper = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const uploadSuccess = useRef(false);

  if (!jobId) return null;

  const handleClose = () => {
    // Only navigate back if the modal is closed without successful upload
    if (!uploadSuccess.current) {
      navigate(-1);
    }
  };

  const handleSuccess = () => {
    uploadSuccess.current = true;
  };

  return (
    <UploadResumeModal
      open={true}
      onClose={handleClose}
      onSuccess={handleSuccess}
      jobId={jobId}
    />
  );
};

export default UploadResumeModalWrapper;
