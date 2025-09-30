# EZ-GEN Docker Setup

This directory contains the complete Docker containerization for EZ-GEN, making deployment and testing incredibly easy.

## 🚀 Quick Start

### Prerequisites
- Docker installed and running
- Docker Compose (or `docker compose` command)
- At least 4GB available disk space

### Test Everything
```bash
cd docker
./test-docker.sh test
```

### Start EZ-GEN
```bash
cd docker
./test-docker.sh start
```

Access EZ-GEN at: http://localhost:5005

## 📁 Files

- **`Dockerfile`** - Development containerization with Ubuntu 22.04, Node.js 20.x, Java 21, Android SDK
- **`Dockerfile.prod`** - Multi-stage production build for smaller, optimized images
- **`docker-compose.yml`** - Development orchestration with volume mapping  
- **`docker-compose.prod.yml`** - Production setup with nginx proxy, resource limits, logging
- **`.dockerignore`** - Optimized build context (excludes node_modules, generated files)
- **`test-docker.sh`** - Comprehensive testing and management script
- **`README.md`** - This documentation

## 🛠️ Management Commands

```bash
# Show all available commands
./test-docker.sh

# Build Docker image (development)
./test-docker.sh build

# Build production image
./test-docker.sh build-prod

# Start with docker-compose (recommended for development)
./test-docker.sh start

# Start production setup (nginx + resource limits)
./test-docker.sh start-prod

# Start single container
./test-docker.sh run

# Stop all containers
./test-docker.sh stop

# View live logs
./test-docker.sh logs

# Check container status
./test-docker.sh status

# Check health
./test-docker.sh health

# Access container shell
./test-docker.sh shell

# Clean up everything
./test-docker.sh clean
```

## 🧪 Testing

The test script runs a comprehensive suite:

1. **Prerequisites Check** - Docker and compose availability
2. **Build Test** - Clean image build from scratch
3. **Image Analysis** - Size and layer inspection
4. **Container Startup** - Full startup with health check
5. **API Test** - Basic connectivity test
6. **App Generation** - API endpoint verification
7. **Docker Compose** - Full orchestration test

## 📦 What's Included

### Base System
- Ubuntu 22.04 LTS
- Node.js 20.x with npm
- Java 21 (OpenJDK)
- Python 3 and build tools

### Android Development
- Android SDK (API 34)
- Android Build Tools
- Command Line Tools
- Gradle wrapper

### EZ-GEN Dependencies
- All npm packages pre-installed
- Ionic CLI and Capacitor CLI
- Firebase tools
- All required build dependencies

## 🔧 Configuration

### Ports
- **5005** - Main EZ-GEN application (mapped to host)

### Volumes
- **`../generated-apps`** - Generated mobile apps persist on host
- **`../uploads`** - Uploaded files persist on host

### Environment
- **NODE_ENV** - Production mode
- **PORT** - 5005 (internal)
- **ANDROID_HOME** - Android SDK path
- **JAVA_HOME** - Java installation path

## 🐛 Troubleshooting

### Container Won't Start
```bash
# Check logs
./test-docker.sh logs

# Check Docker status
./test-docker.sh status

# Access container shell
./test-docker.sh shell
```

### Port Already in Use
```bash
# Stop existing containers
./test-docker.sh stop

# Check what's using port 5005
lsof -i :5005
```

### Build Failures
```bash
# Clean build
./test-docker.sh clean
./test-docker.sh build
```

### Permission Issues
```bash
# Fix script permissions
chmod +x test-docker.sh

# Check Docker permissions
docker info
```

## 📊 Performance

### Image Size
- **Final image**: ~4-5GB (includes full Android SDK)
- **Build time**: 10-15 minutes (first time)
- **Startup time**: 30-60 seconds

### Resource Usage
- **RAM**: 1-2GB recommended
- **CPU**: 2+ cores recommended
- **Disk**: 6GB+ available space

## 🔄 Updates

To update EZ-GEN:

```bash
# Stop current containers
./test-docker.sh stop

# Rebuild with latest code
./test-docker.sh clean
./test-docker.sh build

# Start updated version
./test-docker.sh start
```

## 🌐 Production Deployment

### For CentOS/RHEL
```bash
# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Deploy EZ-GEN
git clone <your-repo>
cd EZ-GEN/docker
./test-docker.sh start
```

### For Ubuntu/Debian
```bash
# Install Docker
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker

# Deploy EZ-GEN
git clone <your-repo>
cd EZ-GEN/docker
./test-docker.sh start
```

## 🔐 Security Notes

- Container runs as non-root user (`ezgen`)
- Only necessary ports exposed
- Build dependencies cleaned up
- Health checks implemented
- Resource limits can be added in production

## 📝 Logs

### Access Logs
```bash
# Live logs
./test-docker.sh logs

# Specific container logs
docker logs ez-gen-app

# Docker compose logs
docker-compose logs -f
```

### Log Locations
- **Container logs**: `/app/logs/` (if configured)
- **Docker logs**: Accessible via `docker logs`
- **Application logs**: Real-time via Socket.IO in web interface

---

## ✅ Success Checklist

After running `./test-docker.sh test`, you should see:

- ✅ Docker is running
- ✅ Docker Compose is available  
- ✅ Docker image built successfully
- ✅ Container started successfully
- ✅ Container is healthy and responding
- ✅ API is accessible
- ✅ Docker-compose service is healthy
- ✅ All tests completed!

**Ready to generate mobile apps!** 🎉
