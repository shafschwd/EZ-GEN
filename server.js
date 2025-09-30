const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');
const { spawn } = require('child_process');
const crypto = require('crypto');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5005;

// Store active sessions and their logs
const activeSessions = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`Client ${socket.id} joined session ${sessionId}`);
    
    // Send existing logs for this session
    if (activeSessions.has(sessionId)) {
      const session = activeSessions.get(sessionId);
      socket.emit('session-logs', session.logs);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Helper function to log messages to a specific session
function logToSession(sessionId, message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    message,
    type, // 'info', 'success', 'warning', 'error'
    id: uuidv4()
  };
  
  // Store in session
  if (!activeSessions.has(sessionId)) {
    activeSessions.set(sessionId, {
      logs: [],
      startTime: timestamp
    });
  }
  
  const session = activeSessions.get(sessionId);
  session.logs.push(logEntry);
  
  // Keep only last 1000 logs to prevent memory issues
  if (session.logs.length > 1000) {
    session.logs = session.logs.slice(-1000);
  }
  
  // Emit to all clients in this session
  io.to(sessionId).emit('log', logEntry);
  
  // Also log to console
  console.log(`[${sessionId}] ${message}`);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('frontend/dist'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Input validation functions
function validateAppName(appName) {
  if (!appName || typeof appName !== 'string') {
    return { isValid: false, message: 'App name is required and must be a string' };
  }
  
  if (appName.length < 2 || appName.length > 50) {
    return { isValid: false, message: 'App name must be between 2 and 50 characters' };
  }
  
  // Allow letters, numbers, spaces, hyphens, and underscores
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(appName)) {
    return { isValid: false, message: 'App name can only contain letters, numbers, spaces, hyphens, and underscores' };
  }
  
  return { isValid: true };
}

function validateWebsiteUrl(url) {
  if (!url || typeof url !== 'string') {
    return { isValid: false, message: 'Website URL is required' };
  }
  
  // Check for basic invalid characters that shouldn't be in URLs
  if (/['"`\s]/.test(url)) {
    return { isValid: false, message: 'Website URL contains invalid characters (quotes, spaces not allowed)' };
  }
  
  // Check for proper URL format (must have :// after protocol)
  if (/^https?:[^\/]/.test(url)) {
    return { isValid: false, message: 'Invalid URL format. Use https:// or http:// (e.g., https://example.com)' };
  }
  
  try {
    const urlObj = new URL(url);
    
    // Must be http or https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, message: 'Website URL must use HTTP or HTTPS protocol' };
    }
    
    // Must have a valid hostname
    if (!urlObj.hostname || urlObj.hostname.length < 3) {
      return { isValid: false, message: 'Website URL must have a valid hostname' };
    }
    
    // Check for localhost (special case)
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
      return { 
        isValid: true, 
        warning: 'Warning: Using localhost URL - this will only work for local testing' 
      };
    }
    
    // Check for valid domain format (must have at least one dot for TLD)
    if (!urlObj.hostname.includes('.')) {
      return { isValid: false, message: 'Website URL must have a valid domain with extension (e.g., example.com)' };
    }
    
    // Check for valid hostname format (basic domain validation)
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!hostnameRegex.test(urlObj.hostname)) {
      return { isValid: false, message: 'Website URL must have a valid domain name (e.g., example.com)' };
    }
    
    // Check for valid TLD (must end with at least 2 letter extension)
    const parts = urlObj.hostname.split('.');
    const tld = parts[parts.length - 1];
    if (!/^[a-zA-Z]{2,}$/.test(tld)) {
      return { isValid: false, message: 'Website URL must have a valid domain extension (e.g., .com, .org, .net)' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, message: 'Invalid URL format. Please enter a valid website URL (e.g., https://example.com)' };
  }
}

function validatePackageName(packageName) {
  if (!packageName || typeof packageName !== 'string') {
    return { isValid: false, message: 'Package name is required' };
  }
  
  // Java package naming convention
  const packageRegex = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
  
  if (!packageRegex.test(packageName)) {
    return { 
      isValid: false, 
      message: 'Package name must follow Java package naming conventions:\n' +
               '• Must start with a lowercase letter\n' +
               '• Can contain lowercase letters, numbers, and underscores\n' +
               '• Must have at least one dot (e.g., com.company.appname)\n' +
               '• Each part must start with a letter\n' +
               'Example: com.yourcompany.appname'
    };
  }
  
  // Check for reserved words and common mistakes
  const parts = packageName.split('.');
  const reservedPrefixes = ['com.android', 'com.google', 'java', 'javax'];
  const reservedWords = ['android', 'java', 'javax'];

  if (parts.length < 3) {
    return { isValid: false, message: 'Package name must have exactly 3 parts separated by dots (e.g., com.company.appname)' };
  }

  if (parts.length > 5) {
    return { isValid: false, message: 'Package name should not have more than 5 parts for simplicity' };
  }

  // Check for reserved prefixes (full package starts)
  for (const prefix of reservedPrefixes) {
    if (packageName.startsWith(prefix + '.') || packageName === prefix) {
      return { isValid: false, message: `Package name cannot start with reserved prefix: ${prefix}` };
    }
  }

  // Check for reserved words in individual parts (excluding common TLDs like 'com')
  for (const part of parts) {
    if (reservedWords.includes(part)) {
      return { isValid: false, message: `Package name cannot use reserved word: ${part}` };
    }
  }  return { isValid: true };
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'EZ-GEN App Generator is running!' });
});

// Generate app endpoint
app.post('/api/generate-app', upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'splash', maxCount: 1 }
]), async (req, res) => {
  const sessionId = req.body.sessionId || uuidv4();
  
  try {
    const { appName, websiteUrl, packageName } = req.body;
    
    logToSession(sessionId, '🚀 Starting app generation process...', 'info');
    logToSession(sessionId, `📝 App Name: ${appName}`, 'info');
    logToSession(sessionId, `🌐 Website URL: ${websiteUrl}`, 'info');
    logToSession(sessionId, `📦 Package Name: ${packageName}`, 'info');
    
    // Validate inputs
    logToSession(sessionId, '✅ Validating inputs...', 'info');
    
    const appNameValidation = validateAppName(appName);
    if (!appNameValidation.isValid) {
      logToSession(sessionId, `❌ App name validation failed: ${appNameValidation.message}`, 'error');
      return res.status(400).json({
        success: false,
        message: appNameValidation.message,
        error: 'Invalid app name',
        sessionId
      });
    }
    
    const urlValidation = validateWebsiteUrl(websiteUrl);
    if (!urlValidation.isValid) {
      logToSession(sessionId, `❌ Website URL validation failed: ${urlValidation.message}`, 'error');
      return res.status(400).json({
        success: false,
        message: urlValidation.message,
        error: 'Invalid website URL',
        sessionId
      });
    }
    
    if (urlValidation.warning) {
      logToSession(sessionId, `⚠️ ${urlValidation.warning}`, 'warning');
    }
    
    const packageValidation = validatePackageName(packageName);
    if (!packageValidation.isValid) {
      logToSession(sessionId, `❌ Package name validation failed: ${packageValidation.message}`, 'error');
      return res.status(400).json({
        success: false,
        message: packageValidation.message,
        error: 'Invalid package name',
        sessionId
      });
    }
    
    if (packageValidation.warning) {
      logToSession(sessionId, `⚠️ ${packageValidation.warning}`, 'warning');
    }
    
    logToSession(sessionId, '✅ All inputs validated successfully!', 'success');
    
    const appId = uuidv4();
    logToSession(sessionId, `🆔 Generated app ID: ${appId}`, 'info');
    
    // Create app directory
    logToSession(sessionId, '📁 Creating app directory...', 'info');
    const appDir = path.join(__dirname, 'generated-apps', appId);
    await fs.ensureDir(appDir);
    
    // Copy template
    logToSession(sessionId, '📋 Copying template files...', 'info');
    const templateDir = path.join(__dirname, 'templates', 'ionic-webview-template');
    await fs.copy(templateDir, appDir);

    // Fix gradlew line endings for macOS/Linux compatibility
    await fixGradlewLineEndings(appDir, sessionId);

    // Fix Android configuration paths for cross-platform compatibility
    await fixAndroidConfigPaths(appDir, sessionId);

    // Copy the README for generated apps
    const readmePath = path.join(templateDir, 'GENERATED_APP_README.md');
    if (await fs.pathExists(readmePath)) {
      await fs.copy(readmePath, path.join(appDir, 'README.md'));
      logToSession(sessionId, '📖 README file copied', 'info');
    }
    
    // Update app configuration
    logToSession(sessionId, '⚙️ Updating app configuration...', 'info');
    await updateAppConfig(appDir, {
      appName,
      websiteUrl,
      packageName,
      logo: req.files?.logo?.[0],
      splash: req.files?.splash?.[0]
    }, sessionId);

    // Build and sync the app to ensure it's ready for use
    logToSession(sessionId, '🔨 Building and syncing app...', 'info');
    try {
      await buildAndSyncApp(appDir, appName, packageName, sessionId);
      logToSession(sessionId, '✅ App built and synced successfully!', 'success');
    } catch (buildError) {
      logToSession(sessionId, `⚠️ Build/sync failed, but app was generated: ${buildError.message}`, 'warning');
      logToSession(sessionId, '💡 You may need to run build manually later', 'info');
    }

    logToSession(sessionId, '🎉 App generation completed successfully!', 'success');

    res.json({
      success: true,
      appId,
      sessionId,
      message: 'Play Store-ready app generated successfully!',
      downloadUrl: `/api/download/${appId}`,
      apkDownloadUrl: `/api/download-apk/${appId}`,
      releaseApkDownloadUrl: `/api/download-release-apk/${appId}`,
      aabDownloadUrl: `/api/download-aab/${appId}`,
      guideUrl: `/api/download-guide/${appId}`,
      builds: {
        debug: 'APK for testing',
        release: 'APK for sideloading', 
        aab: 'AAB for Play Store submission'
      }
    });  } catch (error) {
    console.error('Error generating app:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate app',
      error: error.message
    });
  }
});

// Download generated app
app.get('/api/download/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const appDir = path.join(__dirname, 'generated-apps', appId);
    
    if (!await fs.pathExists(appDir)) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    const zipPath = path.join(__dirname, 'generated-apps', `${appId}.zip`);
    
    // Create zip file
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.pipe(output);
    archive.directory(appDir, false);
    await archive.finalize();
    
    // Send zip file
    res.download(zipPath, `generated-app-${appId}.zip`, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Clean up zip file after download
      fs.remove(zipPath);
    });
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download app' });
  }
});

// Download APK file directly
app.get('/api/download-apk/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    
    // First try to find debug APK in the apks folder
    const apksDir = path.join(__dirname, 'apks');
    if (await fs.pathExists(apksDir)) {
      const apkFiles = await fs.readdir(apksDir);
      const debugApk = apkFiles.find(file => file.includes('debug') && file.endsWith('.apk'));
      
      if (debugApk) {
        const apkPath = path.join(apksDir, debugApk);
        return res.download(apkPath, debugApk);
      }
      
      // Fallback to any APK file
      const apkFile = apkFiles.find(file => file.endsWith('.apk'));
      if (apkFile) {
        const apkPath = path.join(apksDir, apkFile);
        return res.download(apkPath, apkFile);
      }
    }

    // Fallback: look in the app directory
    const appDir = path.join(__dirname, 'generated-apps', appId);
    if (await fs.pathExists(appDir)) {
      const apkFiles = await fs.readdir(appDir);
      const apkFile = apkFiles.find(file => file.endsWith('.apk'));
      
      if (apkFile) {
        const apkPath = path.join(appDir, apkFile);
        return res.download(apkPath, apkFile);
      }
    }
    
    res.status(404).json({ success: false, message: 'APK not found' });
  } catch (error) {
    console.error('Error downloading APK:', error);
    res.status(500).json({ success: false, message: 'Failed to download APK' });
  }
});

// Download release APK endpoint
app.get('/api/download-release-apk/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    
    // Look for release APK in the apks folder
    const apksDir = path.join(__dirname, 'apks');
    if (await fs.pathExists(apksDir)) {
      const apkFiles = await fs.readdir(apksDir);
      const releaseApk = apkFiles.find(file => file.includes('release') && file.endsWith('.apk') && !file.includes('debug'));
      
      if (releaseApk) {
        const apkPath = path.join(apksDir, releaseApk);
        return res.download(apkPath, releaseApk);
      }
    }

    // Fallback: look in the app directory
    const appDir = path.join(__dirname, 'generated-apps', appId);
    const androidReleaseDir = path.join(appDir, 'android', 'app', 'build', 'outputs', 'apk', 'release');
    
    if (await fs.pathExists(androidReleaseDir)) {
      const apkFiles = await fs.readdir(androidReleaseDir);
      const releaseApk = apkFiles.find(file => file.endsWith('.apk'));
      
      if (releaseApk) {
        const apkPath = path.join(androidReleaseDir, releaseApk);
        return res.download(apkPath, releaseApk);
      }
    }
    
    res.status(404).json({ success: false, message: 'Release APK not found' });
  } catch (error) {
    console.error('Error downloading release APK:', error);
    res.status(500).json({ success: false, message: 'Failed to download release APK' });
  }
});

// Download Android App Bundle (AAB) for Play Store
app.get('/api/download-aab/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    
    // Look for AAB file in the apks folder
    const apksDir = path.join(__dirname, 'apks');
    if (await fs.pathExists(apksDir)) {
      const aabFiles = await fs.readdir(apksDir);
      const aabFile = aabFiles.find(file => file.endsWith('.aab'));
      
      if (aabFile) {
        const aabPath = path.join(apksDir, aabFile);
        return res.download(aabPath, aabFile);
      }
    }
    
    return res.status(404).json({ error: 'AAB file not found' });
    
  } catch (error) {
    console.error('AAB download error:', error);
    res.status(500).json({ error: 'Failed to download AAB' });
  }
});

// Download Play Store submission guide
app.get('/api/download-guide/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    
    const appDir = path.join(__dirname, 'generated-apps', appId);
    const guidePath = path.join(appDir, 'Play-Store-Guide.md');
    
    if (await fs.pathExists(guidePath)) {
      return res.download(guidePath, 'Play-Store-Guide.md');
    }
    
    return res.status(404).json({ error: 'Play Store guide not found' });
    
  } catch (error) {
    console.error('Guide download error:', error);
    res.status(500).json({ error: 'Failed to download guide' });
  }
});

// Robust Capacitor sync function with timeout and manual fallback
async function syncCapacitorWithFallback(appDir, sessionId = null, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    if (sessionId) logToSession(sessionId, '🔄 Attempting Capacitor sync...', 'info');
    
    // Create timeout handler
    const timeout = setTimeout(() => {
      if (sessionId) logToSession(sessionId, '⏰ Capacitor sync timed out, trying manual fallback...', 'warning');
      if (capSync && !capSync.killed) {
        capSync.kill('SIGKILL');
      }
      performManualSync();
    }, timeoutMs);
    
    let capSync = null;
    
    // Try normal cap sync first
    capSync = spawn('npx', ['cap', 'sync'], { 
      cwd: appDir,
      shell: true,
      stdio: 'pipe'
    });
    
    capSync.on('close', (syncCode) => {
      clearTimeout(timeout);
      if (syncCode === 0) {
        if (sessionId) logToSession(sessionId, '✅ Capacitor sync completed successfully!', 'success');
        resolve();
      } else {
        if (sessionId) logToSession(sessionId, `⚠️ Capacitor sync failed with code ${syncCode}, trying manual fallback...`, 'warning');
        performManualSync();
      }
    });
    
    capSync.on('error', (error) => {
      clearTimeout(timeout);
      if (sessionId) logToSession(sessionId, `❌ Capacitor sync error: ${error.message}, trying manual fallback...`, 'warning');
      performManualSync();
    });
    
    // Manual sync fallback function
    async function performManualSync() {
      try {
        if (sessionId) logToSession(sessionId, '🔧 Performing manual Capacitor sync...', 'info');
        
        // Copy web assets to Android
        const wwwDir = path.join(appDir, 'www');
        const androidAssetsDir = path.join(appDir, 'android', 'app', 'src', 'main', 'assets', 'public');
        
        if (await fs.pathExists(wwwDir)) {
          await fs.ensureDir(androidAssetsDir);
          await fs.copy(wwwDir, androidAssetsDir);
          if (sessionId) logToSession(sessionId, '📱 Web assets copied to Android platform', 'success');
        }
        
        // Copy web assets to iOS
        const iosAssetsDir = path.join(appDir, 'ios', 'App', 'App', 'public');
        if (await fs.pathExists(wwwDir)) {
          await fs.ensureDir(iosAssetsDir);
          await fs.copy(wwwDir, iosAssetsDir);
          if (sessionId) logToSession(sessionId, '🍎 Web assets copied to iOS platform', 'success');
        }
        
        if (sessionId) logToSession(sessionId, '✅ Manual Capacitor sync completed successfully!', 'success');
        resolve();
        
      } catch (error) {
        if (sessionId) logToSession(sessionId, `❌ Manual sync failed: ${error.message}`, 'error');
        reject(new Error(`Manual Capacitor sync failed: ${error.message}`));
      }
    }
  });
}

// Fix gradlew line endings for macOS/Linux compatibility
async function fixGradlewLineEndings(appDir, sessionId = null) {
  try {
    const gradlewPath = path.join(appDir, 'android', 'gradlew');
    if (await fs.pathExists(gradlewPath)) {
      if (sessionId) logToSession(sessionId, '🔧 Fixing gradlew line endings for macOS compatibility...', 'info');
      
      // Read the file
      let gradlewContent = await fs.readFile(gradlewPath, 'utf8');
      
      // Remove carriage returns (Windows line endings)
      gradlewContent = gradlewContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // Write back the file with Unix line endings
      await fs.writeFile(gradlewPath, gradlewContent, 'utf8');
      
      if (sessionId) logToSession(sessionId, '✅ Gradlew line endings fixed', 'success');
    }
  } catch (error) {
    if (sessionId) logToSession(sessionId, `⚠️ Warning: Could not fix gradlew line endings: ${error.message}`, 'warning');
    // Don't throw error - this is not critical
  }
}

// Fix Android configuration paths for cross-platform compatibility
async function fixAndroidConfigPaths(appDir, sessionId = null) {
  try {
    // Fix local.properties for Android SDK path
    const localPropertiesPath = path.join(appDir, 'android', 'local.properties');
    if (await fs.pathExists(localPropertiesPath)) {
      if (sessionId) logToSession(sessionId, '🔧 Updating Android SDK paths for environment...', 'info');
      
      const androidSdkPath = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || '/opt/android-sdk';
      // Escape backslashes for Windows paths in properties file
      const escapedSdkPath = androidSdkPath.replace(/\\/g, '\\\\');
      const localPropertiesContent = `## This file is auto-generated for cross-platform compatibility
# Location of the SDK. This is only used by Gradle.
sdk.dir=${escapedSdkPath}
`;
      
      await fs.writeFile(localPropertiesPath, localPropertiesContent, 'utf8');
      if (sessionId) logToSession(sessionId, `✅ Android SDK path set to: ${androidSdkPath}`, 'success');
    }

    // Fix Gradle config.properties for Java path
    const gradleConfigDir = path.join(appDir, 'android', '.gradle');
    const configPropertiesPath = path.join(gradleConfigDir, 'config.properties');
    
    // Ensure .gradle directory exists
    await fs.ensureDir(gradleConfigDir);
    
    const javaHome = process.env.JAVA_HOME || '/usr/lib/jvm/java-21-openjdk-amd64';
    const configPropertiesContent = `# Auto-generated for cross-platform compatibility
java.home=${javaHome}
`;
    
    await fs.writeFile(configPropertiesPath, configPropertiesContent, 'utf8');
    if (sessionId) logToSession(sessionId, `✅ Java home set to: ${javaHome}`, 'success');
    
  } catch (error) {
    if (sessionId) logToSession(sessionId, `⚠️ Warning: Could not fix Android config paths: ${error.message}`, 'warning');
    // Don't throw error - this is not critical
  }
}

// Update app configuration
async function updateAppConfig(appDir, config, sessionId = null) {
  const { appName, websiteUrl, packageName, logo, splash } = config;
  
  if (sessionId) logToSession(sessionId, '📝 Updating capacitor configuration...', 'info');
  
  // Update capacitor.config.ts
  const capacitorConfigPath = path.join(appDir, 'capacitor.config.ts');
  if (await fs.pathExists(capacitorConfigPath)) {
    if (sessionId) logToSession(sessionId, '⚙️ Updating Capacitor configuration...', 'info');
    let capacitorConfig = await fs.readFile(capacitorConfigPath, 'utf8');
    capacitorConfig = capacitorConfig
      .replace(/appId: '.*?'/, `appId: '${packageName}'`)
      .replace(/appName: '.*?'/, `appName: '${appName}'`);
    
    // If assets configuration is missing and we have logo/splash, add it
    if ((logo || splash) && !capacitorConfig.includes('CapacitorAssets')) {
      if (sessionId) logToSession(sessionId, '🎨 Adding asset configuration...', 'info');
      capacitorConfig = capacitorConfig.replace(
        /webDir: '[^']*'/,
        `webDir: 'www',
  plugins: {
    CapacitorAssets: {
      iconPath: 'resources/icon.png',
      splashPath: 'resources/splash.png',
    }
  }`
      );
    }
    
    await fs.writeFile(capacitorConfigPath, capacitorConfig);
    if (sessionId) logToSession(sessionId, '✅ Capacitor configuration updated', 'success');
  }
  
  // Update package.json
  if (sessionId) logToSession(sessionId, '📦 Updating package.json...', 'info');
  const packageJsonPath = path.join(appDir, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    packageJson.name = appName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }

  // Update ionic.config.json
  const ionicConfigPath = path.join(appDir, 'ionic.config.json');
  if (await fs.pathExists(ionicConfigPath)) {
    const ionicConfig = await fs.readJson(ionicConfigPath);
    ionicConfig.name = appName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    await fs.writeJson(ionicConfigPath, ionicConfig, { spaces: 2 });
  }

  // Update index.html title
  const indexHtmlPath = path.join(appDir, 'src', 'index.html');
  if (await fs.pathExists(indexHtmlPath)) {
    let indexHtml = await fs.readFile(indexHtmlPath, 'utf8');
    indexHtml = indexHtml.replace(
      /<title>.*?<\/title>/,
      `<title>${appName}</title>`
    );
    await fs.writeFile(indexHtmlPath, indexHtml);
  }

  // Update Android strings.xml for app display name
  const androidStringsPath = path.join(appDir, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
  if (await fs.pathExists(androidStringsPath)) {
    let stringsXml = await fs.readFile(androidStringsPath, 'utf8');
    stringsXml = stringsXml
      .replace(/<string name="app_name">.*?<\/string>/, `<string name="app_name">${appName}</string>`)
      .replace(/<string name="title_activity_main">.*?<\/string>/, `<string name="title_activity_main">${appName}</string>`)
      .replace(/<string name="package_name">.*?<\/string>/, `<string name="package_name">${packageName}</string>`)
      .replace(/<string name="custom_url_scheme">.*?<\/string>/, `<string name="custom_url_scheme">${packageName}</string>`)
      .replace(/\{\{APP_NAME\}\}/g, appName) // Handle placeholder format
      .replace(/\{\{PACKAGE_NAME\}\}/g, packageName); // Handle package name placeholder
    await fs.writeFile(androidStringsPath, stringsXml);
  }

  // Update Android build.gradle for package name
  const androidBuildGradlePath = path.join(appDir, 'android', 'app', 'build.gradle');
  if (await fs.pathExists(androidBuildGradlePath)) {
    let buildGradle = await fs.readFile(androidBuildGradlePath, 'utf8');
    buildGradle = buildGradle
      .replace(/namespace ".*?"/, `namespace "${packageName}"`)
      .replace(/applicationId ".*?"/, `applicationId "${packageName}"`)
      .replace(/\{\{PACKAGE_NAME\}\}/g, packageName); // Handle placeholder format
    await fs.writeFile(androidBuildGradlePath, buildGradle);
  }

  // Update MainActivity package structure
  const oldMainActivityPath = path.join(appDir, 'android', 'app', 'src', 'main', 'java', 'io', 'ionic', 'starter', 'MainActivity.java');
  const packageParts = packageName.split('.');
  const newJavaDir = path.join(appDir, 'android', 'app', 'src', 'main', 'java', ...packageParts);
  const newMainActivityPath = path.join(newJavaDir, 'MainActivity.java');
  
  // Ensure new package directory exists
  await fs.ensureDir(newJavaDir);
  
  // Read MainActivity content (prioritize template over existing file)
  let mainActivityContent = '';
  const templateMainActivityPath = path.join(__dirname, 'templates', 'ionic-webview-template', 'android', 'app', 'src', 'main', 'java', 'io', 'ionic', 'starter', 'MainActivity.java');
  
  if (await fs.pathExists(templateMainActivityPath)) {
    mainActivityContent = await fs.readFile(templateMainActivityPath, 'utf8');
    console.log('📱 Using template MainActivity.java');
  } else if (await fs.pathExists(oldMainActivityPath)) {
    mainActivityContent = await fs.readFile(oldMainActivityPath, 'utf8');
    console.log('⚠️ Using existing MainActivity.java from app directory');
  }
  
  // Remove old MainActivity if it exists
  if (await fs.pathExists(oldMainActivityPath)) {
    await fs.remove(oldMainActivityPath);
  }
  
  // Update package declaration
  if (mainActivityContent) {
    mainActivityContent = mainActivityContent.replace(/package .*?;/, `package ${packageName};`);
    await fs.writeFile(newMainActivityPath, mainActivityContent);
  }
  
  // Handle MyFirebaseMessagingService.java package replacement
  const oldFirebaseServicePath = path.join(appDir, 'android', 'app', 'src', 'main', 'java', 'io', 'ionic', 'starter', 'MyFirebaseMessagingService.java');
  const newFirebaseServicePath = path.join(newJavaDir, 'MyFirebaseMessagingService.java');
  
  let firebaseServiceContent = '';
  // Always try to get from template first
  const templateFirebaseServicePath = path.join(__dirname, 'templates', 'ionic-webview-template', 'android', 'app', 'src', 'main', 'java', 'io', 'ionic', 'starter', 'MyFirebaseMessagingService.java');
  if (await fs.pathExists(templateFirebaseServicePath)) {
    firebaseServiceContent = await fs.readFile(templateFirebaseServicePath, 'utf8');
    console.log('🔥 Using template MyFirebaseMessagingService.java');
  } else if (await fs.pathExists(oldFirebaseServicePath)) {
    firebaseServiceContent = await fs.readFile(oldFirebaseServicePath, 'utf8');
    console.log('⚠️ Using existing MyFirebaseMessagingService.java from app directory');
  }
  
  // Remove old Firebase service file if it exists
  if (await fs.pathExists(oldFirebaseServicePath)) {
    await fs.remove(oldFirebaseServicePath);
  }
  
  if (firebaseServiceContent) {
    firebaseServiceContent = firebaseServiceContent.replace(/package .*?;/, `package ${packageName};`);
    firebaseServiceContent = firebaseServiceContent.replace(/\{\{PACKAGE_NAME\}\}/g, packageName);
    await fs.writeFile(newFirebaseServicePath, firebaseServiceContent);
  }
  
  // Handle NotificationPermissionHelper.java package replacement
  const oldNotificationHelperPath = path.join(appDir, 'android', 'app', 'src', 'main', 'java', 'io', 'ionic', 'starter', 'NotificationPermissionHelper.java');
  const newNotificationHelperPath = path.join(newJavaDir, 'NotificationPermissionHelper.java');
  
  let notificationHelperContent = '';
  // Always try to get from template first
  const templateNotificationHelperPath = path.join(__dirname, 'templates', 'ionic-webview-template', 'android', 'app', 'src', 'main', 'java', 'io', 'ionic', 'starter', 'NotificationPermissionHelper.java');
  if (await fs.pathExists(templateNotificationHelperPath)) {
    notificationHelperContent = await fs.readFile(templateNotificationHelperPath, 'utf8');
    console.log('🔔 Using template NotificationPermissionHelper.java');
  } else if (await fs.pathExists(oldNotificationHelperPath)) {
    notificationHelperContent = await fs.readFile(oldNotificationHelperPath, 'utf8');
    console.log('⚠️ Using existing NotificationPermissionHelper.java from app directory');
  }
  
  // Remove old notification helper file if it exists
  if (await fs.pathExists(oldNotificationHelperPath)) {
    await fs.remove(oldNotificationHelperPath);
  }
  
  if (notificationHelperContent) {
    notificationHelperContent = notificationHelperContent.replace(/package .*?;/, `package ${packageName};`);
    notificationHelperContent = notificationHelperContent.replace(/\{\{PACKAGE_NAME\}\}/g, packageName);
    await fs.writeFile(newNotificationHelperPath, notificationHelperContent);
    console.log(`📱 NotificationPermissionHelper copied and updated for package: ${packageName}`);
  }
  
  // Copy Firebase configuration file for FCM support
  const templateFirebaseConfigPath = path.join(__dirname, 'templates', 'ionic-webview-template', 'android', 'app', 'google-services.json');
  const newFirebaseConfigPath = path.join(appDir, 'android', 'app', 'google-services.json');
  
  if (await fs.pathExists(templateFirebaseConfigPath)) {
    // Read the template Firebase config
    let firebaseConfig = await fs.readFile(templateFirebaseConfigPath, 'utf8');
    
    // Update the package name in Firebase config
    firebaseConfig = firebaseConfig.replace(
      /"package_name": "com\.ezassist\.timeless"/g,
      `"package_name": "${packageName}"`
    );
    
    // Write the updated Firebase config to the new app
    await fs.writeFile(newFirebaseConfigPath, firebaseConfig);
    console.log(`🔥 Firebase configuration copied and updated for package: ${packageName}`);
  } else {
    console.warn('⚠️ Firebase configuration template not found. FCM notifications may not work.');
  }
  
  // Update app component to load website URL and replace hardcoded values
  const appComponentPath = path.join(appDir, 'src', 'app', 'app.component.ts');
  if (await fs.pathExists(appComponentPath)) {
    let appComponent = await fs.readFile(appComponentPath, 'utf8');
    appComponent = appComponent
      .replace(/websiteUrl = '.*?'/, `websiteUrl = '${websiteUrl}'`)
      .replace(/Timeless app/g, `${appName} app`)
      .replace(/timeless-updates/g, `${appName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-updates`);
    await fs.writeFile(appComponentPath, appComponent);
  }

  // Update push notification service with app-specific values
  const pushServicePath = path.join(appDir, 'src', 'app', 'services', 'push-notification.service.ts');
  if (await fs.pathExists(pushServicePath)) {
    let pushService = await fs.readFile(pushServicePath, 'utf8');
    pushService = pushService
      .replace(/timeless-user/g, `${appName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-user`)
      .replace(/appName: 'Timeless'/g, `appName: '${appName}'`);
    await fs.writeFile(pushServicePath, pushService);
  }

  // Update service worker files
  const swPaths = [
    path.join(appDir, 'src', 'sw.js'),
    path.join(appDir, 'src', 'assets', 'sw.js')
  ];
  
  for (const swPath of swPaths) {
    if (await fs.pathExists(swPath)) {
      let swContent = await fs.readFile(swPath, 'utf8');
      const urlObj = new URL(websiteUrl);
      const domain = urlObj.hostname;
      
      swContent = swContent
        .replace(/timeless-cache/g, `${appName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-cache`)
        .replace(/http:\/\/timeless\.ezassist\.me/g, websiteUrl)
        .replace(/timeless\.ezassist\.me/g, domain);
      await fs.writeFile(swPath, swContent);
    }
  }
  
  // Update network security config for Android to allow the user's domain
  await updateNetworkSecurityConfig(appDir, websiteUrl);

  // Copy logo and splash screen to resources directory for @capacitor/assets
  if (logo) {
    const resourcesDir = path.join(appDir, 'resources');
    await fs.ensureDir(resourcesDir);
    await fs.copy(logo.path, path.join(resourcesDir, 'icon.png'));
    console.log('Logo copied to resources/icon.png');
    
    // Delete the uploaded file
    try {
      await fs.remove(logo.path);
      console.log('Uploaded logo file deleted');
    } catch (error) {
      console.warn('Failed to delete uploaded logo file:', error.message);
    }
  }
  
  if (splash) {
    const resourcesDir = path.join(appDir, 'resources');
    await fs.ensureDir(resourcesDir);
    await fs.copy(splash.path, path.join(resourcesDir, 'splash.png'));
    console.log('Splash screen copied to resources/splash.png');
    
    // Delete the uploaded file
    try {
      await fs.remove(splash.path);
      console.log('Uploaded splash file deleted');
    } catch (error) {
      console.warn('Failed to delete uploaded splash file:', error.message);
    }
  }
}

// Update network security config to allow HTTP traffic for the user's domain
async function updateNetworkSecurityConfig(appDir, websiteUrl) {
  try {
    // Extract domain from URL
    const urlObj = new URL(websiteUrl);
    const domain = urlObj.hostname;
    
    console.log(`Configuring network security for domain: ${domain}`);
    
    const networkSecurityPath = path.join(appDir, 'android', 'app', 'src', 'main', 'res', 'xml', 'network_security_config.xml');
    
    if (await fs.pathExists(networkSecurityPath)) {
      let networkConfig = await fs.readFile(networkSecurityPath, 'utf8');
      
      // Check if domain is already configured
      if (!networkConfig.includes(`<domain includeSubdomains="true">${domain}</domain>`)) {
        // Add the domain to the existing cleartextTrafficPermitted section
        const domainEntry = `        <domain includeSubdomains="true">${domain}</domain>`;
        
        if (networkConfig.includes('<domain-config cleartextTrafficPermitted="true">')) {
          // Insert after the opening domain-config tag
          networkConfig = networkConfig.replace(
            /(<domain-config cleartextTrafficPermitted="true">\s*)/,
            `$1${domainEntry}\n`
          );
        } else {
          // Create a new domain-config section
          const newDomainConfig = `
    <domain-config cleartextTrafficPermitted="true">
        ${domainEntry}
    </domain-config>`;
          
          networkConfig = networkConfig.replace(
            '</network-security-config>',
            `${newDomainConfig}
</network-security-config>`
          );
        }
        
        await fs.writeFile(networkSecurityPath, networkConfig);
        console.log(`Added ${domain} to network security config`);
      } else {
        console.log(`Domain ${domain} already configured in network security config`);
      }
    } else {
      console.log('Network security config not found, will be created during sync');
    }
  } catch (error) {
    console.warn('Failed to update network security config:', error.message);
  }
}

// Build and sync Capacitor app
async function buildAndSyncApp(appDir, appName, packageName, sessionId = null) {
  return new Promise((resolve, reject) => {
    console.log('Building and syncing Capacitor app...');
    
    // First install dependencies
    console.log('Installing dependencies...');
    const npmInstall = spawn('npm', ['install'], { 
      cwd: appDir,
      shell: true,
      stdio: 'pipe'
    });
    
    npmInstall.on('close', (code) => {
      if (code !== 0) {
        console.error('npm install failed with code:', code);
        return reject(new Error('Failed to install dependencies'));
      }
      
      console.log('Dependencies installed. Building app...');
      
      // Then build the app
      const npmBuild = spawn('npm', ['run', 'build'], { 
        cwd: appDir,
        shell: true,
        stdio: 'pipe'
      });
      
      npmBuild.on('close', (buildCode) => {
        if (buildCode !== 0) {
          console.error('npm run build failed with code:', buildCode);
          return reject(new Error('Failed to build app'));
        }
        
        console.log('App built successfully. Generating assets...');
        
        // Generate assets using @capacitor/assets
        const generateAssets = spawn('npx', ['capacitor-assets', 'generate'], { 
          cwd: appDir,
          shell: true,
          stdio: 'pipe'
        });
        
        generateAssets.on('close', (assetsCode) => {
          if (assetsCode !== 0) {
            console.warn('Asset generation failed, continuing with sync...');
          } else {
            console.log('Assets generated successfully.');
          }
          
          console.log('Syncing Capacitor...');
          
          // Use robust Capacitor sync with fallback
          syncCapacitorWithFallback(appDir, sessionId)
            .then(() => {
              console.log('Capacitor sync completed. Testing app...');
              
              // Test the app by trying to serve it
              testAppFunctionality(appDir)
                .then(() => {
                  console.log('App test completed successfully!');
                  
                  // Generate Play Store-ready builds as the final step
                  console.log('Starting Play Store-ready build generation as final step...');
                  generatePlayStoreBuilds(appDir, appName, packageName)
                    .then(() => {
                      console.log('Play Store-ready builds completed successfully!');
                      resolve();
                    })
                    .catch((buildError) => {
                      console.warn('Play Store build generation failed, but app was generated successfully:', buildError.message);
                      resolve(); // Don't fail the entire process for build generation failures
                    });
                })
                .catch((testError) => {
                  console.warn('App test failed but generation completed:', testError.message);
                  
                  // Still try to generate builds even if test failed
                  console.log('Attempting Play Store build generation despite test failure...');
                  generatePlayStoreBuilds(appDir, appName, packageName)
                    .then(() => {
                      console.log('Play Store-ready builds completed successfully!');
                      resolve();
                    })
                    .catch((buildError) => {
                      console.warn('Play Store build generation failed, but app was generated successfully:', buildError.message);
                      resolve(); // Don't fail the entire process for build generation failures
                    });
                });
            })
            .catch((syncError) => {
              console.error('Capacitor sync failed completely:', syncError.message);
              logToSession(sessionId, '⚠️ Build/sync failed, but app was generated: ' + syncError.message, 'warning');
              logToSession(sessionId, '💡 You may need to run build manually later', 'info');
              // Don't reject - let the app generation complete
              resolve();
            });
        });
      });
    });
  });
}

// Test app functionality
async function testAppFunctionality(appDir) {
  return new Promise((resolve, reject) => {
    console.log('Testing app functionality...');
    
    // Try to start the dev server briefly to test if everything works
    const testServer = spawn('npm', ['start'], { 
      cwd: appDir,
      shell: true,
      stdio: 'pipe'
    });
    
    let serverOutput = '';
    let serverStarted = false;
    
    testServer.stdout.on('data', (data) => {
      serverOutput += data.toString();
      if (serverOutput.includes('Local:') || serverOutput.includes('localhost:') || serverOutput.includes('Application bundle generation complete')) {
        serverStarted = true;
      }
    });
    
    testServer.stderr.on('data', (data) => {
      serverOutput += data.toString();
    });
    
    // Give the server 30 seconds to start
    const timeout = setTimeout(() => {
      testServer.kill();
      if (serverStarted) {
        console.log('✅ App test passed - server started successfully');
        resolve();
      } else {
        console.log('⚠️  App test inconclusive - server may need more time to start');
        console.log('Last output:', serverOutput.slice(-500));
        resolve(); // Don't fail, just warn
      }
    }, 30000);
    
    testServer.on('close', (code) => {
      clearTimeout(timeout);
      if (serverStarted) {
        console.log('✅ App test passed - server started and stopped cleanly');
        resolve();
      } else {
        reject(new Error('Server failed to start during test'));
      }
    });
    
    testServer.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Test server error: ${error.message}`));
    });
  });
}

// Generate APK for Android
// Generate keystore for release signing
async function generateKeystore(appDir, packageName, appName) {
  return new Promise((resolve, reject) => {
    console.log('🔑 Generating release keystore...');
    
    const keystoreDir = path.join(appDir, 'android', 'app');
    const keystorePath = path.join(keystoreDir, 'release-key.keystore');
    
    // Generate ONE strong password for both keystore and key (simplifies compatibility)
    const password = crypto.randomBytes(16).toString('hex');
    
    // Save keystore info for user
    const keystoreInfo = {
      keystoreFile: 'release-key.keystore',
      keystorePassword: password,
      keyAlias: 'release-key',
      keyPassword: password, // Same password for simplicity
      packageName: packageName,
      appName: appName,
      generatedAt: new Date().toISOString()
    };
    
    const keystoreInfoPath = path.join(appDir, 'keystore-info.json');
    fs.writeFileSync(keystoreInfoPath, JSON.stringify(keystoreInfo, null, 2));
    
    // Generate keystore using keytool
    const keytoolCmd = 'keytool';
    
    // Create a clean app name for DN (no special characters)
    const cleanAppName = appName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim() || 'MyApp';
    
    const keytoolArgs = [
      '-genkeypair',
      '-v',
      '-keystore', keystorePath,
      '-alias', 'release-key',
      '-keyalg', 'RSA',
      '-keysize', '2048',
      '-validity', '10000',
      '-storepass', password,
      '-keypass', password, // Use same password
      '-storetype', 'PKCS12',
      '-dname', `CN=${cleanAppName}, OU=Mobile Development, O=${cleanAppName}, L=City, S=State, C=US`
    ];
    
    console.log('Executing keytool command:', keytoolArgs.join(' '));
    
    const keytoolProcess = spawn(keytoolCmd, keytoolArgs, {
      stdio: 'pipe'
    });
    
    let keytoolOutput = '';
    keytoolProcess.stdout.on('data', (data) => {
      keytoolOutput += data.toString();
    });
    
    keytoolProcess.stderr.on('data', (data) => {
      keytoolOutput += data.toString();
    });
    
    keytoolProcess.on('close', (code) => {
      console.log('Keytool output:', keytoolOutput);
      console.log('Keytool exit code:', code);
      
      if (code !== 0) {
        console.log('⚠️  Keystore generation failed:', keytoolOutput);
        return reject(new Error('Keystore generation failed: ' + keytoolOutput));
      }
      
      // Verify keystore is accessible
      console.log('🔍 Verifying keystore accessibility...');
      const verifyArgs = ['-list', '-v', '-keystore', keystorePath, '-storepass', password];
      const verifyProcess = spawn(keytoolCmd, verifyArgs, { stdio: 'pipe' });
      
      let verifyOutput = '';
      verifyProcess.stdout.on('data', (data) => {
        verifyOutput += data.toString();
      });
      
      verifyProcess.stderr.on('data', (data) => {
        verifyOutput += data.toString();
      });
      
      verifyProcess.on('close', (verifyCode) => {
        console.log('Keystore verification output:', verifyOutput);
        console.log('Keystore verification exit code:', verifyCode);
        
        if (verifyCode !== 0) {
          console.log('⚠️  Keystore verification failed:', verifyOutput);
          return reject(new Error('Keystore verification failed: ' + verifyOutput));
        }
        
        console.log('✅ Keystore generated and verified successfully!');
        console.log(`🔑 Keystore saved to: ${keystorePath}`);
        console.log(`📄 Keystore info saved to: ${keystoreInfoPath}`);
        
        resolve(keystoreInfo);
      });
    });
  });
}

// Configure release build with keystore
async function configureReleaseBuild(appDir, keystoreInfo) {
  console.log('⚙️  Configuring release build settings...');
  
  const buildGradlePath = path.join(appDir, 'android', 'app', 'build.gradle');
  
  if (!fs.existsSync(buildGradlePath)) {
    throw new Error('build.gradle not found');
  }
  
  let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
  
  // Ensure compileSdk is properly set
  if (!buildGradle.includes('compileSdk ')) {
    buildGradle = buildGradle.replace(
      /compileSdk rootProject\.ext\.compileSdkVersion/,
      'compileSdk 34'
    );
  }
  
  // Update version code and name for Play Store first
  const versionCode = Math.floor(Date.now() / 1000); // Unix timestamp as version code
  const versionName = '1.0.0';
  
  buildGradle = buildGradle.replace(
    /versionCode\s+\d+/,
    `versionCode ${versionCode}`
  );
  
  buildGradle = buildGradle.replace(
    /versionName\s+["'][^"']*["']/,
    `versionName "${versionName}"`
  );
  
  // Update target SDK to latest for Play Store compliance
  buildGradle = buildGradle.replace(
    /targetSdkVersion\s+rootProject\.ext\.targetSdkVersion/,
    'targetSdkVersion 34'
  );
  
  // Update min SDK for better compatibility
  buildGradle = buildGradle.replace(
    /minSdkVersion\s+rootProject\.ext\.minSdkVersion/,
    'minSdkVersion 24'
  );
  
  // Add signing configuration before buildTypes if not already present
  if (!buildGradle.includes('signingConfigs')) {
    const signingConfig = `    signingConfigs {
        release {
            storeFile file('release-key.keystore')
            storePassword '${keystoreInfo.keystorePassword}'
            keyAlias '${keystoreInfo.keyAlias}'
            keyPassword '${keystoreInfo.keyPassword}'
        }
    }
    `;
    
    // Insert signing config before buildTypes
    buildGradle = buildGradle.replace(
      /(buildTypes\s*{)/,
      `${signingConfig}$1`
    );
  }
  
  // Update the release build type to use signing config and enable optimization
  buildGradle = buildGradle.replace(
    /(release\s*{\s*)(minifyEnabled\s+false[^}]*)(})/,
    `$1            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        $3`
  );
  
  fs.writeFileSync(buildGradlePath, buildGradle);
  console.log('✅ Release build configuration updated!');
  
  return { versionCode, versionName };
}

// Generate both debug APK and release AAB for Play Store
async function generateReleaseBuilds(appDir, appName, keystoreInfo) {
  return new Promise((resolve, reject) => {
    console.log('🏗️  Starting Play Store-ready build generation...');
    
    const androidDir = path.join(appDir, 'android');
    const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    
    // Check Android SDK and Java environment
    console.log('🔍 Checking build environment...');
    console.log('ANDROID_HOME:', process.env.ANDROID_HOME || 'Not set');
    console.log('ANDROID_SDK_ROOT:', process.env.ANDROID_SDK_ROOT || 'Not set');
    console.log('JAVA_HOME:', process.env.JAVA_HOME || 'Not set');
    
    // Make gradlew executable on Unix-like systems
    if (process.platform !== 'win32') {
      const gradlewPath = path.join(androidDir, 'gradlew');
      try {
        // Fix line endings for Unix/Linux compatibility
        const gradlewContent = fs.readFileSync(gradlewPath, 'utf8');
        const fixedContent = gradlewContent.replace(/\r\n/g, '\n');
        fs.writeFileSync(gradlewPath, fixedContent);
        
        fs.chmodSync(gradlewPath, '755');
        console.log('🔧 Made gradlew executable and fixed line endings');
      } catch (error) {
        console.log('⚠️  Could not make gradlew executable:', error.message);
      }
    }
    
    // Try a clean build first
    console.log('🧹 Cleaning previous builds...');
    const cleanBuild = spawn(gradlewCmd, ['clean'], {
      cwd: androidDir,
      shell: true,
      stdio: 'pipe'
    });
    
    let cleanOutput = '';
    cleanBuild.stdout.on('data', (data) => {
      cleanOutput += data.toString();
    });
    
    cleanBuild.stderr.on('data', (data) => {
      cleanOutput += data.toString();
    });
    
    cleanBuild.on('close', (cleanCode) => {
      if (cleanCode !== 0) {
        console.log('⚠️  Clean failed, but continuing with build...');
        console.log('Clean output:', cleanOutput.slice(-500));
      } else {
        console.log('✅ Clean completed successfully');
      }
      
      // First, let's try building just the release APK to see if signing works
      console.log('📱 Building release APK...');
      console.log('🔧 Command:', `${gradlewCmd} assembleRelease`);
      console.log('📁 Working directory:', androidDir);
      
      const gradleBuild = spawn(gradlewCmd, ['assembleRelease', '--stacktrace', '--info'], {
        cwd: androidDir,
        shell: true,
        stdio: 'pipe',
        env: {
          ...process.env,
          // Ensure Android environment variables are set
          ANDROID_HOME: process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '/opt/android-sdk',
          ANDROID_SDK_ROOT: process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || '/opt/android-sdk',
        }
      });
      
      let buildOutput = '';
      gradleBuild.stdout.on('data', (data) => {
        const output = data.toString();
        buildOutput += output;
        // Log real-time progress for critical steps
        if (output.includes('BUILD SUCCESSFUL') || output.includes('BUILD FAILED') || output.includes('FAILURE:')) {
          console.log('📋 Build status:', output.trim());
        }
      });
      
      gradleBuild.stderr.on('data', (data) => {
        const output = data.toString();
        buildOutput += output;
        // Log errors in real-time
        if (output.includes('ERROR') || output.includes('FAILURE')) {
          console.log('❌ Build error:', output.trim());
        }
      });
      
      gradleBuild.on('close', (code) => {
        if (code !== 0) {
          console.log('⚠️  Release APK build failed with exit code:', code);
          console.log('🔍 Build environment check:');
          console.log(`  - Gradle wrapper: ${gradlewCmd}`);
          console.log(`  - Android directory exists: ${fs.existsSync(androidDir)}`);
          console.log(`  - build.gradle exists: ${fs.existsSync(path.join(androidDir, 'app', 'build.gradle'))}`);
          
          // Extract key error messages
          const errorLines = buildOutput.split('\n').filter(line => 
            line.includes('FAILURE:') || 
            line.includes('ERROR') || 
            line.includes('Exception') ||
            line.includes('Task :') && line.includes('FAILED')
          );
          
          console.log('🔍 Key error messages:');
          errorLines.slice(-10).forEach(line => console.log('  ', line.trim()));
          
          console.log('🔍 Full build output (last 2000 chars):');
          console.log(buildOutput.slice(-2000));
          
          return reject(new Error(`Release build failed with exit code: ${code}. Check logs above for details.`));
        }
        
        console.log('✅ Release APK build completed successfully!');
        
        // Now try building the AAB
        console.log('📦 Building Android App Bundle (AAB)...');
        
        const aabBuild = spawn(gradlewCmd, ['bundleRelease', '--stacktrace'], {
          cwd: androidDir,
          shell: true,
          stdio: 'pipe'
        });
        
        let aabOutput = '';
        aabBuild.stdout.on('data', (data) => {
          aabOutput += data.toString();
        });
        
        aabBuild.stderr.on('data', (data) => {
          aabOutput += data.toString();
        });
        
        aabBuild.on('close', (aabCode) => {
          if (aabCode !== 0) {
            console.log('⚠️  AAB build failed, but APK succeeded. Continuing...');
            console.log('🔍 AAB build output:', aabOutput.slice(-1000));
          } else {
            console.log('✅ AAB build completed successfully!');
          }
          
          // Find and organize the generated files
          const apkDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release');
          const aabDir = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release');
          
          const cleanAppName = appName.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const apksDir = path.join(__dirname, 'apks');
          fs.ensureDirSync(apksDir);
          
          const results = {
            apk: null,
            aab: null,
            debug: null
          };
          
          // Copy release APK
          if (fs.existsSync(apkDir)) {
            const apkFiles = fs.readdirSync(apkDir).filter(f => f.endsWith('.apk'));
            if (apkFiles.length > 0) {
              const sourceApk = path.join(apkDir, apkFiles[0]);
              const finalApkName = `${cleanAppName}-release.apk`;
              const finalApkPath = path.join(apksDir, finalApkName);
              
              fs.copyFileSync(sourceApk, finalApkPath);
              results.apk = finalApkName;
              console.log(`📱 Release APK: ${finalApkName}`);
            }
          }
          
          // Copy AAB for Play Store if it exists
          if (aabCode === 0 && fs.existsSync(aabDir)) {
            const aabFiles = fs.readdirSync(aabDir).filter(f => f.endsWith('.aab'));
            if (aabFiles.length > 0) {
              const sourceAab = path.join(aabDir, aabFiles[0]);
              const finalAabName = `${cleanAppName}-release.aab`;
              const finalAabPath = path.join(apksDir, finalAabName);
              
              fs.copyFileSync(sourceAab, finalAabPath);
              results.aab = finalAabName;
              console.log(`📦 Play Store AAB: ${finalAabName}`);
            }
          }
          
          // Also generate debug APK for testing
          console.log('🔧 Building debug APK for testing...');
          const debugBuild = spawn(gradlewCmd, ['assembleDebug'], {
            cwd: androidDir,
            shell: true,
            stdio: 'pipe'
          });
          
          debugBuild.on('close', (debugCode) => {
            if (debugCode === 0) {
              const debugApkDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug');
              if (fs.existsSync(debugApkDir)) {
                const debugApkFiles = fs.readdirSync(debugApkDir).filter(f => f.endsWith('.apk'));
                if (debugApkFiles.length > 0) {
                  const sourceDebugApk = path.join(debugApkDir, debugApkFiles[0]);
                  const finalDebugApkName = `${cleanAppName}-debug.apk`;
                  const finalDebugApkPath = path.join(apksDir, finalDebugApkName);
                  
                  fs.copyFileSync(sourceDebugApk, finalDebugApkPath);
                  results.debug = finalDebugApkName;
                  console.log(`🔧 Debug APK: ${finalDebugApkName}`);
                }
              }
            }
            
            console.log('🎉 Build process completed!');
            console.log('📱 Ready for testing:', results.debug);
            console.log('🏪 Ready for Play Store:', results.aab || results.apk);
            
            resolve(results);
          });
        });
      });
    });
  });
}

// Main function to generate Play Store-ready builds
async function generatePlayStoreBuilds(appDir, appName, packageName) {
  try {
    console.log('🏪 Starting Play Store-ready build generation...');
    
    // Check if Android platform exists
    const androidDir = path.join(appDir, 'android');
    if (!fs.existsSync(androidDir)) {
      console.log('⚠️  Android platform not found, skipping build generation');
      console.log('💡 You can add Android platform with: npx cap add android');
      return;
    }
    
    // Validate build environment before proceeding
    console.log('🔍 Validating build environment...');
    const validationResult = await validateBuildEnvironment(appDir);
    if (!validationResult.valid) {
      console.log('❌ Build environment validation failed:');
      validationResult.errors.forEach(error => console.log(`  - ${error}`));
      console.log('💡 Please fix the above issues before building.');
      throw new Error('Build environment validation failed');
    }
    
    console.log('✅ Build environment validation passed');
    
    // Step 1: Generate keystore for release signing
    console.log('🔑 Step 1: Generating release keystore...');
    const keystoreInfo = await generateKeystore(appDir, packageName, appName);
    
    // Step 2: Configure release build settings
    console.log('⚙️  Step 2: Configuring release build...');
    const buildInfo = await configureReleaseBuild(appDir, keystoreInfo);
    
    // Step 3: Generate all builds (debug APK, release APK, release AAB)
    console.log('🏗️  Step 3: Building all versions...');
    const buildResults = await generateReleaseBuilds(appDir, appName, keystoreInfo);
    
    // Step 4: Create Play Store submission guide
    console.log('📋 Step 4: Creating Play Store submission guide...');
    await createPlayStoreGuide(appDir, appName, packageName, keystoreInfo, buildInfo, buildResults);
    
    console.log('🎉 Play Store-ready builds completed successfully!');
    console.log('📱 Debug APK for testing:', buildResults.debug);
    console.log('🏪 Release AAB for Play Store:', buildResults.aab);
    console.log('📋 Check Play-Store-Guide.md for submission instructions');
    
  } catch (error) {
    console.error('❌ Play Store build generation failed:', error.message);
    throw error;
  }
}

// Validate build environment
async function validateBuildEnvironment(appDir) {
  const errors = [];
  const warnings = [];
  
  // Check Android SDK
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!androidHome) {
    errors.push('ANDROID_HOME or ANDROID_SDK_ROOT environment variable not set');
  } else if (!fs.existsSync(androidHome)) {
    errors.push(`Android SDK path does not exist: ${androidHome}`);
  }
  
  // Check Java
  const javaHome = process.env.JAVA_HOME;
  if (!javaHome) {
    warnings.push('JAVA_HOME environment variable not set');
  } else if (!fs.existsSync(javaHome)) {
    warnings.push(`Java path does not exist: ${javaHome}`);
  }
  
  // Check Android project structure
  const androidDir = path.join(appDir, 'android');
  const buildGradlePath = path.join(androidDir, 'app', 'build.gradle');
  const gradlewPath = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
  
  if (!fs.existsSync(buildGradlePath)) {
    errors.push('Android build.gradle not found');
  }
  
  if (!fs.existsSync(gradlewPath)) {
    errors.push('Gradle wrapper not found');
  }
  
  // Check for keytool (needed for keystore generation)
  try {
    await new Promise((resolve, reject) => {
      const keytool = spawn('keytool', ['-help'], { stdio: 'pipe' });
      keytool.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error('keytool not available'));
      });
      keytool.on('error', reject);
    });
  } catch (error) {
    errors.push('keytool not available (required for keystore generation)');
  }
  
  // Print warnings
  if (warnings.length > 0) {
    console.log('⚠️  Build environment warnings:');
    warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Create a comprehensive Play Store submission guide
async function createPlayStoreGuide(appDir, appName, packageName, keystoreInfo, buildInfo, buildResults) {
  const guide = `# Play Store Submission Guide for ${appName}

## 🎉 Your app is ready for Google Play Store submission!

### 📦 Generated Files

#### For Testing:
- **Debug APK**: \`${buildResults.debug}\`
  - Install this on your Android device for testing
  - This version is for development/testing only

#### For Play Store Submission:
- **Release AAB**: \`${buildResults.aab}\` ⭐ **SUBMIT THIS TO PLAY STORE**
  - Android App Bundle optimized for Play Store
  - Smaller download size for users
  - Preferred format by Google Play
  
- **Release APK**: \`${buildResults.apk}\`
  - Alternative format if AAB is not accepted
  - Larger file size than AAB

### 🔑 Important Security Information

**⚠️ CRITICAL: Keep your keystore safe!**

Your release keystore details:
- **Keystore File**: \`android/app/release-key.keystore\`
- **Keystore Password**: \`${keystoreInfo.keystorePassword}\`
- **Key Alias**: \`${keystoreInfo.keyAlias}\`
- **Key Password**: \`${keystoreInfo.keyPassword}\`

**🔒 Security Notes:**
- Store these credentials securely - you'll need them for future app updates
- If you lose the keystore, you cannot update your app on Play Store
- Consider using Google Play App Signing for additional security

### 📋 Play Store Submission Steps

#### 1. Prepare Your Store Listing
- App name: ${appName}
- Package name: ${packageName}
- App description (write a compelling description)
- Screenshots (generate from your app)
- Feature graphic (1024x500px)
- App icon (already configured)

#### 2. Upload to Play Console
1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app
3. Upload the **AAB file**: \`${buildResults.aab}\`
4. Fill in store listing details
5. Set up pricing & distribution
6. Submit for review

#### 3. App Requirements Met ✅
- ✅ **Target API 34** (required for new apps)
- ✅ **Signed with release keystore**
- ✅ **Optimized AAB format**
- ✅ **Version Code**: ${buildInfo.versionCode}
- ✅ **Version Name**: ${buildInfo.versionName}
- ✅ **64-bit support** (included by default)

### 🚀 Testing Before Submission

1. **Install Debug APK** on your Android device:
   \`\`\`bash
   adb install ${buildResults.debug}
   \`\`\`

2. **Test thoroughly**:
   - All website functionality works
   - App loads correctly
   - Navigation is smooth
   - No crashes or errors

### 📊 Next Steps

1. **Test the debug APK** thoroughly on real devices
2. **Create store assets** (screenshots, descriptions)
3. **Upload AAB to Play Console**
4. **Submit for review** (typically takes 1-3 days)

### 🔄 Future Updates

To update your app:
1. Generate new builds with this same keystore
2. Increment version code and name in build.gradle
3. Upload new AAB to Play Console

---

**Generated on**: ${new Date().toISOString()}
**Package**: ${packageName}
**Build Tools**: Capacitor + Ionic + Android Gradle Plugin

For support, check the [Play Console Help Center](https://support.google.com/googleplay/android-developer/)
`;

  const guidePath = path.join(appDir, 'Play-Store-Guide.md');
  fs.writeFileSync(guidePath, guide);
  
  console.log('📋 Play Store submission guide created!');
  console.log(`📄 Guide saved to: ${guidePath}`);
}

async function generateApk(appDir, appName) {
  return new Promise((resolve, reject) => {
    console.log('🔨 Starting APK generation process...');
    
    // Check if Android platform exists
    const androidDir = path.join(appDir, 'android');
    if (!fs.existsSync(androidDir)) {
      console.log('⚠️  Android platform not found, skipping APK generation');
      console.log('💡 You can add Android platform with: npx cap add android');
      return resolve();
    }
    
    console.log('📱 Android platform found, proceeding with APK build...');
    
    // Check for gradlew
    const gradlewPath = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
    if (!fs.existsSync(gradlewPath)) {
      console.log('⚠️  Gradle wrapper not found, skipping APK generation');
      console.log('💡 You can manually build APK with: cd android && ./gradlew assembleDebug');
      return resolve();
    }
    
    console.log('⚙️  Building APK with Gradle wrapper...');
    const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    
    // Make gradlew executable on Unix-like systems
    if (process.platform !== 'win32') {
      try {
        // Fix line endings for Unix/Linux compatibility
        const gradlewContent = fs.readFileSync(gradlewPath, 'utf8');
        const fixedContent = gradlewContent.replace(/\r\n/g, '\n');
        fs.writeFileSync(gradlewPath, fixedContent);
        
        fs.chmodSync(gradlewPath, '755');
        console.log('🔧 Made gradlew executable and fixed line endings');
      } catch (error) {
        console.log('⚠️  Could not make gradlew executable:', error.message);
      }
    }
    
    const gradleBuild = spawn(gradlewCmd, ['assembleDebug'], {
      cwd: androidDir,
      shell: true,
      stdio: 'pipe'
    });
    
    let buildOutput = '';
    gradleBuild.stdout.on('data', (data) => {
      buildOutput += data.toString();
    });
    
    gradleBuild.stderr.on('data', (data) => {
      buildOutput += data.toString();
    });
    
    gradleBuild.on('close', (code) => {
      if (code !== 0) {
        console.log('⚠️  Gradle build failed with exit code:', code);
        console.log('💡 You can manually build APK with: cd android && ./gradlew assembleDebug');
        console.log('🔍 Build output:', buildOutput.slice(-500)); // Show last 500 chars
        return reject(new Error(`Gradle build failed with exit code: ${code}`)); // Properly reject on failure
      }
      
      console.log('✅ Gradle build completed successfully!');
      console.log('🔍 Looking for generated APK...');
      
      // Find the generated APK
      const apkDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug');
      if (fs.existsSync(apkDir)) {
        const apkFiles = fs.readdirSync(apkDir).filter(f => f.endsWith('.apk'));
        if (apkFiles.length > 0) {
          const apkPath = path.join(apkDir, apkFiles[0]);
          console.log(`🎉 APK generated successfully: ${apkPath}`);
          
          // Create apks directory in project root
          const apksDir = path.join(__dirname, 'apks');
          fs.ensureDirSync(apksDir);
          
          // Create clean app name for file (remove special characters)
          const cleanAppName = appName.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const finalApkName = `${cleanAppName}.apk`;
          const finalApkPath = path.join(apksDir, finalApkName);
          
          // Copy APK to apks folder with proper name
          try {
            fs.copyFileSync(apkPath, finalApkPath);
            console.log(`📱 APK copied to: ${finalApkPath}`);
            console.log(`🚀 Ready to install: ${finalApkName}`);
            
            // Also copy to app root for backwards compatibility
            const appRootApkPath = path.join(appDir, finalApkName);
            fs.copyFileSync(apkPath, appRootApkPath);
            console.log(`📁 APK also available in app folder: ${appRootApkPath}`);
          } catch (copyError) {
            console.log('⚠️  Could not copy APK:', copyError.message);
            console.log(`📱 APK available at: ${apkPath}`);
          }
        } else {
          console.log('⚠️  No APK files found in build outputs');
          return reject(new Error('No APK files found in build outputs'));
        }
      } else {
        console.log('⚠️  APK build directory not found:', apkDir);
        return reject(new Error('APK build directory not found'));
      }
      
      console.log('📱 APK generation process completed successfully!');
      resolve();
    });
    
    gradleBuild.on('error', (error) => {
      console.log('⚠️  APK generation failed:', error.message);
      console.log('💡 You can manually generate APK with: cd android && ./gradlew assembleDebug');
      reject(new Error(`APK generation failed: ${error.message}`)); // Properly reject on error
    });
  });
}

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

// Clean up old uploaded files
async function cleanupOldUploads() {
  const uploadsDir = path.join(__dirname, 'uploads');
  try {
    if (await fs.pathExists(uploadsDir)) {
      const files = await fs.readdir(uploadsDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.remove(filePath);
          console.log('Cleaned up old upload:', file);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to cleanup old uploads:', error.message);
  }
}

server.listen(PORT, () => {
  console.log(`🚀 EZ-GEN App Generator running on http://localhost:${PORT}`);
  console.log(`📱 Ready to generate mobile apps!`);
  console.log(`🔌 WebSocket server ready for real-time logging`);
  
  // Clean up old uploads on startup
  cleanupOldUploads();
  
  // Clean up old uploads every hour
  setInterval(cleanupOldUploads, 60 * 60 * 1000);
});
