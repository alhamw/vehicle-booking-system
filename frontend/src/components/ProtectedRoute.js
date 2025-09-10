import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !checkRole(user.role, requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

const checkRole = (userRole, requiredRole) => {
  const roleHierarchy = {
    employee: ['employee'],
    approver_l1: ['employee', 'approver_l1'],
    approver_l2: ['employee', 'approver_l1', 'approver_l2'],
    admin: ['employee', 'approver_l1', 'approver_l2', 'admin']
  };

  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole);
  }

  return roleHierarchy[userRole]?.includes(requiredRole) || false;
};

export default ProtectedRoute;



