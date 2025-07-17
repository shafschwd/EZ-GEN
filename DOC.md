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
Navigate to `http://localhost:3000`

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

### For Mobile Development
- **Android**: Android Studio + Android SDK
- **iOS**: Xcode (macOS only)

### Installation Steps

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/EZ-GEN.git
cd EZ-GEN
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up the Ionic template (if not already done):**
```bash
cd templates
ionic start ionic-webview-template blank --type=angular --no-git
cd ionic-webview-template
ionic capacitor add android
ionic capacitor add ios
cd ../..
```

4. **Start the development server:**
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

## 📖 Usage Instructions

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


