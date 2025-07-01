import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, PlusCircle } from 'lucide-react';
import CreateEditJobPage from '../components/CreateEditJobPage';
const Home = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const handleAddJob = () => {
    <CreateEditJobPage />;
    navigate('/create-job'); // Navigate to the job creation page
  };

  if (!user) return null; // just a guard (route should already be protected)

  return (
    <div className="p-6 max-w-xl mx-auto text-center">
      <h1 className="text-2xl font-bold mb-4">Welcome to your Dashboard</h1>
      <p className="mb-2">👤 <strong>Email:</strong> {user.email}</p>
      <p className="mb-4">🔐 <strong>Role:</strong> {user.role}</p>
      <div className="flex justify-center gap-4 mt-6">
  <button
    onClick={handleLogout}
    className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg shadow transition"
  >
    <LogOut className="w-5 h-5" />
    Logout
  </button>

  <button
    onClick={handleAddJob}
    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition"
  >
    <PlusCircle className="w-5 h-5" />
    Add Job
  </button>
</div>
    </div>
  );
};

export default Home;
