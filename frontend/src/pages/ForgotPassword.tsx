import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Snackbar, Alert } from '@mui/material';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'error' | 'success';
  }>({ open: false, message: '', severity: 'error' });

  const validateEmail = (email: string) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email) {
      setSnackbar({
        open: true,
        message: 'Email is required.',
        severity: 'error',
      });
      setLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid email address.',
        severity: 'error',
      });
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${baseURL}/api/auth/forgot-password`, { email });
      setSubmitted(true);
      setSnackbar({
        open: true,
        message: 'Password reset link sent to your email.',
        severity: 'success',
      });
    } catch (err) {
      console.error('Error sending reset link:', err);
      setSnackbar({
        open: true,
        message: 'Failed to send reset link. Please try again.',
        severity: 'error',
      });
    }

    setLoading(false);
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-zinc-900 p-10 rounded-3xl shadow-2xl">
          <h2 className="text-2xl font-bold text-white text-center mb-6">
            Forgot Password
          </h2>

          {submitted ? (
            <p className="text-green-400 text-center">
              A password reset link has been sent to your email.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Email Address
                </label>
                <input
                  type="text" // ✅ no browser validation
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 text-white border border-zinc-700 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-blue-400 hover:text-blue-600">
              Back to login
            </Link>
          </div>
        </div>
      </div>

      {/* ✅ Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={handleSnackbarClose} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ForgotPassword;
