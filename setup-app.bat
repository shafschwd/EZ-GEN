@echo off
REM Post-generation setup script for EZ-GEN Ionic/Capacitor apps (Windows)
REM This script ensures that generated apps are properly built and synced

setlocal enabledelayedexpansion

if "%~1"=="" (
    set "APP_DIR=%cd%"
) else (
    set "APP_DIR=%~1"
)

echo.
echo 🚀 Setting up Ionic/Capacitor app...
echo 📍 App directory: %APP_DIR%

REM Check if this is a valid app directory
if not exist "%APP_DIR%\package.json" (
    echo ❌ Error: package.json not found. Make sure you're in a valid app directory.
    pause
    exit /b 1
)

if not exist "%APP_DIR%\capacitor.config.ts" (
    echo ❌ Error: capacitor.config.ts not found. This doesn't appear to be a Capacitor app.
    pause
    exit /b 1
)

cd /d "%APP_DIR%"

echo.
echo 📦 Installing dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    goto :error
)

echo.
echo 🔨 Building the app...
call npm run build
if errorlevel 1 (
    echo ❌ Failed to build the app
    goto :error
)

echo.
echo 🔄 Syncing Capacitor platforms...
call npx cap sync
if errorlevel 1 (
    echo ❌ Failed to sync Capacitor
    goto :error
)

echo.
echo ✅ App setup completed successfully!
echo.
echo 📱 Your app is now ready. You can:
echo    • Open in Android Studio: npx cap open android
echo    • Open in Xcode: npx cap open ios
echo    • Build for web: npm run build
echo    • Run dev server: npm start
echo.
pause
exit /b 0

:error
echo.
echo 🔧 To fix this manually, run these commands in your app directory:
echo    1. npm install
echo    2. npm run build
echo    3. npx cap sync
echo.
pause
exit /b 1
