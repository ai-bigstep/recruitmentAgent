// pages/ResetPassword.tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/reset-password', {
        token,
        password,
      });
      setMessage(res.data.message);
      setTimeout(() => navigate('/login'), 3000); // Redirect to login
    } catch (error) {
      setMessage('Error resetting password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <form onSubmit={handleReset} className="bg-zinc-900 p-8 rounded-lg w-full max-w-md space-y-4">
        <h2 className="text-2xl font-bold">Reset Your Password</h2>
        <input
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-medium"
        >
          Reset Password
        </button>
        {message && <p className="text-center text-sm text-gray-300">{message}</p>}
      </form>
    </div>
  );
};

export default ResetPassword;
