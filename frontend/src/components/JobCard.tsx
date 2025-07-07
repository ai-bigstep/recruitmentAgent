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
import { useAuth } from '../context/AuthContext';

interface JobCardProps {
  title: string;
  candidateCount: number;
  jobId: string;
  onDelete: (id: string) => void;
  recruiter?: {
    id: string;
    name: string;
    email: string;
  };
}

const JobCard = ({ title, candidateCount, jobId, onDelete, recruiter }: JobCardProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Adjust dimensions based on user role
  const isSuperadmin = !!recruiter;
  const isRecruiter = user?.role === 'recruiter';
  
  let cardWidth, cardHeight, avatarSize, buttonSize, buttonPadding;
  
  if (isSuperadmin) {
    // Superadmin - largest cards
    cardWidth = 300;
    cardHeight = 400;
    avatarSize = 96;
    buttonSize = 'small';
    buttonPadding = 0.5;
  } else if (isRecruiter) {
    // Recruiter - medium cards
    cardWidth = 290;
    cardHeight = 340;
    avatarSize = 88;
    buttonSize = 'small';
    buttonPadding = 0.4;
  } else {
    // Regular user - smallest cards
    cardWidth = 280;
    cardHeight = 350;
    avatarSize = 80;
    buttonSize = 'small';
    buttonPadding = 0.3;
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Card
      sx={{
        width: cardWidth,
        height: cardHeight,
        borderRadius: 3,
        boxShadow: 4,
        position: 'relative',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Box position="absolute" top={8} right={8}>
        <IconButton onClick={handleMenuOpen}>
          <MoreVertical size={20} />
        </IconButton>
      </Box>

      <CardContent>
        {/* Title */}
        <Typography
          variant="body1"
          align="center"
          gutterBottom
          sx={{
            color: theme.palette.primary.main,
            fontSize: '1.25rem',
            fontWeight: 'bold',
            mb: 2,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            wordBreak: 'break-word',
            textAlign: 'center',
            minHeight: '3rem',
          }}
        >
          {title}
        </Typography>

        <Divider sx={{ mb: 3 }} />

        {/* Recruiter Info for Superadmin */}
        {recruiter && (
          <Box display="flex" flexDirection="column" alignItems="center" gap={1} mb={2}>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              Created by
            </Typography>
            <Typography variant="body2" color="primary" fontWeight="medium" textAlign="center">
              {recruiter.name}
            </Typography>
          </Box>
        )}

        {/* Candidate Avatar */}
        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
          <Avatar
            sx={{
              width: avatarSize,
              height: avatarSize,
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
            onClick={() => navigate(`/job/applicant/${jobId}`)}
            variant="outlined"
            fullWidth
            size={buttonSize}
            sx={{ borderColor: 'primary.main', color: 'primary.main', py: buttonPadding }}
          >
            View Applicants
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            size={buttonSize}
            onClick={() => navigate(`/job/upload/${jobId}`)}
            sx={{ py: buttonPadding }}
          >
            Upload Resume
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
        <MenuItem onClick={() => navigate(`/jobdetail/${jobId}`)}>
          View Details
        </MenuItem>
        <MenuItem onClick={() => onDelete(jobId)}>
          Delete
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default JobCard;
