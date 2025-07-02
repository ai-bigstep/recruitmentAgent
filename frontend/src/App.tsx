import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import CreateEditJobPage from './components/CreateEditJobPage'; // update path if needed

import JobDisplay from './components/JobDisplay';
import PrivateRoute from './components/PrivateRoute';
const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Home with Job Display - Protected */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <>
                  <Home />
                  
                  <JobDisplay />
                </>
              </PrivateRoute>
            }
          />

          {/* Create/Edit Job Page - Protected */}
          <Route
            path="/create-job"
            element={
              <PrivateRoute>
                <CreateEditJobPage />
              </PrivateRoute>
            }
          />

          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Fallback Route */}
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
