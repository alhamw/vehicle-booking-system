const express = require('express');
const cors = require('cors');

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
    message: 'Vehicle Booking System API is running (Simple Test Mode)',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    port: process.env.PORT || 5001
  });
});

// Mock auth endpoint for testing
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt:', { email, password });
  
  // Mock authentication for demo
  if (email === 'admin@miningcompany.com' && password === 'admin123') {
    return res.json({
      message: 'Login successful (Test Mode)',
      user: {
        id: 1,
        name: 'System Admin',
        email: 'admin@miningcompany.com',
        role: 'admin',
        department: 'IT'
      },
      token: 'mock_jwt_token_admin'
    });
  }
  
  if (email === 'mike.employee@miningcompany.com' && password === 'employee123') {
    return res.json({
      message: 'Login successful (Test Mode)',
      user: {
        id: 2,
        name: 'Mike Employee',
        email: 'mike.employee@miningcompany.com',
        role: 'employee',
        department: 'Mining'
      },
      token: 'mock_jwt_token_employee'
    });
  }
  
  res.status(401).json({
    error: 'Invalid credentials',
    message: 'Use admin@miningcompany.com/admin123 or mike.employee@miningcompany.com/employee123'
  });
});

// Mock token verification
app.get('/api/auth/verify-token', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token === 'mock_jwt_token_admin') {
    return res.json({
      valid: true,
      user: {
        id: 1,
        name: 'System Admin',
        email: 'admin@miningcompany.com',
        role: 'admin',
        department: 'IT'
      }
    });
  }
  
  if (token === 'mock_jwt_token_employee') {
    return res.json({
      valid: true,
      user: {
        id: 2,
        name: 'Mike Employee',
        email: 'mike.employee@miningcompany.com',
        role: 'employee',
        department: 'Mining'
      }
    });
  }
  
  res.status(401).json({ error: 'Invalid token' });
});

// Mock bookings endpoint
app.get('/api/bookings', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token || (!token.includes('admin') && !token.includes('employee'))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.json({
    bookings: [
      {
        id: 1,
        purpose: 'Site inspection at North Mine',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24*60*60*1000).toISOString(),
        status: 'pending',
        priority: 'medium',
        vehicle: {
          id: 1,
          plate_number: 'MIN-001',
          make: 'Ford',
          model: 'F-350',
          type: 'truck'
        },
        user: {
          id: 2,
          name: 'Mike Employee',
          email: 'mike.employee@miningcompany.com'
        }
      },
      {
        id: 2,
        purpose: 'Equipment transport to Site B',
        start_date: new Date(Date.now() + 2*24*60*60*1000).toISOString(),
        end_date: new Date(Date.now() + 3*24*60*60*1000).toISOString(),
        status: 'approved',
        priority: 'high',
        vehicle: {
          id: 2,
          plate_number: 'MIN-002',
          make: 'Caterpillar',
          model: '320',
          type: 'excavator'
        },
        user: {
          id: 2,
          name: 'Mike Employee',
          email: 'mike.employee@miningcompany.com'
        }
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 2,
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
        year: 2022,
        status: 'available',
        fuel_type: 'diesel'
      },
      {
        id: 2,
        plate_number: 'MIN-002',
        type: 'excavator',
        make: 'Caterpillar',
        model: '320',
        year: 2021,
        status: 'available',
        fuel_type: 'diesel'
      },
      {
        id: 3,
        plate_number: 'MIN-003',
        type: 'van',
        make: 'Toyota',
        model: 'Hiace',
        year: 2023,
        status: 'maintenance',
        fuel_type: 'petrol'
      }
    ]
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log('🚀 Simple Server running on http://localhost:' + PORT);
  console.log('📊 Health check: http://localhost:' + PORT + '/api/health');
  console.log('🔐 Frontend: http://localhost:3000');
  console.log('');
  console.log('🧪 TEST MODE - No database required');
  console.log('Node.js version:', process.version);
  console.log('');
  console.log('Demo accounts:');
  console.log('  Admin: admin@miningcompany.com / admin123');
  console.log('  Employee: mike.employee@miningcompany.com / employee123');
});



