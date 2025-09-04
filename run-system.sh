#!/bin/bash

# Vehicle Booking System - Master Control Script
# This script ensures you're always in the right directory and services start correctly

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the absolute path of the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

echo -e "${BLUE}🚀 Vehicle Booking System Control Panel${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "Project Location: ${GREEN}$PROJECT_ROOT${NC}"
echo ""

# Always ensure we're in the correct directory
cd "$PROJECT_ROOT" || {
    echo -e "${RED}❌ Error: Cannot access project directory${NC}"
    exit 1
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to start services
start_services() {
    echo -e "${YELLOW}🔄 Starting Vehicle Booking System...${NC}"
    
    # Check PostgreSQL
    if ! pgrep -x "postgres" > /dev/null; then
        echo -e "${RED}❌ PostgreSQL is not running. Please start PostgreSQL first.${NC}"
        echo -e "${YELLOW}💡 Run: brew services start postgresql@14${NC}"
        return 1
    fi
    
    # Check if ports are already in use
    if check_port 5001; then
        echo -e "${GREEN}✅ Backend already running on port 5001${NC}"
    else
        echo -e "${YELLOW}🖥️  Starting Backend Server...${NC}"
        cd "$PROJECT_ROOT/backend"
        export PATH="/usr/local/opt/postgresql@14/bin:$PATH"
        PORT=5001 nohup node server.js > ../logs/backend.log 2>&1 &
        BACKEND_PID=$!
        cd "$PROJECT_ROOT"
        
        # Wait for backend to start
        sleep 3
        if check_port 5001; then
            echo -e "${GREEN}✅ Backend started successfully (PID: $BACKEND_PID)${NC}"
        else
            echo -e "${RED}❌ Backend failed to start${NC}"
            return 1
        fi
    fi
    
    if check_port 3000; then
        echo -e "${GREEN}✅ Frontend already running on port 3000${NC}"
    else
        echo -e "${YELLOW}🌐 Starting Frontend Server...${NC}"
        cd "$PROJECT_ROOT/frontend"
        nohup npm start > ../logs/frontend.log 2>&1 &
        FRONTEND_PID=$!
        cd "$PROJECT_ROOT"
        
        # Wait for frontend to start
        sleep 5
        if check_port 3000; then
            echo -e "${GREEN}✅ Frontend started successfully (PID: $FRONTEND_PID)${NC}"
        else
            echo -e "${RED}❌ Frontend failed to start${NC}"
            return 1
        fi
    fi
    
    echo ""
    echo -e "${GREEN}🎉 System is running!${NC}"
    echo -e "${BLUE}📱 Frontend: ${GREEN}http://localhost:3000${NC}"
    echo -e "${BLUE}🔧 Backend:  ${GREEN}http://localhost:5001${NC}"
    echo ""
    echo -e "${YELLOW}📋 Default Admin Login:${NC}"
    echo -e "   Email: ${GREEN}admin@miningcompany.com${NC}"
    echo -e "   Password: ${GREEN}admin123${NC}"
}

# Function to stop services
stop_services() {
    echo -e "${YELLOW}🛑 Stopping Vehicle Booking System...${NC}"
    
    # Stop all related processes
    pkill -f "node server.js"
    pkill -f "react-scripts"
    pkill -f "npm start"
    
    echo -e "${GREEN}✅ All services stopped!${NC}"
}

# Function to check status
check_status() {
    echo -e "${BLUE}🔍 Vehicle Booking System Status${NC}"
    echo -e "${BLUE}===============================${NC}"
    
    # Check PostgreSQL
    if pgrep -x "postgres" > /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL: Running${NC}"
    else
        echo -e "${RED}❌ PostgreSQL: Not running${NC}"
    fi
    
    # Check Backend
    if check_port 5001; then
        echo -e "${GREEN}✅ Backend: Running on port 5001${NC}"
        curl -s http://localhost:5001/api/health | jq -r '.message' 2>/dev/null || echo "API responding"
    else
        echo -e "${RED}❌ Backend: Not running${NC}"
    fi
    
    # Check Frontend
    if check_port 3000; then
        echo -e "${GREEN}✅ Frontend: Running on port 3000${NC}"
    else
        echo -e "${RED}❌ Frontend: Not running${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}🔗 Quick Links:${NC}"
    echo -e "   Frontend: ${GREEN}http://localhost:3000${NC}"
    echo -e "   Backend Health: ${GREEN}http://localhost:5001/api/health${NC}"
}

# Function to show logs
show_logs() {
    local service=$1
    case $service in
        "backend")
            echo -e "${BLUE}📄 Backend Logs:${NC}"
            tail -50 "$PROJECT_ROOT/logs/backend.log" 2>/dev/null || echo "No backend logs found"
            ;;
        "frontend")
            echo -e "${BLUE}📄 Frontend Logs:${NC}"
            tail -50 "$PROJECT_ROOT/logs/frontend.log" 2>/dev/null || echo "No frontend logs found"
            ;;
        *)
            echo -e "${YELLOW}Usage: $0 logs [backend|frontend]${NC}"
            ;;
    esac
}

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/logs"

# Main script logic
case "${1:-menu}" in
    "start")
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        stop_services
        sleep 2
        start_services
        ;;
    "status")
        check_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "menu"|"")
        echo -e "${YELLOW}Available commands:${NC}"
        echo -e "  ${GREEN}$0 start${NC}    - Start all services"
        echo -e "  ${GREEN}$0 stop${NC}     - Stop all services"
        echo -e "  ${GREEN}$0 restart${NC}  - Restart all services"
        echo -e "  ${GREEN}$0 status${NC}   - Check service status"
        echo -e "  ${GREEN}$0 logs [backend|frontend]${NC} - View logs"
        echo ""
        echo -e "${YELLOW}Quick Actions:${NC}"
        echo -e "  👉 To start the system: ${GREEN}$0 start${NC}"
        echo -e "  👉 To check if running: ${GREEN}$0 status${NC}"
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo -e "${YELLOW}Run '$0' without arguments to see available commands${NC}"
        exit 1
        ;;
esac

