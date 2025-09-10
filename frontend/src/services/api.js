import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
  verifyToken: () => api.get('/auth/verify-token'),
};

// Booking API
export const bookingAPI = {
  getBookings: (params) => api.get('/bookings', { params }),
  getBookingById: (id) => api.get(`/bookings/${id}`),
  getBookingActivities: (id) => api.get(`/bookings/${id}/activities`),
  createBooking: (bookingData) => api.post('/bookings', bookingData),
  updateBooking: (id, bookingData) => api.put(`/bookings/${id}`, bookingData),
  cancelBooking: (id, reason) => api.patch(`/bookings/${id}/cancel`, { reason }),
  exportBookings: (params) => api.get('/bookings/export', { 
    params,
    responseType: 'blob'
  }),
  exportBookingActivities: (id) => api.get(`/bookings/${id}/activities/export`, {
    responseType: 'blob'
  }),
};

// Vehicle API
export const vehicleAPI = {
  getVehicles: (params) => api.get('/vehicles', { params }),
  getVehicleById: (id) => api.get(`/vehicles/${id}`),
  createVehicle: (vehicleData) => api.post('/vehicles', vehicleData),
  updateVehicle: (id, vehicleData) => api.put(`/vehicles/${id}`, vehicleData),
  deleteVehicle: (id) => api.delete(`/vehicles/${id}`),
};

// Driver API
export const driverAPI = {
  getDrivers: (params) => api.get('/drivers', { params }),
  getDriverById: (id) => api.get(`/drivers/${id}`),
  createDriver: (driverData) => api.post('/drivers', driverData),
  updateDriver: (id, driverData) => api.put(`/drivers/${id}`, driverData),
  deleteDriver: (id) => api.delete(`/drivers/${id}`),
};

// Users API
export const usersAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getUserById: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getChartData: (type) => api.get(`/dashboard/charts/${type}`),
  getVehicleUtilization: (params) => api.get('/dashboard/vehicle-utilization', { params }),
};

// Reports API
export const reportsAPI = {
  exportBookings: (params) => api.get('/reports/export/bookings', { 
    params,
    responseType: 'blob'
  }),
};

// Audit Logs API
export const auditLogsAPI = {
  getAuditLogs: (params) => api.get('/audit-logs', { params }),
  getAuditLogById: (id) => api.get(`/audit-logs/${id}`),
  getStats: (params) => api.get('/audit-logs/stats/summary', { params }),
  getUserActivity: (userId, params) => api.get(`/audit-logs/user/${userId}`, { params }),
  exportAuditLogs: (params) => api.get('/audit-logs/export/data', { 
    params,
    responseType: 'blob'
  }),
};

export default api;


