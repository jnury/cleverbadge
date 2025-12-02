import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../utils/api';

/**
 * ProtectedRoute - Redirects to homepage with login modal trigger if not authenticated
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  if (!isLoggedIn()) {
    // Redirect to home with state to trigger login modal
    return <Navigate to="/" state={{ openLoginModal: true, from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
