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

3. **Open in browser:**
   Navigate to `http://localhost:3000`

## Features

- ✅ Generate native mobile apps from any website
- ✅ Upload custom logos and splash screens
- ✅ Download ready-to-build Ionic projects
- ✅ Support for both Android and iOS
- ✅ Beautiful web interface

## How to Build Generated Apps

After downloading a generated app:

```bash
cd your-generated-app
npm install
ionic capacitor build android  # For Android
ionic capacitor build ios      # For iOS
```

## Requirements

- Node.js 16+
- Ionic CLI: `npm install -g @ionic/cli`
- For Android: Android Studio
- For iOS: Xcode (macOS only)

See `DOC.md` for detailed documentation.