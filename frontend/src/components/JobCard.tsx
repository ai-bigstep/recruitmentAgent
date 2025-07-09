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
        {/* Title and Divider in fixed-height Box */}
        <Box sx={{ height: '4rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Typography
            variant="body1"
            align="center"
            sx={{
              color: theme.palette.primary.main,
              fontSize: '1.25rem',
              fontWeight: 'bold',
              mb: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              wordBreak: 'break-word',
              textAlign: 'center',
              minHeight: '3rem',
              maxWidth: '100%',
            }}
          >
            {title}
          </Typography>
          {/* <Divider /> */}
        </Box>

        {/* Recruiter Info for Superadmin */}
        {recruiter && (
          <Box display="flex" flexDirection="column" alignItems="center" gap={1} mb={2} mt={1}>
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
          <Box sx={{ position: 'relative', width: avatarSize + 44, height: avatarSize + 36, display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
            <svg width={avatarSize + 44} height={avatarSize + 44}>
              <circle
                cx={(avatarSize + 44) / 2}
                cy={(avatarSize + 36) / 2}
                r={(avatarSize + 38) / 2 - 7}
                stroke="#0074b8"
                strokeWidth="7"
                fill="white"
              />
              <path
                d="M {(avatarSize + 24) / 2},6
           a {(avatarSize + 24) / 2 - 6},{(avatarSize + 24) / 2 - 6} 0 0,1 30,0"
                stroke="#ff4b6e"
                strokeWidth="7"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            <Box sx={{ position: 'absolute', top: -5, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Typography
                sx={{
                  fontWeight: 400,
                  fontSize: 35,
                  color: '#466276',
                  fontFamily: 'Montserrat, Arial, sans-serif',
                  lineHeight: 1.1,
                }}
              >
                {candidateCount}
              </Typography>
              <Typography
                sx={{
                  fontWeight: 400,
                  fontSize: 18,
                  color: '#466276',
                  fontFamily: 'Montserrat, Arial, sans-serif',
                  lineHeight: 1.1,
                  mt: 0.5,
                }}
              >
                Candidates
              </Typography>
            </Box>
          </Box>
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
