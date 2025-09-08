#!/bin/bash

# Vehicle Booking System - Start Services Script
echo "🚀 Starting Vehicle Booking System..."
echo "=================================="

# Check if PostgreSQL is running
if ! brew services list | grep -q "postgresql@14.*started"; then
    echo "📊 Starting PostgreSQL..."
    brew services start postgresql@14
    sleep 2
fi

# Start backend server
echo "🖥️  Starting Backend Server..."
cd backend
export PATH="/usr/local/opt/postgresql@14/bin:$PATH"

# Start backend in background
PORT=5001 node server.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend started with PID: $BACKEND_PID"

# Wait a moment for backend to start
sleep 3

# Check if backend is responding
if curl -s http://localhost:5001/api/health > /dev/null; then
    echo "   ✅ Backend is responding on port 5001"
else
    echo "   ❌ Backend failed to start"
    exit 1
fi

# Start frontend server
echo "🌐 Starting Frontend Server..."
cd ../frontend

# Start frontend in background
npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend started with PID: $FRONTEND_PID"

# Create logs directory if it doesn't exist
mkdir -p ../logs

# Save PIDs for later use
echo $BACKEND_PID > ../logs/backend.pid
echo $FRONTEND_PID > ../logs/frontend.pid

echo ""
echo "🎉 Services Started Successfully!"
echo "================================"
echo "📱 Frontend:  http://localhost:3000"
echo "🔧 Backend:   http://localhost:5001"
echo "🏥 Health:    http://localhost:5001/api/health"
echo ""
echo "📋 Login Credentials:"
echo "   Admin:    admin@miningcompany.com / admin123"
echo "   Employee: mike.employee@miningcompany.com / employee123"
echo ""
echo "📊 Process IDs:"
echo "   Backend PID:  $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "📝 Logs:"
echo "   Backend:  logs/backend.log"
echo "   Frontend: logs/frontend.log"
echo ""
echo "To stop services, run: ./stop-services.sh"




