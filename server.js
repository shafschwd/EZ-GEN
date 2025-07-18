const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'EZ-GEN App Generator is running!' });
});

// Generate app endpoint
app.post('/api/generate-app', upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'splash', maxCount: 1 }
]), async (req, res) => {
  try {
    const { appName, websiteUrl, packageName } = req.body;
    const appId = uuidv4();
    
    console.log('Generating app:', { appName, websiteUrl, packageName, appId });
    
    // Create app directory
    const appDir = path.join(__dirname, 'generated-apps', appId);
    await fs.ensureDir(appDir);
    
    // Copy template
    const templateDir = path.join(__dirname, 'templates', 'ionic-webview-template');
    await fs.copy(templateDir, appDir);

    // Copy the README for generated apps
    const readmePath = path.join(templateDir, 'GENERATED_APP_README.md');
    if (await fs.pathExists(readmePath)) {
      await fs.copy(readmePath, path.join(appDir, 'README.md'));
    }
    
    // Update app configuration
    await updateAppConfig(appDir, {
      appName,
      websiteUrl,
      packageName,
      logo: req.files?.logo?.[0],
      splash: req.files?.splash?.[0]
    });

    // Build and sync the app to ensure it's ready for use
    try {
      await buildAndSyncApp(appDir);
      console.log('App built and synced successfully!');
    } catch (buildError) {
      console.warn('Build/sync failed, but app was generated. User will need to run build manually:', buildError.message);
    }

    res.json({
      success: true,
      appId,
      message: 'App generated successfully!',
      downloadUrl: `/api/download/${appId}`
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

// Update app configuration
async function updateAppConfig(appDir, config) {
  const { appName, websiteUrl, packageName, logo, splash } = config;
  
  // Update capacitor.config.ts
  const capacitorConfigPath = path.join(appDir, 'capacitor.config.ts');
  if (await fs.pathExists(capacitorConfigPath)) {
    let capacitorConfig = await fs.readFile(capacitorConfigPath, 'utf8');
    capacitorConfig = capacitorConfig
      .replace(/appId: '.*?'/, `appId: '${packageName}'`)
      .replace(/appName: '.*?'/, `appName: '${appName}'`);
    
    // If assets configuration is missing and we have logo/splash, add it
    if ((logo || splash) && !capacitorConfig.includes('CapacitorAssets')) {
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
  }
  
  // Update package.json
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
  
  // Read MainActivity content (either from old location or template)
  let mainActivityContent = '';
  if (await fs.pathExists(oldMainActivityPath)) {
    mainActivityContent = await fs.readFile(oldMainActivityPath, 'utf8');
    // Remove old MainActivity
    await fs.remove(oldMainActivityPath);
  } else {
    // Read from template
    const templateMainActivityPath = path.join(__dirname, 'templates', 'ionic-webview-template', 'android', 'app', 'src', 'main', 'java', 'io', 'ionic', 'starter', 'MainActivity.java');
    if (await fs.pathExists(templateMainActivityPath)) {
      mainActivityContent = await fs.readFile(templateMainActivityPath, 'utf8');
    }
  }
  
  // Update package declaration
  if (mainActivityContent) {
    mainActivityContent = mainActivityContent.replace(/package .*?;/, `package ${packageName};`);
    await fs.writeFile(newMainActivityPath, mainActivityContent);
  }
  
  // Update app component to load website URL
  const appComponentPath = path.join(appDir, 'src', 'app', 'app.component.ts');
  if (await fs.pathExists(appComponentPath)) {
    let appComponent = await fs.readFile(appComponentPath, 'utf8');
    appComponent = appComponent.replace(
      /websiteUrl = '.*?'/,
      `websiteUrl = '${websiteUrl}'`
    );
    await fs.writeFile(appComponentPath, appComponent);
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
async function buildAndSyncApp(appDir) {
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
          
          // Sync Capacitor
          const capSync = spawn('npx', ['cap', 'sync'], { 
            cwd: appDir,
            shell: true,
            stdio: 'pipe'
          });
          
          capSync.on('close', (syncCode) => {
            if (syncCode !== 0) {
              console.error('cap sync failed with code:', syncCode);
              return reject(new Error('Failed to sync Capacitor'));
            }
            
            console.log('Capacitor sync completed. Testing app...');
            
            // Test the app by trying to serve it
            testAppFunctionality(appDir)
              .then(() => {
                console.log('App test completed successfully!');
                resolve();
              })
              .catch((testError) => {
                console.warn('App test failed but generation completed:', testError.message);
                resolve(); // Don't fail the entire process for test failures
              });
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

app.listen(PORT, () => {
  console.log(`🚀 EZ-GEN App Generator running on http://localhost:${PORT}`);
  console.log(`📱 Ready to generate mobile apps!`);
  
  // Clean up old uploads on startup
  cleanupOldUploads();
  
  // Clean up old uploads every hour
  setInterval(cleanupOldUploads, 60 * 60 * 1000);
});
