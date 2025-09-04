const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json());

// Test routes without database
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Vehicle Booking System API is running (Test Mode)',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    note: 'Running without database connection for testing'
  });
});

// Mock auth endpoint for testing
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock authentication for demo
  const mockUsers = {
    'admin@miningcompany.com': {
      id: 1,
      name: 'System Admin',
      email: 'admin@miningcompany.com',
      role: 'admin',
      department: 'IT'
    },
    'mike.employee@miningcompany.com': {
      id: 2,
      name: 'Mike Employee',
      email: 'mike.employee@miningcompany.com',
      role: 'employee',
      department: 'Mining'
    }
  };
  
  if (mockUsers[email] && (password === 'admin123' || password === 'employee123')) {
    res.json({
      message: 'Login successful (Test Mode)',
      user: mockUsers[email],
      token: 'mock_jwt_token_for_testing'
    });
  } else {
    res.status(401).json({
      error: 'Invalid credentials',
      message: 'Use admin@miningcompany.com/admin123 or mike.employee@miningcompany.com/employee123'
    });
  }
});

// Mock token verification
app.get('/api/auth/verify-token', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token === 'mock_jwt_token_for_testing') {
    res.json({
      valid: true,
      user: {
        id: 1,
        name: 'Test User',
        email: 'admin@miningcompany.com',
        role: 'admin',
        department: 'IT'
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Mock bookings endpoint
app.get('/api/bookings', (req, res) => {
  res.json({
    bookings: [
      {
        id: 1,
        purpose: 'Site inspection',
        start_date: new Date().toISOString(),
        status: 'pending',
        priority: 'medium',
        vehicle: {
          plate_number: 'MIN-001',
          make: 'Ford',
          model: 'F-350'
        }
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      pages: 1
    }
  });
});

// Mock vehicles endpoint
app.get('/api/vehicles', (req, res) => {
  res.json({
    vehicles: [
      {
        id: 1,
        plate_number: 'MIN-001',
        type: 'truck',
        make: 'Ford',
        model: 'F-350',
        status: 'available'
      },
      {
        id: 2,
        plate_number: 'MIN-002',
        type: 'excavator',
        make: 'Caterpillar',
        model: '320',
        status: 'available'
      }
    ]
  });
});

// Catch all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    note: 'This is a test server - some routes may not be implemented'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Test Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Frontend: http://localhost:3000`);
  console.log(`\n🧪 TEST MODE - No database required`);
  console.log(`Demo accounts:`);
  console.log(`  Admin: admin@miningcompany.com / admin123`);
  console.log(`  Employee: mike.employee@miningcompany.com / employee123`);
});

module.exports = app;



