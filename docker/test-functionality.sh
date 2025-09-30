#!/bin/bash

# EZ-GEN Docker Functionality Test
# This script tests the core app generation functionality

echo "🧪 Testing EZ-GEN App Generation in Docker Container"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Test 1: Check if container is running
print_info "Test 1: Checking if EZ-GEN container is running..."
if docker ps | grep -q ez-gen; then
    print_success "EZ-GEN container is running"
else
    print_error "EZ-GEN container is not running. Start it with: ./test-docker.sh start"
    exit 1
fi

# Test 2: Check API health
print_info "Test 2: Testing API health endpoint..."
if curl -s -f http://localhost:5005/api/health > /dev/null; then
    print_success "API health endpoint is responding"
    API_RESPONSE=$(curl -s http://localhost:5005/api/health)
    echo "    Response: $API_RESPONSE"
else
    print_error "API health endpoint is not responding"
    exit 1
fi

# Test 3: Check build environment inside container
print_info "Test 3: Checking build environment inside container..."
if docker exec ez-gen-app npm run check-environment; then
    print_success "Build environment check completed"
else
    print_warning "Build environment has some issues, but continuing..."
fi

# Test 4: Test app generation API (without actually generating)
print_info "Test 4: Testing app generation endpoint validation..."

# Test with valid data
TEST_DATA='{"appName":"TestApp","websiteUrl":"https://example.com","packageName":"com.test.app"}'
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA" \
    http://localhost:5005/api/generate-app \
  -w "%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -c 4)
RESPONSE_BODY=$(echo "$RESPONSE" | head -c -4)

print_info "HTTP Response Code: $HTTP_CODE"
print_info "Response Body: $RESPONSE_BODY"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
    print_success "App generation endpoint is responding correctly"
else
    print_error "App generation endpoint returned unexpected status: $HTTP_CODE"
fi

# Test 5: Check if volumes are mounted correctly
print_info "Test 5: Checking volume mounts..."
docker exec ez-gen-app ls -la /app/generated-apps > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "Generated apps volume is mounted"
else
    print_error "Generated apps volume mount issue"
fi

docker exec ez-gen-app ls -la /app/uploads > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "Uploads volume is mounted"
else
    print_error "Uploads volume mount issue"
fi

docker exec ez-gen-app ls -la /app/apks > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "APKs volume is mounted"
else
    print_error "APKs volume mount issue"
fi

# Test 6: Check Android SDK components
print_info "Test 6: Checking Android SDK components..."
if docker exec ez-gen-app test -d /opt/android-sdk/platform-tools; then
    print_success "Android platform-tools are installed"
else
    print_error "Android platform-tools are missing"
fi

if docker exec ez-gen-app test -d /opt/android-sdk/platforms/android-34; then
    print_success "Android platform-34 is installed"
else
    print_error "Android platform-34 is missing"
fi

# Test 7: Check if container can access external websites
print_info "Test 7: Testing external website access..."
if docker exec ez-gen-app curl -s -f https://www.google.com > /dev/null; then
    print_success "Container can access external websites"
else
    print_error "Container cannot access external websites"
fi

echo ""
print_success "🎉 Docker functionality tests completed!"
echo ""
print_info "Next steps:"
echo "  1. Open http://localhost:5005 in your browser"
echo "  2. Try generating a test app"
echo "  3. Check logs with: docker logs -f ez-gen-app"
echo "  4. Access container shell with: docker exec -it ez-gen-app bash"
echo ""
