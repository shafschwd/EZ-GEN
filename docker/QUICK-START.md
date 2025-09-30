# 🐳 EZ-GEN Docker Quick Start Guide

This guide will help you get EZ-GEN running with Docker in minutes.

## 📋 Prerequisites

- Docker Desktop installed and running
- At least 4GB RAM available for Docker
- 10GB free disk space

### Windows
- Docker Desktop for Windows
- WSL2 backend enabled (recommended)

### Linux/macOS
- Docker and docker-compose installed

## 🚀 Quick Start

### 1. Navigate to Docker Directory
```bash
cd docker
```

### 2. Choose Your Method

#### Option A: Docker Compose (Recommended)
```bash
# Development mode
./test-docker.sh start

# Production mode (with Nginx proxy)
./test-docker.sh start-prod
```

#### Option B: Windows Users
```cmd
# Use the Windows management script
docker-manage.bat start

# Or for production
docker-manage.bat start-prod
```

### 3. Access the Application
- **Development**: http://localhost:5005
- **Production**: http://localhost:5005 (app) + http://localhost:80 (proxy)

## 🔧 Management Commands

### Using test-docker.sh (Linux/macOS/WSL)
```bash
./test-docker.sh <command>
```

### Using docker-manage.bat (Windows)
```cmd
docker-manage.bat <command>
```

### Available Commands:
- `test` - Run comprehensive tests
- `check-env` - Check build environment inside container
- `build` - Build development image
- `build-prod` - Build production image
- `start` - Start development environment
- `start-prod` - Start production environment
- `stop` - Stop all containers
- `clean` - Clean up containers and images
- `logs` - View container logs
- `shell` - Access container shell
- `status` - Show container status
- `health` - Check container health

## 🧪 Testing Your Setup

Run the comprehensive test suite:
```bash
# Linux/macOS/WSL
./test-docker.sh test

# Windows
docker-manage.bat test
```

This will:
1. ✅ Check Docker availability
2. ✅ Build the image
3. ✅ Test container startup
4. ✅ Verify health checks
5. ✅ Test build environment
6. ✅ Test docker-compose setup

## 🔍 Troubleshooting

### Check Build Environment
```bash
# Verify Android SDK, Java, etc. are properly configured
./test-docker.sh check-env
```

### Common Issues

#### Docker Not Running
```bash
# Start Docker Desktop on Windows/macOS
# Or start Docker service on Linux:
sudo systemctl start docker
```

#### Port Already in Use
```bash
# Stop existing containers
./test-docker.sh stop

# Or check what's using port 5005
netstat -an | grep 5005
```

#### Build Failures
```bash
# Clean up and rebuild
./test-docker.sh clean
./test-docker.sh build
```

#### Permission Issues (Linux)
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Then logout and login again
```

### View Logs
```bash
# Real-time logs
./test-docker.sh logs

# Or specific container
docker logs -f ez-gen-app
```

## 📁 Volume Mounts

The following directories are mounted for persistence:

- `../generated-apps` → `/app/generated-apps` (Generated mobile apps)
- `../uploads` → `/app/uploads` (Temporary upload files)
- `../apks` → `/app/apks` (Generated APK/AAB files)

## 🏗️ Building Custom Images

### Development Image
```bash
./test-docker.sh build
```

### Production Image
```bash
./test-docker.sh build-prod
```

### Custom Build Options
```bash
# Build with no cache
docker build --no-cache -t ez-gen:latest -f Dockerfile ..

# Build with specific tag
docker build -t ez-gen:v1.0.0 -f Dockerfile ..
```

## 🌐 Production Deployment

### With Docker Compose
```bash
./test-docker.sh start-prod
```

This includes:
- EZ-GEN application server
- Nginx reverse proxy
- Health checks
- Resource limits
- Log rotation

### Environment Variables

Set these in your production environment:
```bash
export NODE_ENV=production
export PORT=5005
export ANDROID_HOME=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
```

## 📊 Monitoring

### Check Container Status
```bash
./test-docker.sh status
```

### Health Checks
```bash
./test-docker.sh health
```

### Resource Usage
```bash
docker stats
```

## 🔧 Advanced Usage

### Access Container Shell
```bash
./test-docker.sh shell
```

### Run Commands Inside Container
```bash
# Check environment
docker exec -it ez-gen-app npm run check-environment

# Generate an app (example)
docker exec -it ez-gen-app npm start
```

### Custom Networks
```bash
# Create custom network
docker network create ez-gen-custom

# Run with custom network
docker run --network ez-gen-custom ez-gen:latest
```

## 🚨 Emergency Procedures

### Complete Reset
```bash
./test-docker.sh clean
./test-docker.sh build
./test-docker.sh start
```

### Backup Generated Apps
```bash
# Create backup
tar -czf ez-gen-backup-$(date +%Y%m%d).tar.gz ../generated-apps ../apks

# Restore backup
tar -xzf ez-gen-backup-YYYYMMDD.tar.gz
```

### Container Recovery
```bash
# If container is stuck
docker kill ez-gen-app
docker rm ez-gen-app
./test-docker.sh start
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [EZ-GEN Main Documentation](../README.md)
- [Android Build Troubleshooting](../DOCS/ANDROID-BUILD-TROUBLESHOOTING.md)

---

**Need Help?** Run `./test-docker.sh` without arguments to see all available commands.
