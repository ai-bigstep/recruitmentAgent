// App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import CreateJob from './pages/CreateJob';
 import AllJobs from './pages/AllJobs';

 

import PrivateRoute from './components/PrivateRoute';
import Dashboard from './components/Dashboard';
import UploadResumeModalWrapper from './pages/UploadResumeModalWrapper';
import ApplicationDetail from './components/ApplicationDetail';
import EditJob from './pages/EditJob';


const App: React.FC = () => {

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Private Routes under Dashboard */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="alljobs" element={<AllJobs />} />
            <Route path="createjob" element={<CreateJob />} />
            <Route path="job/upload/:jobId" element={<UploadResumeModalWrapper />} />
            <Route path="job/applicant/:jobId" element={<ApplicationDetail />} />
            <Route path="/editjob/:id" element={<EditJob />} />
          </Route>

          


          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Fallback */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center text-xl font-semibold">
                404 - Page Not Found
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
