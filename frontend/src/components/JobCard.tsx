import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Box,
  Divider,
} from '@mui/material';
import { Edit, Trash2, MoreVertical } from 'lucide-react';
import { useTheme } from '@mui/material/styles';

import { useNavigate } from 'react-router-dom';

// Inside JobCard component:






interface JobCardProps {
  title: string;
  candidateCount: number;
  jobId: string;
  onDelete: (id: string) => void;
}

const JobCard = ({ title, candidateCount, jobId, onDelete }: JobCardProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const theme = useTheme();
  const navigate = useNavigate();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Card
      sx={{
        maxWidth: 360,
        width: '100%',
        borderRadius: 3,
        boxShadow: 4,
        position: 'relative',
        bgcolor: 'background.paper',
      }}
    >
      <Box position="absolute" top={8} right={8}>
        <IconButton onClick={handleMenuOpen}>
          <MoreVertical size={20} />
        </IconButton>
      </Box>

      <CardContent>
        {/* Title Centered */}
        <Typography
  variant="body1"
  align="center"
  fontWeight="bold"
  gutterBottom
  sx={{
    color: theme.palette.primary.main,
    fontSize: '1.25rem',
    lineHeight: 1.5,
    mb: 2,
  }}
>
  {title}
</Typography>

        <Divider sx={{ mb: 3 }} />

        {/* Candidate Avatar */}
        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
          <Avatar
            sx={{
              width: 96,
              height: 96,
              bgcolor: 'primary.light',
              border: '2px solid',
              borderColor: 'primary.main',
              fontSize: 32,
              fontWeight: 500,
              color: 'primary.dark',
            }}
          >
            {candidateCount}
          </Avatar>
          <Typography variant="body1" color="text.secondary">
            Candidates
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Stack direction="row" spacing={1} mt={4}>
          <Button
            onClick={() => navigate(`/editjob/${jobId}`)}
            variant="outlined"
            startIcon={<Edit size={16} />}
            fullWidth
            size="small"
            sx={{ borderColor: 'primary.main', color: 'primary.main' }}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Trash2 size={16} />}
            fullWidth
            size="small"
            onClick={() => onDelete(jobId)}
          >
            Delete
          </Button>
        </Stack>
      </CardContent>

      {/* Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => {navigate(`/job/applicant/${jobId}`);}}>View Applicants</MenuItem>
        <MenuItem onClick={() => {navigate(`/job/upload/${jobId}`);}}>Upload Resume</MenuItem>
        
      </Menu>
    </Card>
  );
};

export default JobCard;
