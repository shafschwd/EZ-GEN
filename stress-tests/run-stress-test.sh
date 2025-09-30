#!/bin/bash

# EZ-GEN Stress Test Quick Start Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${MAGENTA}🚀 EZ-GEN STRESS TEST QUICK START${NC}"
echo "======================================"

# Check if EZ-GEN server is running
echo -e "\n${BLUE}🔍 Checking if EZ-GEN server is running...${NC}"
if curl -s http://localhost:5005 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ EZ-GEN server is running at http://localhost:5005${NC}"
else
    echo -e "${RED}❌ EZ-GEN server is not running!${NC}"
    echo -e "${YELLOW}Please start the server first:${NC}"
    echo "   cd .. && npm start"
    echo "   OR"
    echo "   cd ../docker && ./test-docker.sh start"
    exit 1
fi

# Check if dependencies are installed
echo -e "\n${BLUE}📦 Checking dependencies...${NC}"
if node -e "require('axios'); require('form-data')" 2>/dev/null; then
    echo -e "${GREEN}✅ Dependencies are installed${NC}"
else
    echo -e "${YELLOW}⚠️  Installing missing dependencies...${NC}"
    cd .. && npm install axios form-data --save-dev && cd stress-tests
fi

echo -e "\n${BLUE}🎯 Available test modes:${NC}"
echo "1. Quick Test (5 users, 30 seconds)"
echo "2. Standard Test (10 users, 60 seconds)"  
echo "3. Heavy Load Test (20 users, 120 seconds)"
echo "4. Custom Test"
echo "5. Show help"

read -p "$(echo -e ${YELLOW}"Choose test mode (1-5): "${NC})" choice

case $choice in
    1)
        echo -e "\n${GREEN}🏃 Running Quick Test...${NC}"
        node stress-test.js --users 5 --duration 30 --log-level INFO
        ;;
    2)
        echo -e "\n${GREEN}🚀 Running Standard Test...${NC}"
        node stress-test.js --users 10 --duration 60 --log-level INFO
        ;;
    3)
        echo -e "\n${RED}💪 Running Heavy Load Test...${NC}"
        echo -e "${YELLOW}⚠️  This will generate significant load on your system!${NC}"
        read -p "$(echo -e ${YELLOW}"Are you sure? (y/N): "${NC})" confirm
        if [[ $confirm =~ ^([yY][eE][sS]|[yY])$ ]]; then
            node stress-test.js --users 20 --duration 120 --log-level INFO
        else
            echo -e "${BLUE}Test cancelled.${NC}"
        fi
        ;;
    4)
        echo -e "\n${BLUE}🛠️  Custom Test Configuration:${NC}"
        read -p "$(echo -e ${YELLOW}"Number of concurrent users (default 10): "${NC})" users
        read -p "$(echo -e ${YELLOW}"Test duration in seconds (default 60): "${NC})" duration
        read -p "$(echo -e ${YELLOW}"Log level (DEBUG/INFO/WARN/ERROR, default INFO): "${NC})" loglevel
        
        users=${users:-10}
        duration=${duration:-60}
        loglevel=${loglevel:-INFO}
        
        echo -e "\n${GREEN}🎯 Running Custom Test...${NC}"
        node stress-test.js --users $users --duration $duration --log-level $loglevel
        ;;
    5)
        echo -e "\n${BLUE}📖 Stress Test Help:${NC}"
        node stress-test.js --help
        ;;
    *)
        echo -e "${RED}❌ Invalid choice. Please run the script again.${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}🎉 Stress test completed!${NC}"
echo -e "${BLUE}📊 Check the stress-test-results/ directory for detailed reports.${NC}"
