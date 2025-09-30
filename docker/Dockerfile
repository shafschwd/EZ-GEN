# Use Ubuntu 22.04 as base image for better package availability
FROM ubuntu:22.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    unzip \
    git \
    build-essential \
    python3 \
    python3-pip \
    openjdk-21-jdk \
    && rm -rf /var/lib/apt/lists/*

# Set JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Create Android SDK directory and set environment variables
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH

# Install Android SDK
RUN mkdir -p $ANDROID_SDK_ROOT \
    && cd $ANDROID_SDK_ROOT \
    && wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip \
    && unzip -q commandlinetools-linux-11076708_latest.zip \
    && rm commandlinetools-linux-11076708_latest.zip \
    && mkdir -p cmdline-tools/latest \
    && mv cmdline-tools/* cmdline-tools/latest/ 2>/dev/null || true \
    && rmdir cmdline-tools/cmdline-tools 2>/dev/null || true

# Accept Android SDK licenses and install components
RUN yes | $ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager --licenses >/dev/null 2>&1 \
    && $ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager \
        "platform-tools" \
        "platforms;android-34" \
        "build-tools;34.0.0" \
        "extras;android;m2repository" \
        "extras;google;m2repository" \
        >/dev/null 2>&1

# Install global npm packages
RUN npm install -g @ionic/cli @capacitor/cli pm2

# Copy package.json and package-lock.json first (for better caching)
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy the rest of the application
COPY . .

# Create necessary directories
RUN mkdir -p uploads generated-apps apks

# Set proper permissions
RUN chmod +x *.sh 2>/dev/null || true \
    && chmod +x scripts/*.sh 2>/dev/null || true \
    && find templates -name "gradlew" -exec chmod +x {} \; 2>/dev/null || true

# Create a non-root user for security
RUN useradd -m -s /bin/bash ezgen \
    && chown -R ezgen:ezgen /app \
    && chown -R ezgen:ezgen $ANDROID_SDK_ROOT

# Switch to non-root user
USER ezgen

# Expose port 5005
EXPOSE 5005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5005 || exit 1

# Start the application
CMD ["npm", "start"]
