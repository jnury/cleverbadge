import React from 'react';
import { Navigate } from 'react-router-dom';
import { isLoggedIn } from '../utils/api';

/**
 * ProtectedRoute - Redirects to login if not authenticated
 */
const ProtectedRoute = ({ children }) => {
  if (!isLoggedIn()) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
