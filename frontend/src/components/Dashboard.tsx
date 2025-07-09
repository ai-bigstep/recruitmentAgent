// components/Dashboard.tsx
import * as React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BarChartIcon from '@mui/icons-material/BarChart';
import LayersIcon from '@mui/icons-material/Layers';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { AppProvider, type Navigation } from '@toolpad/core/AppProvider';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import { ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { createTheme } from '@mui/material/styles';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const demoTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-toolpad-color-scheme',
  },
  colorSchemes: { light: true, dark: false},
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 600,
      lg: 1200,
      xl: 1536,
    },
  },
});



export default function DashboardLayoutBranding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation: Navigation = [
    { kind: 'header', title: 'Main' },
     {
       segment: '',
       title: 'Home',
       icon: <DashboardIcon />,
     },
    { kind: 'divider' },
    { kind: 'header', title: 'Jobs' },
    {
      segment: 'alljobs',
      title: 'All Jobs',
      icon: <BarChartIcon />,
    },
    {
      segment: 'createjob',
      title: 'Create Job',
      icon: <LayersIcon />,
    },
    // Add Create Recruiter option for superadmin
    ...(user?.role === 'superadmin' ? [
      { kind: 'divider' },
      { kind: 'header', title: 'Admin' },
      {
        segment: 'create-recruiter',
        title: 'Create Recruiter',
        icon: <PersonAddIcon />,
      },
    ] : []),
  ];

  // Get the current path segment (e.g., 'alljobs', 'createjob', etc.)
  const currentSegment = location.pathname.split('/')[1] || '';

  const updatedNavigation = navigation.map((item) => {
    if (item.kind || !item.segment) return item;
    return {
      ...item,
      onClick: () => navigate(`/${item.segment}`),
      selected: location.pathname.startsWith(`/${item.segment}`),
    };
  });

  return (
    <AppProvider
      navigation={updatedNavigation}
      branding={{
        logo: (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img src="/bigsteplogo.svg" alt="BigStep logo" height={32} />
          </Box>
        ),
        title: (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none', // Let clicks pass through
            }}
          >
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{ fontSize: '1.5rem', color: (theme) => theme.palette.primary.main, display: { xs: 'none', sm: 'block' } }}
            >
              Recruitment Management System
            </Typography>
          </Box>
        ),
        homeUrl: '/',
        
      }}
      theme={demoTheme}
    >
      <DashboardLayout>
        {/* Sidebar Logout Button for all users, styled like navigation items */}
        <Box
          sx={{
            position: 'fixed',
            left: 0,
            bottom: 0,
            width: 240,
            p: 2,
            zIndex: 1201,
            background: 'inherit',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <ListItem disablePadding sx={{ width: '100%' }}>
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon>
                <LogOut className="w-5 h-5" />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        </Box>
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </DashboardLayout>
    </AppProvider>
  );
}
