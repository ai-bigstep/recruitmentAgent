import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper } from '@mui/material';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null; // just a guard (route should already be protected)

  return (
    <Box sx={{ maxWidth: 480, ml: 4, mt: 6, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Dashboard
      </Typography>
      <Paper elevation={2} sx={{ p: 2, mb: 2, width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ minWidth: 80 }}>
            Name:
          </Typography>
          <Typography variant="body1">{user.name}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ minWidth: 80 }}>
            Email:
          </Typography>
          <Typography variant="body1">{user.email}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ minWidth: 80 }}>
            Role:
          </Typography>
          <Typography variant="body1">
            {(user.role === 'superadmin' || user.role === 'recruiter')
              ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()
              : user.role}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Home;