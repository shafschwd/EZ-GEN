const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');

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
    
    // Update app configuration
    await updateAppConfig(appDir, {
      appName,
      websiteUrl,
      packageName,
      logo: req.files?.logo?.[0],
      splash: req.files?.splash?.[0]
    });
    
    res.json({
      success: true,
      appId,
      message: 'App generated successfully!',
      downloadUrl: `/api/download/${appId}`
    });
    
  } catch (error) {
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
    await fs.writeFile(capacitorConfigPath, capacitorConfig);
  }
  
  // Update package.json
  const packageJsonPath = path.join(appDir, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    packageJson.name = appName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
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
  
  // Copy logo and splash screen if provided
  if (logo) {
    const logoDir = path.join(appDir, 'src', 'assets', 'icon');
    await fs.ensureDir(logoDir);
    await fs.copy(logo.path, path.join(logoDir, 'icon.png'));
  }
  
  if (splash) {
    const splashDir = path.join(appDir, 'src', 'assets', 'splash');
    await fs.ensureDir(splashDir);
    await fs.copy(splash.path, path.join(splashDir, 'splash.png'));
  }
}

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 EZ-GEN App Generator running on http://localhost:${PORT}`);
  console.log(`📱 Ready to generate mobile apps!`);
});
