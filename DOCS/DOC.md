# 🔧 App Generator for Android & iOS (WebView Wrapper)

This project aims to create a **white-label app generator** that wraps any customer website (Angular/React/etc.) inside a native Android/iOS app, using **Ionic + Capacitor**.

Customers will be able to:
- Set their app name
- Upload a logo & splash screen
- Set the website URL
- Download a working APK / IPA for submission to stores

---

## 📦 Tech Stack

- **Frontend Framework**: Ionic + Angular
- **Native Bridge**: Capacitor
- **Backend**: Node.js + Express
- **Editor**: Visual Studio Code (with GitHub Copilot)
- **Build Tools**: Android Studio, Xcode (on macOS)
- **Automation** (later): Fastlane, GitHub Actions (for CI/CD)

---

## 🚀 Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Start the development server:**
```bash
npm start
```

3. **Open your browser:**
Navigate to `http://localhost:5005`

---

## 📋 Project Structure

```
EZ-GEN/
├── frontend/               # Web interface for app generation
│   └── dist/              # Built frontend files
├── backend/               # Backend API (future expansion)
├── templates/             # Ionic app templates
│   └── ionic-webview-template/  # Base template for generated apps
├── generated-apps/        # Generated apps output
├── server.js             # Main server file
└── package.json          # Project dependencies
```

---

## ✅ Features

### Core Functionality
- ✅ Web-based app generator interface
- ✅ File upload for logos and splash screens
- ✅ Ionic + Capacitor template generation
- ✅ WebView wrapper for any website
- ✅ Android platform support
- ✅ iOS platform support
- ✅ Download generated app packages

### Planned Features
- [ ] Real-time app preview
- [ ] Advanced customization options
- [ ] Automated build pipeline
- [ ] Multiple template options
- [ ] White-label branding
- [ ] User authentication
- [ ] Project management dashboard

---

## 🛠️ Development Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Ionic CLI: `npm install -g @ionic/cli`
- Capacitor CLI: `npm install -g @capacitor/cli`

### For Mobile Development
- **Android**: Android Studio + Android SDK (API 33+)
- **iOS**: Xcode (macOS only)

### Installation Steps

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/EZ-GEN.git
cd EZ-GEN
```

2. **Install project dependencies:**
```bash
npm install
```

3. **Create the Ionic template (REQUIRED):**
```bash
cd templates
ionic start ionic-webview-template blank --type=angular --capacitor --no-git
cd ionic-webview-template

# Add mobile platforms
ionic capacitor add android
ionic capacitor add ios

# Install required Capacitor plugins
npm install @capacitor/push-notifications @capacitor/app @capacitor/browser

# Return to project root
cd ../..
```

4. **Set up Android development environment:**
```bash
# Install Android Studio and SDK
# Set ANDROID_HOME environment variable
# Accept SDK licenses
sdkmanager --licenses
```

5. **Set up iOS development (macOS only):**
```bash
# Install Xcode from App Store
xcode-select --install
sudo xcodebuild -license accept
```

6. **Configure Firebase for push notifications (optional):**
   - Create project at https://console.firebase.google.com
   - Download `google-services.json` for Android
   - Download `GoogleService-Info.plist` for iOS
   - Place in template platform directories

7. **Create uploads directory:**
```bash
mkdir uploads
```

8. **Copy template customizations:**
```bash
# Copy the pre-configured files from the repo to your template
cp -r templates/ionic-webview-template/src/* templates/ionic-webview-template/src/
cp -r templates/ionic-webview-template/android/* templates/ionic-webview-template/android/
```

9. **Start the development server:**
```bash
npm start
```

---

## 📱 How It Works

1. **User Input**: Users provide app name, website URL, package name, and optional assets
2. **Template Processing**: The system copies the Ionic template and customizes it
3. **Configuration**: Updates Capacitor config, package.json, and app components
4. **Asset Integration**: Replaces default icons and splash screens with user uploads
5. **Package Generation**: Creates a downloadable zip with the complete Ionic project
6. **Build Ready**: Users can build APK/IPA using standard Ionic/Capacitor commands

---

## 🔧 API Endpoints

### `GET /api/health`
Health check endpoint

### `POST /api/generate-app`
Generate a new mobile app
- **Body**: FormData with app configuration and assets
- **Response**: App ID and download URL

### `GET /api/download/:appId`
Download generated app package
- **Response**: ZIP file with complete Ionic project

---

## � Troubleshooting

### Common Setup Issues

**1. "ionic command not found"**
```bash
npm install -g @ionic/cli @capacitor/cli
```

**2. "Android SDK not found"**
- Install Android Studio
- Set ANDROID_HOME environment variable
- Add to PATH: `$ANDROID_HOME/tools`, `$ANDROID_HOME/platform-tools`

**3. "Template generation fails"**
```bash
# Clean and retry
rm -rf templates/ionic-webview-template
cd templates
ionic start ionic-webview-template blank --type=angular --capacitor
```

**4. "Build fails with Capacitor errors"**
```bash
# Sync Capacitor after changes
cd templates/ionic-webview-template
npx cap sync
```

**5. "Push notifications not working"**
- Ensure Firebase configuration files are in place
- Check Android package name matches Firebase project
- Verify notification permissions in Android settings

### Required Manual Files

After cloning, ensure these files exist in your template:
- `templates/ionic-webview-template/src/app/services/push-notification.service.ts`
- `templates/ionic-webview-template/android/app/src/main/java/io/ionic/starter/MainActivity.java`
- `templates/ionic-webview-template/android/app/google-services.json` (for Firebase)
- `templates/ionic-webview-template/ios/App/GoogleService-Info.plist` (for Firebase)

---

## �📖 Usage Instructions

### For End Users
1. Open the web interface
2. Fill in app details (name, website URL, package name)
3. Upload logo and splash screen (optional)
4. Click "Generate Mobile App"
5. Download the generated package
6. Build using Ionic CLI or Android Studio/Xcode

### Building the Generated App

After downloading and extracting the app package:

```bash
# Navigate to the app directory
cd your-generated-app

# Install dependencies
npm install

# Build for Android
ionic capacitor build android

# Build for iOS
ionic capacitor build ios

# Open in native IDE for final build
ionic capacitor open android
ionic capacitor open ios
```

---

## 🎯 Next Steps

1. **Enhance Template**: Add more customization options
2. **Build Automation**: Integrate automated APK/IPA generation
3. **UI Improvements**: Add preview functionality
4. **Testing**: Implement comprehensive testing
5. **Documentation**: Create video tutorials
6. **Deployment**: Set up production hosting

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

MIT License - feel free to use this project for commercial purposes.

---

## 📞 Support

For questions or issues, please create an issue in the GitHub repository.


