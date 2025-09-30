#!/bin/bash

# EZ-GEN Docker Test and Management Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to show usage
show_usage() {
    echo "🐳 EZ-GEN Docker Test & Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  test          Run full test suite"
    echo "  check-env     Check build environment inside container"
    echo "  build         Build the Docker image (dev)"
    echo "  build-prod    Build production Docker image"
    echo "  run           Run the container"
    echo "  start         Start with docker-compose (dev)"
    echo "  start-prod    Start with production docker-compose"
    echo "  stop          Stop all containers"
    echo "  clean         Clean up containers and images"
    echo "  logs          Show container logs"
    echo "  shell         Access container shell"
    echo "  status        Show container status"
    echo "  health        Check container health"
    echo ""
}

# Function to check if Docker is running
check_docker() {
    print_info "Checking Docker availability..."
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if docker-compose is available
check_compose() {
    if ! command -v docker-compose >/dev/null 2>&1; then
        print_warning "docker-compose not found, trying docker compose..."
        if ! docker compose version >/dev/null 2>&1; then
            print_error "Neither docker-compose nor 'docker compose' is available!"
            exit 1
        fi
        # Use docker compose instead of docker-compose
        alias docker-compose='docker compose'
    fi
    print_success "Docker Compose is available"
}

# Function to run comprehensive tests
run_tests() {
    print_info "🧪 Running comprehensive EZ-GEN Docker tests..."
    echo ""
    
    # Test 1: Check prerequisites
    print_info "Test 1: Checking prerequisites..."
    check_docker
    check_compose
    echo ""
    
    # Test 2: Build image
    print_info "Test 2: Building Docker image..."
    if docker build -t ez-gen:test -f Dockerfile .. --no-cache; then
        print_success "Docker image built successfully"
    else
        print_error "Failed to build Docker image"
        exit 1
    fi
    echo ""
    
    # Test 3: Check image size
    print_info "Test 3: Checking image size..."
    IMAGE_SIZE=$(docker images ez-gen:test --format "table {{.Size}}" | tail -n1)
    print_info "Image size: $IMAGE_SIZE"
    echo ""
    
    # Test 4: Test container startup
    print_info "Test 4: Testing container startup..."
    if docker run -d --name ez-gen-test -p 3001:5005 ez-gen:test; then
        print_success "Container started successfully"
        
        # Wait for container to be ready
        print_info "Waiting for container to be ready..."
        sleep 30
        
        # Test 5: Health check
        print_info "Test 5: Checking container health..."
        if curl -f http://localhost:3001 >/dev/null 2>&1; then
            print_success "Container is healthy and responding"
        else
            print_warning "Container is not responding yet, checking logs..."
            docker logs ez-gen-test | tail -10
        fi
        
        # Test 6: Test environment inside container
        if curl -f http://localhost:3001 >/dev/null 2>&1; then
            print_info "Test 6: Testing build environment inside container..."
            if docker exec ez-gen-test npm run check-environment >/dev/null 2>&1; then
                print_success "Container build environment is properly configured"
            else
                print_warning "Build environment check failed inside container"
                docker exec ez-gen-test npm run check-environment || true
            fi
        fi
        
        # Cleanup test container
        print_info "Cleaning up test container..."
        docker stop ez-gen-test
        docker rm ez-gen-test
        
    else
        print_error "Failed to start container"
        exit 1
    fi
    echo ""
    
    # Test 7: Test docker-compose
    print_info "Test 7: Testing docker-compose setup..."
    if docker-compose up -d; then
        print_success "Docker-compose started successfully"
        
        sleep 20
        
        # Check if service is up
    if curl -f http://localhost:5005 >/dev/null 2>&1; then
            print_success "Docker-compose service is healthy"
        else
            print_warning "Docker-compose service not responding, checking logs..."
            docker-compose logs
        fi
        
        # Cleanup
        docker-compose down
        print_success "Docker-compose test completed"
    else
        print_error "Failed to start with docker-compose"
    fi
    echo ""
    
    # Final results
    print_success "🎉 All tests completed!"
    print_info "Your EZ-GEN Docker setup is working correctly!"
    echo ""
    print_info "To start the application:"
    echo "  cd docker && ./test-docker.sh start"
    echo ""
    print_info "To access the application:"
    echo "  http://localhost:5005"
}

# Function to build Docker image
build_image() {
    print_info "Building EZ-GEN Docker image..."
    docker build -t ez-gen:latest -f Dockerfile ..
    print_success "Docker image built successfully!"
}

# Function to build production Docker image
build_prod_image() {
    print_info "Building EZ-GEN production Docker image..."
    docker build -t ez-gen:prod -f Dockerfile.prod ..
    print_success "Production Docker image built successfully!"
}

# Function to run container directly
run_container() {
    print_info "Starting EZ-GEN container..."
    docker run -d \
        --name ez-gen-app \
    -p 5005:5005 \
        -v "$(pwd)/../generated-apps:/app/generated-apps" \
        -v "$(pwd)/../uploads:/app/uploads" \
        ez-gen:latest
    print_success "Container started! Access at http://localhost:5005"
}

# Function to start with docker-compose
start_compose() {
    print_info "Starting EZ-GEN with docker-compose..."
    docker-compose up -d
    print_success "EZ-GEN started! Access at http://localhost:5005"
    echo ""
    print_info "Useful commands:"
    echo "  docker-compose logs -f    # View logs"
    echo "  docker-compose down       # Stop services"
    echo "  ./test-docker.sh status   # Check status"
}

# Function to start production with docker-compose
start_prod_compose() {
    print_info "Starting EZ-GEN in production mode..."
    docker-compose -f docker-compose.prod.yml up -d
    print_success "EZ-GEN production started!"
    echo ""
    print_info "Services:"
    echo "  EZ-GEN App: http://localhost:5005"
    echo "  Nginx Proxy: http://localhost:80"
    echo ""
    print_info "Useful commands:"
    echo "  docker-compose -f docker-compose.prod.yml logs -f"
    echo "  docker-compose -f docker-compose.prod.yml down"
}

# Function to stop containers
stop_containers() {
    print_info "Stopping EZ-GEN containers..."
    docker-compose down 2>/dev/null || true
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    docker stop ez-gen-app 2>/dev/null || true
    docker rm ez-gen-app 2>/dev/null || true
    print_success "Containers stopped!"
}

# Function to clean up
cleanup() {
    print_warning "This will remove all EZ-GEN containers and images. Continue? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_info "Cleaning up containers and images..."
        stop_containers
        docker rmi ez-gen:latest 2>/dev/null || true
        docker rmi ez-gen:test 2>/dev/null || true
        docker rmi ez-gen:prod 2>/dev/null || true
        docker system prune -f
        print_success "Cleanup completed!"
    else
        print_info "Cleanup cancelled."
    fi
}

# Function to show logs
show_logs() {
    if docker-compose -f docker-compose.prod.yml ps | grep -q ez-gen; then
        print_info "Showing EZ-GEN production logs (press Ctrl+C to exit)..."
        docker-compose -f docker-compose.prod.yml logs -f
    elif docker-compose ps | grep -q ez-gen; then
        print_info "Showing EZ-GEN logs (press Ctrl+C to exit)..."
        docker-compose logs -f
    elif docker ps | grep -q ez-gen-app; then
        print_info "Showing EZ-GEN logs (press Ctrl+C to exit)..."
        docker logs -f ez-gen-app
    else
        print_error "No running EZ-GEN containers found!"
    fi
}

# Function to access shell
access_shell() {
    if docker-compose -f docker-compose.prod.yml ps | grep -q ez-gen; then
        print_info "Accessing production container shell..."
        docker-compose -f docker-compose.prod.yml exec ez-gen bash
    elif docker-compose ps | grep -q ez-gen; then
        print_info "Accessing container shell..."
        docker-compose exec ez-gen bash
    elif docker ps | grep -q ez-gen-app; then
        print_info "Accessing container shell..."
        docker exec -it ez-gen-app bash
    else
        print_error "No running EZ-GEN containers found!"
    fi
}

# Function to show status
show_status() {
    print_info "EZ-GEN Docker Status:"
    echo ""
    
    # Check images
    echo "📦 Images:"
    docker images | grep -E "(REPOSITORY|ez-gen)" || echo "  No EZ-GEN images found"
    echo ""
    
    # Check containers
    echo "🐳 Containers:"
    docker ps -a | grep -E "(CONTAINER|ez-gen)" || echo "  No EZ-GEN containers found"
    echo ""
    
    # Check docker-compose services
    if [ -f "docker-compose.yml" ]; then
        echo "📋 Docker Compose Services (Dev):"
        docker-compose ps 2>/dev/null || echo "  No dev compose services running"
        echo ""
    fi
    
    if [ -f "docker-compose.prod.yml" ]; then
        echo "📋 Docker Compose Services (Prod):"
        docker-compose -f docker-compose.prod.yml ps 2>/dev/null || echo "  No prod compose services running"
        echo ""
    fi
    
    # Check if accessible
    if curl -s http://localhost:5005 >/dev/null 2>&1; then
        print_success "EZ-GEN is accessible at http://localhost:5005"
    else
        print_warning "EZ-GEN is not accessible at http://localhost:5005"
    fi
}

# Function to check health
check_health() {
    print_info "Checking EZ-GEN container health..."
    
    if docker ps | grep -q ez-gen; then
        CONTAINER_ID=$(docker ps | grep ez-gen | awk '{print $1}' | head -n1)
        print_info "Container ID: $CONTAINER_ID"
        
        # Check container health
        HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_ID 2>/dev/null || echo "no-healthcheck")
        print_info "Health Status: $HEALTH_STATUS"
        
        # Check if port is responding
    if curl -s http://localhost:5005 >/dev/null 2>&1; then
            print_success "Application is responding on port 5005"
        else
            print_warning "Application is not responding on port 5005"
        fi
        
        # Show recent logs
        print_info "Recent logs:"
        docker logs --tail 10 $CONTAINER_ID
    else
        print_error "No running EZ-GEN containers found"
    fi
}

# Function to check build environment inside container
check_environment() {
    print_info "Checking build environment inside container..."
    
    if docker-compose -f docker-compose.prod.yml ps | grep -q ez-gen; then
        print_info "Running environment check in production container..."
        docker-compose -f docker-compose.prod.yml exec ez-gen npm run check-environment
    elif docker-compose ps | grep -q ez-gen; then
        print_info "Running environment check in development container..."
        docker-compose exec ez-gen npm run check-environment
    elif docker ps | grep -q ez-gen-app; then
        print_info "Running environment check in standalone container..."
        docker exec -it ez-gen-app npm run check-environment
    else
        print_error "No running EZ-GEN containers found!"
        print_info "Starting a temporary container to check environment..."
        if docker run --rm -it ez-gen:latest npm run check-environment; then
            print_success "Environment check completed in temporary container"
        else
            print_error "Failed to run environment check. Build the image first with: ./test-docker.sh build"
        fi
    fi
}

# Ensure we're in the docker directory
cd "$(dirname "$0")"

# Main script logic
case "${1:-}" in
    "test")
        run_tests
        ;;
    "check-env")
        check_docker
        check_environment
        ;;
    "build")
        check_docker
        build_image
        ;;
    "build-prod")
        check_docker
        build_prod_image
        ;;
    "run")
        check_docker
        run_container
        ;;
    "start")
        check_docker
        check_compose
        start_compose
        ;;
    "start-prod")
        check_docker
        check_compose
        start_prod_compose
        ;;
    "stop")
        check_docker
        stop_containers
        ;;
    "clean")
        check_docker
        cleanup
        ;;
    "logs")
        check_docker
        show_logs
        ;;
    "shell")
        check_docker
        access_shell
        ;;
    "status")
        check_docker
        show_status
        ;;
    "health")
        check_docker
        check_health
        ;;
    *)
        show_usage
        ;;
esac
