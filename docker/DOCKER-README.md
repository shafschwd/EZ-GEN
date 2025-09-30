# 🐳 EZ-GEN Docker Deployment Guide

## 🚀 **Quick Start with Docker**

### **Option 1: Docker Compose (Recommended)**

```bash
# Clone or extract the project
git clone <your-repo> ez-gen
cd ez-gen

# Build and start with one command
docker-compose up -d

# Access the application
open http://localhost:5005
```

### **Option 2: Manual Docker Build**

```bash
# Build the Docker image
docker build -t ez-gen:latest .

# Run the container
docker run -d \
  --name ez-gen-app \
  -p 5005:5005 \
  -v $(pwd)/generated-apps:/app/generated-apps \
  -v $(pwd)/uploads:/app/uploads \
  ez-gen:latest

# Access the application
open http://localhost:5005
```

## 📦 **What's Included in the Docker Image**

### **✅ Complete Development Environment:**
- **Ubuntu 22.04** - Stable base system
- **Node.js 20.x** - Required for Capacitor
- **OpenJDK 21** - Required for Android builds
- **Android SDK** - Complete SDK with build tools
- **Ionic CLI** - For app generation
- **Capacitor CLI** - For mobile app building

### **✅ Pre-installed Components:**
- Platform Tools
- Android Platform 34
- Build Tools 34.0.0
- All necessary repositories

### **✅ Security Features:**
- Non-root user execution
- Proper file permissions
- Health checks
- Resource limits

## 🛠️ **Docker Files Explained**

### **1. Dockerfile** (Standard)
- Full-featured development image
- Includes all build tools
- Larger size (~2-3GB)
- Best for development/testing

### **2. Dockerfile.prod** (Production)
- Multi-stage build for smaller image
- Runtime-only dependencies
- Optimized for production
- Smaller size (~1.5-2GB)

### **3. docker-compose.yml**
- Easy deployment configuration
- Volume mapping for persistence
- Health checks
- Restart policies

## 🚀 **Production Deployment**

### **Build Production Image:**
```bash
# Build production image
docker build -f Dockerfile.prod -t ez-gen:prod .

# Or use docker-compose with production config
docker-compose -f docker-compose.prod.yml up -d
```

### **With Nginx Reverse Proxy:**
```bash
# docker-compose.nginx.yml
version: '3.8'
services:
  ez-gen:
    build: .
    container_name: ez-gen-app
    ports:
      - "5005"
    volumes:
      - ./generated-apps:/app/generated-apps
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: ez-gen-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - ez-gen
    restart: unless-stopped
```

## 🔧 **Configuration Options**

### **Environment Variables:**
```bash
docker run -d \
  --name ez-gen-app \
  -p 5005:5005 \
  -e NODE_ENV=production \
  -e PORT=5005 \
  -e JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 \
  -e ANDROID_SDK_ROOT=/opt/android-sdk \
  -v $(pwd)/generated-apps:/app/generated-apps \
  ez-gen:latest
```

### **Volume Mapping:**
- `/app/generated-apps` - Persist generated mobile apps
- `/app/uploads` - Temporary upload storage
- `/app/logs` - Application logs (if configured)

### **Resource Limits:**
```bash
docker run -d \
  --name ez-gen-app \
  --memory=4g \
  --cpus=2 \
  -p 5005:5005 \
  ez-gen:latest
```

## 📊 **Monitoring & Logs**

### **View Logs:**
```bash
# Application logs
docker logs ez-gen-app

# Follow logs in real-time
docker logs -f ez-gen-app

# Docker Compose logs
docker-compose logs -f ez-gen
```

### **Health Check:**
```bash
# Check container health
docker ps
docker inspect ez-gen-app | grep Health

# Manual health check
curl http://localhost:5005/health
```

### **Resource Usage:**
```bash
# Monitor resource usage
docker stats ez-gen-app

# Container information
docker inspect ez-gen-app
```

## 🐛 **Troubleshooting**

### **Common Issues:**

#### **1. Port Already in Use**
```bash
# Check what's using port 5005
lsof -i :5005

# Use different port
docker run -p 3001:5005 ez-gen:latest
```

#### **2. Permission Issues**
```bash
# Fix volume permissions
sudo chown -R 1000:1000 generated-apps uploads

# Or run with user mapping
docker run --user $(id -u):$(id -g) ez-gen:latest
```

#### **3. Memory Issues**
```bash
# Check memory usage
docker stats

# Increase memory limit
docker run --memory=6g ez-gen:latest
```

#### **4. Android SDK Issues**
```bash
# Check SDK installation
docker exec -it ez-gen-app bash
echo $ANDROID_SDK_ROOT
ls -la $ANDROID_SDK_ROOT
```

### **Debug Mode:**
```bash
# Run with bash for debugging
docker run -it --entrypoint bash ez-gen:latest

# Check all environment variables
docker exec ez-gen-app env

# Check Java and Node versions
docker exec ez-gen-app java -version
docker exec ez-gen-app node --version
```

## 🔒 **Security Considerations**

### **Production Security:**
```bash
# Run with read-only filesystem
docker run --read-only \
  --tmpfs /tmp \
  --tmpfs /app/uploads \
  -v $(pwd)/generated-apps:/app/generated-apps \
  ez-gen:latest

# Use secrets for sensitive data
docker run -d \
  --secret firebase-key \
  --secret android-keystore \
  ez-gen:latest
```

### **Network Security:**
```bash
# Create custom network
docker network create ez-gen-network

# Run in custom network
docker run --network ez-gen-network ez-gen:latest
```

## 🚀 **Scaling & Load Balancing**

### **Multiple Instances:**
```bash
# docker-compose.scale.yml
version: '3.8'
services:
  ez-gen:
    build: .
    ports:
      - "5005-5010:5005"
    deploy:
      replicas: 3
    volumes:
      - ./generated-apps:/app/generated-apps

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf
    depends_on:
      - ez-gen
```

### **With Load Balancer:**
```bash
# Scale up
docker-compose up -d --scale ez-gen=3

# Use with Traefik
docker run -d \
  --label="traefik.enable=true" \
  --label="traefik.http.routers.ez-gen.rule=Host(\`ez-gen.local\`)" \
  ez-gen:latest
```

## 📋 **Deployment Checklist**

### **Before Deployment:**
- [ ] Test image build locally
- [ ] Verify all dependencies included
- [ ] Test app generation functionality
- [ ] Check resource requirements
- [ ] Configure volume mappings
- [ ] Set up monitoring

### **Production Ready:**
- [ ] Use production Dockerfile
- [ ] Configure reverse proxy
- [ ] Set up SSL certificates
- [ ] Configure backup strategy
- [ ] Set up log aggregation
- [ ] Configure alerts

## 🎯 **Quick Commands Reference**

```bash
# Build and run
docker build -t ez-gen . && docker run -p 5005:5005 ez-gen

# Quick start with compose
docker-compose up -d

# Stop and remove
docker-compose down

# Update and restart
docker-compose pull && docker-compose up -d

# Clean up
docker system prune -a

# Backup generated apps
docker run --rm -v ez-gen_generated-apps:/data -v $(pwd):/backup ubuntu tar czf /backup/generated-apps.tar.gz -C /data .
```

---

## 🎉 **Your EZ-GEN is Now Containerized!**

The Docker setup includes all the fixes and improvements we made:
- ✅ Capacitor sync fallback mechanism
- ✅ Gradlew line ending fixes
- ✅ Complete Android development environment
- ✅ Production-ready configuration
- ✅ Security best practices

**Just run `docker-compose up -d` and your EZ-GEN will be ready to generate mobile apps!** 🚀
