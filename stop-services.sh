#!/bin/bash

# Vehicle Booking System - Stop Services Script
echo "🛑 Stopping Vehicle Booking System..."
echo "===================================="

# Function to check if process is running
check_process() {
    if ps -p $1 > /dev/null 2>&1; then
        return 0  # Process is running
    else
        return 1  # Process is not running
    fi
}

# Stop services using PIDs if available
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if check_process $BACKEND_PID; then
        echo "🖥️  Stopping Backend Server (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        echo "   ✅ Backend stopped"
    else
        echo "   ℹ️  Backend was not running"
    fi
    rm -f logs/backend.pid
fi

if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if check_process $FRONTEND_PID; then
        echo "🌐 Stopping Frontend Server (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        echo "   ✅ Frontend stopped"
    else
        echo "   ℹ️  Frontend was not running"
    fi
    rm -f logs/frontend.pid
fi

# Fallback: Kill by process name
echo "🔍 Checking for remaining processes..."

# Stop any remaining backend processes
if pkill -f "node server.js" > /dev/null 2>&1; then
    echo "   🖥️  Stopped additional backend processes"
fi

# Stop any remaining React processes
if pkill -f "react-scripts" > /dev/null 2>&1; then
    echo "   🌐 Stopped additional React processes"
fi

# Stop any remaining npm start processes
if pkill -f "npm start" > /dev/null 2>&1; then
    echo "   📦 Stopped additional npm processes"
fi

# Check if ports are now free
sleep 2

if lsof -ti:5001 > /dev/null 2>&1; then
    echo "⚠️  Port 5001 is still in use. Force killing..."
    lsof -ti:5001 | xargs kill -9 > /dev/null 2>&1
fi

if lsof -ti:3000 > /dev/null 2>&1; then
    echo "⚠️  Port 3000 is still in use. Force killing..."
    lsof -ti:3000 | xargs kill -9 > /dev/null 2>&1
fi

echo ""
echo "✅ All Services Stopped!"
echo "======================="
echo "📊 Ports 3000 and 5001 are now available"
echo "📝 Log files preserved in logs/ directory"
echo ""
echo "To start services again, run: ./start-services.sh"






