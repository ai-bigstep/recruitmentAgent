import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UploadResumeModal from '../components/UploadResumeModal';

const UploadResumeModalWrapper = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();

  if (!jobId) return null;

  return (
    <UploadResumeModal
      open={true}
      onClose={() => navigate(-1)} // go back
      jobId={jobId}
    />
  );
};

export default UploadResumeModalWrapper;
