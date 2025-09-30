# 🚀 EZ-GEN - Mobile App Generator

A white-label app generator that creates native Android/iOS apps from any website using Ionic + Capacitor.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **⚠️ IMPORTANT: First-time setup required**
   
   **Create Firebase project (Required for notifications):**
   1. Go to https://console.firebase.google.com
   2. Create a new project
   3. Enable Cloud Messaging
   4. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
   5. Place files in template directories:
      ```
      templates/ionic-webview-template/android/app/google-services.json
      templates/ionic-webview-template/ios/App/GoogleService-Info.plist
      ```

   **Create environment file:**
   ```bash
   # Create .env file in project root
   echo "PORT=3002" > .env
   echo "NODE_ENV=development" >> .env
   ```

   **Create required directories:**
   ```bash
   mkdir uploads generated-apps temp
   ```

4. **Open in browser:**
   Navigate to `http://localhost:5005`

## � Docker Deployment (Recommended)

For easy deployment with all dependencies included:

```bash
# Navigate to docker directory
cd docker

# Start with Docker Compose (easiest)
./test-docker.sh start          # Linux/macOS/WSL
docker-manage.bat start         # Windows

# Or start production setup
./test-docker.sh start-prod     # With Nginx proxy
docker-manage.bat start-prod    # Windows production
```

**Docker Benefits:**
- ✅ All dependencies pre-installed (Java, Android SDK, Node.js)
- ✅ Consistent environment across all platforms
- ✅ No local Android SDK setup required
- ✅ Isolated from host system
- ✅ Easy scaling and deployment

**Quick Docker Commands:**
```bash
# Check status
./test-docker.sh status

# View logs
./test-docker.sh logs

# Access container shell
./test-docker.sh shell

# Test full setup
./test-docker.sh test
```

See [docker/QUICK-START.md](docker/QUICK-START.md) for complete Docker guide.

## �🐧 Linux Server Deployment

For Linux server deployment, see [LINUX-DEPLOYMENT.md](LINUX-DEPLOYMENT.md) for complete setup instructions including:
- Java/Android SDK installation
- Shell script equivalents for Windows batch files
- Environment configuration
- Service setup and monitoring

**Quick Linux Setup:**
```bash
# Make shell scripts executable
chmod +x setup-app.sh check-apk-signature.sh

# Install Java and Android SDK (Ubuntu/Debian)
sudo apt update
sudo apt install openjdk-17-jdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# Follow complete guide in LINUX-DEPLOYMENT.md
```

## Features

- ✅ Generate native mobile apps from any website
- ✅ Upload custom logos and splash screens
- ✅ Download ready-to-build Ionic projects
- ✅ Support for both Android and iOS
- ✅ Cross-platform deployment (Windows/Linux)
- ✅ Beautiful web interface
- ✅ **Firebase Cloud Messaging (FCM) notifications**
- ✅ **Automatic Android 13+ permission handling**
- ✅ **Play Store-ready builds with automatic signing**

## How to Build Generated Apps

After downloading a generated app, you have two options:

### Option 1: Automatic Setup (Recommended)

The server attempts to automatically build and sync your app during generation. If this succeeds, your app is ready to use immediately.

### Option 2: Manual Setup

If automatic setup fails or you need to set up the app manually:

#### Using the Setup Scripts:

**Windows:**
```bash
# Navigate to your app directory
cd your-generated-app
# Run the setup script from the EZ-GEN root directory
..\setup-app.bat
```

**Mac/Linux:**
```bash
# Navigate to your app directory
cd your-generated-app
# Run the setup script from the EZ-GEN root directory
node ../setup-app.js
```

#### Manual Commands:

```bash
cd your-generated-app
npm install          # Install dependencies
npm run build        # Build the web assets
npx cap sync         # Sync Capacitor platforms
```

### Opening in IDEs:

Once setup is complete:

```bash
npx cap open android  # Open in Android Studio
npx cap open ios      # Open in Xcode (macOS only)
```

## 🔧 Troubleshooting

### Build Environment Issues

If you encounter "Release build failed with exit code: 1" or similar build errors, you have several options:

**Option 1: Use Docker (Recommended)**
```bash
# Docker handles all build dependencies automatically
cd docker
./test-docker.sh start          # Linux/macOS/WSL
docker-manage.bat start         # Windows
```

**Option 2: Check Local Environment**
```bash
# Windows
scripts\check-build-environment.bat

# Linux/macOS  
./scripts/check-build-environment.sh

# Or via npm
npm run check-environment
```

This will verify that you have all required tools installed (Java, Android SDK, etc.).

For detailed troubleshooting, see: [DOCS/ANDROID-BUILD-TROUBLESHOOTING.md](DOCS/ANDROID-BUILD-TROUBLESHOOTING.md)

### Gradle Error: "capacitor.settings.gradle not found"

This error has been **automatically fixed** in EZ-GEN! New apps generated by the server will:

1. ✅ Auto-install dependencies during generation
2. ✅ Auto-build web assets 
3. ✅ Auto-sync Capacitor platforms
4. ✅ Be ready to use immediately

If you still encounter issues, use the provided setup scripts:

**Windows:** `setup-app.bat`  
**Mac/Linux:** `node setup-app.js <app-directory>`

See `GRADLE_FIX_NOTES.md` for detailed information about this fix.

## Requirements

- Node.js 16+
- Ionic CLI: `npm install -g @ionic/cli`
- For Android: Android Studio
- For iOS: Xcode (macOS only)

## 🔧 Manual Setup Requirements

**Critical files excluded from Git (for security):**

1. **Firebase configuration files** (get from Firebase Console):
   - `templates/ionic-webview-template/android/app/google-services.json`
   - `templates/ionic-webview-template/ios/App/GoogleService-Info.plist`

2. **Environment variables** (create `.env` file):
   ```bash
   PORT=3002
   NODE_ENV=development
   FIREBASE_PROJECT_ID=your-project-id
   ```

3. **Required directories** (create manually):
   ```bash
   mkdir uploads generated-apps temp
   ```

4. **Android signing keys** (for production builds):
   - Generate with: `keytool -genkey -v -keystore release-key.keystore`

See `DOC.md` for detailed documentation.

## 🔔 Notification Features

Every generated app automatically includes:

- **Firebase Cloud Messaging (FCM)** for push notifications
- **Android 13+ permission handling** with automatic dialog prompts
- **Multiple fallback strategies** to ensure permission requests work
- **Manual permission button** for user-triggered requests
- **Comprehensive error handling** and debugging logs

### Testing Notifications:

1. **Install the generated APK** on your device
2. **Permission dialog** should appear on first launch
3. **Check console logs** for FCM token generation
4. **Use the floating notification button** if needed
5. **Send test notifications** via Firebase Console

See `NOTIFICATION-PERMISSION-TROUBLESHOOTING.md` in generated apps for detailed debugging.