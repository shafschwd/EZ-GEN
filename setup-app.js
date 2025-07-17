#!/usr/bin/env node
/**
 * Post-generation setup script for EZ-GEN Ionic/Capacitor apps
 * This script ensures that generated apps are properly built and synced
 * 
 * Usage:
 *   node setup-app.js <app-directory>
 *   
 * Or from within the app directory:
 *   node ../../setup-app.js .
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const proc = spawn(command, args, {
      cwd,
      shell: true,
      stdio: 'inherit'
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    proc.on('error', (error) => {
      reject(error);
    });
  });
}

async function setupApp(appDir) {
  try {
    // Verify this is a valid app directory
    const packageJsonPath = path.join(appDir, 'package.json');
    const capacitorConfigPath = path.join(appDir, 'capacitor.config.ts');
    
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found. Make sure you\'re in a valid app directory.');
    }
    
    if (!fs.existsSync(capacitorConfigPath)) {
      throw new Error('capacitor.config.ts not found. This doesn\'t appear to be a Capacitor app.');
    }
    
    console.log('🚀 Setting up Ionic/Capacitor app...');
    console.log('📍 App directory:', appDir);
    
    // Step 1: Install dependencies
    console.log('\n📦 Installing dependencies...');
    await runCommand('npm', ['install'], appDir);
    
    // Step 2: Build the app
    console.log('\n🔨 Building the app...');
    await runCommand('npm', ['run', 'build'], appDir);
    
    // Step 3: Sync Capacitor
    console.log('\n🔄 Syncing Capacitor platforms...');
    await runCommand('npx', ['cap', 'sync'], appDir);
    
    console.log('\n✅ App setup completed successfully!');
    console.log('\n📱 Your app is now ready. You can:');
    console.log('   • Open in Android Studio: npx cap open android');
    console.log('   • Open in Xcode: npx cap open ios');
    console.log('   • Build for web: npm run build');
    console.log('   • Run dev server: npm start');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n🔧 To fix this manually, run these commands in your app directory:');
    console.log('   1. npm install');
    console.log('   2. npm run build');
    console.log('   3. npx cap sync');
    process.exit(1);
  }
}

// Get app directory from command line argument or use current directory
const appDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

setupApp(appDir);
