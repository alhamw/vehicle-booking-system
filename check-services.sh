#!/bin/bash

# Vehicle Booking System - Check Services Status Script
echo "🔍 Vehicle Booking System - Service Status"
echo "=========================================="

# Check PostgreSQL
echo "📊 PostgreSQL Status:"
if brew services list | grep -q "postgresql@14.*started"; then
    echo "   ✅ PostgreSQL is running"
else
    echo "   ❌ PostgreSQL is not running"
    echo "   💡 Start with: brew services start postgresql@14"
fi

echo ""

# Check Backend
echo "🖥️  Backend Server (Port 5001):"
if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
    echo "   ✅ Backend is responding"
    # Get response details
    RESPONSE=$(curl -s http://localhost:5001/api/health)
    echo "   📊 Status: $(echo $RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)"
    echo "   🌍 Environment: $(echo $RESPONSE | grep -o '"environment":"[^"]*"' | cut -d'"' -f4)"
else
    echo "   ❌ Backend is not responding"
    
    # Check if something is running on port 5001
    if lsof -i:5001 > /dev/null 2>&1; then
        echo "   ⚠️  Something is running on port 5001 but not responding correctly"
        echo "   🔍 Process: $(lsof -i:5001 | tail -n +2 | awk '{print $1, $2}')"
    else
        echo "   📭 No process running on port 5001"
    fi
fi

echo ""

# Check Frontend
echo "🌐 Frontend Server (Port 3000):"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Frontend is responding"
else
    echo "   ❌ Frontend is not responding"
    
    # Check if something is running on port 3000
    if lsof -i:3000 > /dev/null 2>&1; then
        echo "   ⚠️  Something is running on port 3000 but not responding correctly"
        echo "   🔍 Process: $(lsof -i:3000 | tail -n +2 | awk '{print $1, $2}')"
    else
        echo "   📭 No process running on port 3000"
    fi
fi

echo ""

# Check running Node processes
echo "📦 Node.js Processes:"
NODE_PROCESSES=$(ps aux | grep -E "(node|npm)" | grep -v grep | grep -v "check-services")
if [ -n "$NODE_PROCESSES" ]; then
    echo "$NODE_PROCESSES" | while read line; do
        echo "   🔧 $line"
    done
else
    echo "   📭 No Node.js processes running"
fi

echo ""

# Check PID files
echo "📄 PID Files:"
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "   ✅ Backend PID file exists and process is running (PID: $BACKEND_PID)"
    else
        echo "   ⚠️  Backend PID file exists but process is not running (PID: $BACKEND_PID)"
    fi
else
    echo "   📭 No backend PID file found"
fi

if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "   ✅ Frontend PID file exists and process is running (PID: $FRONTEND_PID)"
    else
        echo "   ⚠️  Frontend PID file exists but process is not running (PID: $FRONTEND_PID)"
    fi
else
    echo "   📭 No frontend PID file found"
fi

echo ""

# Summary
echo "📋 Quick Actions:"
echo "   🚀 Start services:  ./start-services.sh"
echo "   🛑 Stop services:   ./stop-services.sh"
echo "   🌐 Open frontend:   open http://localhost:3000"
echo "   🔧 Check backend:   curl http://localhost:5001/api/health"



