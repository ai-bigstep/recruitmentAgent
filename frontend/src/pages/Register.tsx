import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { Snackbar, Alert } from '@mui/material';
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'error' | 'success';
  }>({ open: false, message: '', severity: 'error' });

  const { register, user } = useAuth();
  const navigate = useNavigate();

  // Check if current user is superadmin
  const isSuperadmin = user?.role === 'superadmin';

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateEmail = (email: string) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(formData.email)) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid email address',
        severity: 'error',
      });
      return;
    }

    if (formData.password !== confirmPassword) {
      setSnackbar({
        open: true,
        message: "Passwords don't match",
        severity: 'error',
      });
      return;
    }

    if (formData.password.length < 6) {
      setSnackbar({
        open: true,
        message: 'Password must be at least 6 characters',
        severity: 'error',
      });
      return;
    }

    setLoading(true);

    try {
      if (isSuperadmin) {
        // Superadmin creating a recruiter - use different endpoint
        const token = localStorage.getItem('token');
        await axios.post(`${baseURL}/api/auth/create-recruiter`, {
          ...formData,
          role: 'recruiter'
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setSnackbar({
          open: true,
          message: 'Recruiter created successfully!',
          severity: 'success',
        });
        setTimeout(() => navigate('/alljobs'), 1500);
      } else {
        // Regular user registration
        const success = await register(formData);
        if (success) {
          setSnackbar({
            open: true,
            message: 'Account created successfully!',
            severity: 'success',
          });
          setTimeout(() => navigate('/alljobs'), 1500);
        } else {
          setSnackbar({
            open: true,
            message: 'Registration failed. Please try again.',
            severity: 'error',
          });
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Operation failed. Please try again.';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 -mt-20">
        <div className="bg-zinc-900 p-8 rounded-2xl shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white">
              {isSuperadmin ? 'Create Recruiter' : 'Join BigStep'}
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              {isSuperadmin ? 'Create a new recruiter account' : 'Create your account to get started'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-200 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-800 text-white border border-zinc-700 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full name"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="text"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-800 text-white border border-zinc-700 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 bg-zinc-800 text-white border border-zinc-700 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Create a password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-zinc-800 text-white border border-zinc-700 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Creating...' : isSuperadmin ? 'Create Recruiter' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={handleSnackbarClose}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Register;
