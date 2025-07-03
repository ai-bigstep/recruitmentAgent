// src/components/PrivateRoute.tsx
// import React from 'react';
// import { Navigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';

// const PrivateRoute = ({ children }: { children: JSX.Element }) => {
//   const { user, loading } = useAuth();

//   if (loading) return <div>Loading...</div>; // wait before checking user

//   return user ? children : <Navigate to="/login" />;
// };

// export default PrivateRoute;


import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<Props> = ({ children }) => {
  const { user ,loading } = useAuth();
  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

export default PrivateRoute;

