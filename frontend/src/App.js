import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import NavigationBar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Booking Components
import BookingForm from './components/BookingForm';
import BookingList from './components/BookingList';
import BookingDetail from './components/BookingDetail';
import BookingEdit from './components/BookingEdit';

// Admin Components
import ApprovalManagement from './components/ApprovalManagement';
import VehicleManagement from './components/VehicleManagement';
import DriverManagement from './components/DriverManagement';
import UserProfile from './components/UserProfile';
import Reports from './components/Reports';
import AuditLogs from './components/AuditLogs';
import UserManagement from './components/UserManagement';

// Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';
// Font Awesome (for icons)
import '@fortawesome/fontawesome-free/css/all.min.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            
            {/* Protected Routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <NavigationBar />
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* Booking Routes */}
            <Route path="/bookings" element={
              <ProtectedRoute>
                <NavigationBar />
                <BookingList />
              </ProtectedRoute>
            } />
            
            <Route path="/bookings/create" element={
              <ProtectedRoute requiredRole={['employee', 'admin']}>
                <NavigationBar />
                <BookingForm />
              </ProtectedRoute>
            } />
            
            <Route path="/bookings/:id" element={
              <ProtectedRoute>
                <NavigationBar />
                <BookingDetail />
              </ProtectedRoute>
            } />
            
            <Route path="/bookings/:id/edit" element={
              <ProtectedRoute>
                <NavigationBar />
                <BookingEdit />
              </ProtectedRoute>
            } />
            
            <Route path="/approvals" element={
              <ProtectedRoute requiredRole={['approver_l1', 'approver_l2']}>
                <NavigationBar />
                <ApprovalManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/vehicles" element={
              <ProtectedRoute requiredRole="admin">
                <NavigationBar />
                <VehicleManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/drivers" element={
              <ProtectedRoute requiredRole="admin">
                <NavigationBar />
                <DriverManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/users" element={
              <ProtectedRoute requiredRole="admin">
                <NavigationBar />
                <UserManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/reports" element={
              <ProtectedRoute requiredRole="admin">
                <NavigationBar />
                <Reports />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/audit-logs" element={
              <ProtectedRoute requiredRole="admin">
                <NavigationBar />
                <AuditLogs />
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <NavigationBar />
                <UserProfile />
              </ProtectedRoute>
            } />
            
            {/* 404 and Unauthorized */}
            <Route path="/unauthorized" element={
              <div className="container mt-5 text-center">
                <h2>Access Denied</h2>
                <p>You don't have permission to access this page.</p>
              </div>
            } />
            
            <Route path="*" element={
              <div className="container mt-5 text-center">
                <h2>Page Not Found</h2>
                <p>The page you're looking for doesn't exist.</p>
              </div>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

// Component to redirect authenticated users away from login page
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? <Navigate to="/dashboard" replace /> : children;
};

export default App;
