// components/Dashboard.tsx
import * as React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { createTheme } from '@mui/material/styles';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BarChartIcon from '@mui/icons-material/BarChart';
import LayersIcon from '@mui/icons-material/Layers';
import { AppProvider, type Navigation } from '@toolpad/core/AppProvider';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';

const navigation: Navigation = [
  { kind: 'header', title: 'Main' },
  {
    segment: '',
    title: 'Dashboard',
    icon: <DashboardIcon />,
    onClick: () => {},
  },
  { kind: 'divider' },
  { kind: 'header', title: 'Jobs' },
  {
    segment: 'alljobs',
    title: 'All Jobs',
    icon: <BarChartIcon />,
    onClick: () => {},
  },
  {
    segment: 'createjob',
    title: 'Create Job',
    icon: <LayersIcon />,
    onClick: () => {},
  },
];

const demoTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-toolpad-color-scheme',
  },
  colorSchemes: { light: true, dark: true },
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

  const updatedNavigation = navigation.map((item) => {
    if (item.kind || !item.segment) return item;
    return {
      ...item,
      onClick: () => navigate(`/${item.segment}`),
    };
  });

  return (
    <AppProvider
      navigation={updatedNavigation}
      branding={{
        logo: (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img src="/bigstep-logo.png" alt="BigStep logo" height={32} />
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{ color: (theme) => theme.palette.primary.main, display: { xs: 'none', sm: 'block' } }}
            >
              BigStep
            </Typography>
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
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </DashboardLayout>
    </AppProvider>
  );
}
