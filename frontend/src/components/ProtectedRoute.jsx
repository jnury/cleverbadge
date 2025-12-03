import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../utils/api';

/**
 * ProtectedRoute - Redirects to login page if not authenticated
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  if (!isLoggedIn()) {
    // Redirect to login page, preserving the original destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
