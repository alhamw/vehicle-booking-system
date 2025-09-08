# Vehicle Booking and Monitoring System

A comprehensive web-based vehicle booking and monitoring system designed for mining companies operating in multiple regions. The system enables employees to request vehicles with multi-level approval workflows and provides comprehensive dashboards for fleet management.

## 🚀 Features

### Core Features
- **Multi-role User Management**: Employee, Approver L1/L2, Admin roles
- **Vehicle Booking System**: Request vehicles with purpose, dates, and priorities
- **Multi-level Approval Workflow**: Minimum 2-level approval process
- **Fleet Management**: Manage vehicles, drivers, and assignments
- **Dashboard & Analytics**: Vehicle utilization, statistics, and trends
- **Audit Trail**: Complete activity logging and monitoring
- **Export Functionality**: Excel export of booking activities and reports
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### User Roles & Permissions
- **Employee**: Request vehicle usage, view own bookings
- **Approver L1**: First-level approval, view department bookings
- **Approver L2**: Second-level approval, cross-department access
- **Admin (Fleet Manager)**: Full system access, assign drivers, manage fleet

### Dashboard Features
- Vehicle usage statistics and trends
- Top 5 most frequently used vehicles
- Active bookings and vehicle availability
- Service schedules and maintenance tracking
- Customizable date range filters

### Export Features
- **Booking Activity Export**: Excel export of all booking activities
- **Detailed Audit Trail**: Complete history of booking changes
- **Human-Readable Format**: Field names and values are formatted for readability
- **Admin-Only Access**: Export functionality restricted to administrators
- **Automatic Download**: Files download automatically with timestamped names

## 🏗️ Technology Stack

### Backend
- **Framework**: Node.js with Express.js
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting
- **API Documentation**: RESTful APIs
- **Architecture**: SOLID Principles, Service Layer Pattern, Repository Pattern
- **Export**: Excel file generation with ExcelJS

### Frontend
- **Framework**: React.js 19.x
- **UI Library**: React Bootstrap
- **Routing**: React Router v6
- **Charts**: Chart.js with react-chartjs-2
- **HTTP Client**: Axios
- **Icons**: Font Awesome

## 🏛️ Architecture & Design Principles

### SOLID Principles Implementation

The system follows SOLID principles for maintainable and scalable code:

#### **S - Single Responsibility Principle (SRP)**
- **Controllers**: Handle only HTTP request/response logic
- **Services**: Contain business logic and orchestration
- **Repositories**: Manage data access operations
- **Export Services**: Handle specific export functionality

#### **O - Open/Closed Principle (OCP)**
- Services are open for extension but closed for modification
- New export formats can be added without changing existing code
- Repository pattern allows easy addition of new data sources

#### **L - Liskov Substitution Principle (LSP)**
- Repository interfaces can be substituted with different implementations
- Service classes can be mocked for testing without breaking functionality

#### **I - Interface Segregation Principle (ISP)**
- Separate repositories for different entities (Booking, Vehicle, User)
- Focused service classes with specific responsibilities
- Clean separation between export and business logic

#### **D - Dependency Inversion Principle (DIP)**
- Controllers depend on service abstractions, not concrete implementations
- Services depend on repository interfaces, not database implementations
- Dependency injection enables easy testing and configuration

### Architecture Layers

```
┌─────────────────────────────────────┐
│           Presentation Layer        │
│         (Controllers)               │
├─────────────────────────────────────┤
│           Business Layer            │
│          (Services)                 │
├─────────────────────────────────────┤
│           Data Access Layer         │
│        (Repositories)               │
├─────────────────────────────────────┤
│           Database Layer            │
│        (Sequelize Models)           │
└─────────────────────────────────────┘
```

### Service Layer Pattern

- **BookingService**: Orchestrates booking business logic
- **BookingActivityExportService**: Handles Excel export functionality
- **Repository Pattern**: Abstracts data access operations

### Database Schema
- Users (id, name, email, password, role, department)
- Vehicles (id, plate_number, type, status, fuel_type, service_dates)
- Drivers (id, name, license_number, status, experience)
- Bookings (id, user_id, vehicle_id, driver_id, purpose, dates, status)
- Approvals (id, booking_id, approver_id, level, status, timestamp)
- AuditLogs (id, user_id, action, entity_type, old/new_values)

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js**: Version 14.x or higher
- **npm**: Version 6.x or higher
- **MySQL**: Version 8.0 or higher
- **Git**: For version control

## 🛠️ Installation Guide

### 1. Clone the Repository
```bash
git clone <repository-url>
cd vehicle-booking-system
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp env.example .env

# Update .env with your database credentials
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=vehicle_booking_db
# DB_USER=your_mysql_username
# DB_PASSWORD=your_mysql_password
# JWT_SECRET=your_secure_jwt_secret_key
```

### 3. Database Setup

```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE vehicle_booking_db;
exit

# Run database seeding (creates tables and sample data)
npm run seed
```

### 4. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Create environment file
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
```

### 5. Start the Application

```bash
# Terminal 1: Start Backend Server
cd backend
npm run dev

# Terminal 2: Start Frontend Development Server
cd frontend
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## 👤 Default User Accounts

The system comes with pre-configured demo accounts:

| Role | Email | Password | Access Level |
|------|--------|----------|--------------|
| **Admin** | admin@miningcompany.com | admin123 | Full system access |
| **Approver L1** | john.supervisor@miningcompany.com | approver123 | Department approvals |
| **Approver L2** | sarah.manager@miningcompany.com | approver123 | Cross-department approvals |
| **Employee** | mike.employee@miningcompany.com | employee123 | Request vehicles |
| **Employee** | lisa.worker@miningcompany.com | employee123 | Request vehicles |

## 📊 System Specifications

### Framework Versions
- **Node.js**: 14.17.0+
- **React**: 19.1.1
- **Express**: 5.1.0
- **MySQL**: 8.0+
- **Sequelize**: 6.37.7

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `GET /api/auth/verify-token` - Verify JWT token

#### Bookings
- `GET /api/bookings` - List bookings (with filters)
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id` - Update booking
- `PATCH /api/bookings/:id/cancel` - Cancel booking

#### Vehicles
- `GET /api/vehicles` - List all vehicles
- `GET /api/vehicles/:id` - Get vehicle details
- `POST /api/vehicles` - Create vehicle (Admin only)
- `PUT /api/vehicles/:id` - Update vehicle (Admin only)

#### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/charts/:type` - Chart data

## 🎮 Service Management

### 🚀 EASIEST WAY - Master Control Script (RECOMMENDED)

The foolproof way that always works from any directory:

```bash
# Navigate to project directory (IMPORTANT!)
cd "/Users/styletheory/Documents/Project-Web/test cursor/vehicle-booking-system"

# Start everything
./run-system.sh start

# Check status
./run-system.sh status

# Stop everything
./run-system.sh stop

# View available commands
./run-system.sh
```

### 📱 Even Easier - Double-click Launcher

From Finder, double-click: `launch-vehicle-system.command`

### 🔧 Manual Method (Alternative)

#### Method 1: Development Mode

**Backend Server:**
```bash
# Terminal 1: Navigate to backend directory
cd backend

# Set PostgreSQL path (macOS with Homebrew)
export PATH="/usr/local/opt/postgresql@14/bin:$PATH"

# Start backend server with database
PORT=5001 node server.js
# OR using nodemon for auto-restart
npm run dev
```

**Frontend Server:**
```bash
# Terminal 2: Navigate to frontend directory
cd frontend

# Start React development server
npm start
```

#### Method 2: Background Services

**Start Backend in Background:**
```bash
cd backend
export PATH="/usr/local/opt/postgresql@14/bin:$PATH"
nohup PORT=5001 node server.js > server.log 2>&1 &
```

**Start Frontend in Background:**
```bash
cd frontend
nohup npm start > frontend.log 2>&1 &
```

### Stopping the Services

#### Stop All Services (Quick Method)
```bash
# Stop all Node.js processes related to the project
pkill -f "node server.js"
pkill -f "react-scripts"
pkill -f "npm start"
```

#### Stop Individual Services
```bash
# Stop backend server
pkill -f "node server.js"

# Stop frontend React server
pkill -f "react-scripts"

# Alternative: Find and kill by port
# Backend (port 5001)
lsof -ti:5001 | xargs kill -9

# Frontend (port 3000)
lsof -ti:3000 | xargs kill -9
```

#### Stop Background Services
```bash
# If running as background processes, find PIDs
ps aux | grep "node server.js"
ps aux | grep "react-scripts"

# Kill by PID (replace XXXX with actual PID)
kill XXXX
```

### Service Status Check

**Check if services are running:**
```bash
# Check backend (should return JSON health status)
curl http://localhost:5001/api/health

# Check frontend (should return HTML)
curl http://localhost:3000

# Check what's running on ports
lsof -i :3000 -i :5001

# List all Node.js processes
ps aux | grep node
```

### Service Management Scripts

Create these helper scripts in the project root:

**start-services.sh:**
```bash
#!/bin/bash
echo "Starting Vehicle Booking System..."

# Start backend
cd backend
export PATH="/usr/local/opt/postgresql@14/bin:$PATH"
PORT=5001 node server.js &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Start frontend
cd ../frontend
npm start &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo "Services started!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:5001"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
```

**stop-services.sh:**
```bash
#!/bin/bash
echo "Stopping Vehicle Booking System..."

# Stop all related processes
pkill -f "node server.js"
pkill -f "react-scripts"
pkill -f "npm start"

echo "All services stopped!"
```

Make scripts executable:
```bash
chmod +x start-services.sh stop-services.sh
```

### Troubleshooting Service Issues

**Backend won't start:**
```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL if not running
brew services start postgresql@14

# Check database connection
psql vehicle_booking_db -c "SELECT 1;"

# Check backend logs
cd backend
node server.js  # Run in foreground to see errors
```

**Frontend won't start:**
```bash
# Check React dependencies
cd frontend
npm install

# Clear React cache
rm -rf node_modules/.cache
npm start

# Check for port conflicts
lsof -i :3000
```

**Port conflicts:**
```bash
# Change backend port in .env file
echo "PORT=5002" >> backend/.env

# Update frontend API URL
echo "REACT_APP_API_URL=http://localhost:5002/api" > frontend/.env
```

### Production Deployment

**Using PM2 (Process Manager):**
```bash
# Install PM2 globally
npm install -g pm2

# Start services with PM2
cd backend
pm2 start server.js --name "vehicle-booking-backend"

cd ../frontend
pm2 start npm --name "vehicle-booking-frontend" -- start

# View running processes
pm2 list

# Stop services
pm2 stop vehicle-booking-backend
pm2 stop vehicle-booking-frontend

# Restart services
pm2 restart all
```

### Docker Deployment (Advanced)

**Backend Dockerfile:**
```dockerfile
FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5001
CMD ["node", "server.js"]
```

**Frontend Dockerfile:**
```dockerfile
FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5001:5001"
    environment:
      - DB_HOST=postgres
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=vehicle_booking_db
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=vehicle_booking_db
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify MySQL is running
   - Check database credentials in .env
   - Ensure database exists

2. **Port Already in Use**
   - Change PORT in backend .env file
   - Update REACT_APP_API_URL in frontend .env

3. **JWT Token Issues**
   - Clear browser localStorage
   - Check JWT_SECRET in backend .env

4. **CORS Errors**
   - Verify frontend URL in backend CORS configuration
   - Check API_URL in frontend environment

### Reset Database
```bash
cd backend
npm run seed  # This will drop and recreate all tables
```

## 📈 Future Enhancements

- **Reporting**: Excel export functionality
- **Real-time Notifications**: WebSocket integration
- **Mobile App**: React Native companion app
- **GPS Tracking**: Vehicle location monitoring
- **Maintenance Scheduling**: Automated service reminders
- **Fuel Management**: Advanced fuel tracking and analytics

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation for common solutions

## 🙏 Acknowledgments

- Built with modern web technologies
- Designed for mining industry requirements
- Responsive and user-friendly interface
- Comprehensive audit trail and security features
