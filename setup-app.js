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
    
    // Step 3: Generate assets with @capacitor/assets
    console.log('\n🎨 Generating app icons and splash screens...');
    try {
      await runCommand('npx', ['capacitor-assets', 'generate'], appDir);
      console.log('✅ Assets generated successfully');
    } catch (error) {
      console.log('⚠️  Asset generation failed, continuing...');
    }
    
    // Step 4: Sync Capacitor
    console.log('\n🔄 Syncing Capacitor platforms...');
    await runCommand('npx', ['cap', 'sync'], appDir);
    
    // Step 5: Generate APK
    console.log('\n📦 Generating APK file...');
    try {
      // Check if Android platform exists
      const androidDir = path.join(appDir, 'android');
      if (fs.existsSync(androidDir)) {
        console.log('Android platform found, building APK...');
        
        // Use gradlew directly for APK generation (more reliable than cap run)
        const gradlewPath = path.join(androidDir, 'gradlew');
        const gradlewBatPath = path.join(androidDir, 'gradlew.bat');
        
        if (fs.existsSync(gradlewPath) || fs.existsSync(gradlewBatPath)) {
          console.log('Building APK with Gradle...');
          const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
          
          try {
            await runCommand(gradlewCmd, ['assembleDebug'], androidDir);
            
            // Find the generated APK
            const apkDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug');
            if (fs.existsSync(apkDir)) {
              const apkFiles = fs.readdirSync(apkDir).filter(f => f.endsWith('.apk'));
              if (apkFiles.length > 0) {
                const apkPath = path.join(apkDir, apkFiles[0]);
                console.log(`✅ APK generated successfully: ${apkPath}`);
                
                // Copy APK to app root for easy access
                const targetApkPath = path.join(appDir, `${path.basename(appDir)}.apk`);
                fs.copyFileSync(apkPath, targetApkPath);
                console.log(`📱 APK copied to: ${targetApkPath}`);
                console.log(`🎉 Ready to install: ${targetApkPath}`);
              } else {
                console.log('⚠️  APK file not found in build outputs');
              }
            } else {
              console.log('⚠️  APK build directory not found');
            }
          } catch (gradleError) {
            console.log('⚠️  Gradle build failed:', gradleError.message);
            console.log('💡 You can manually build APK with: cd android && ./gradlew assembleDebug');
          }
        } else {
          console.log('⚠️  Gradle wrapper not found, skipping APK generation');
          console.log('💡 You can manually build APK with: cd android && ./gradlew assembleDebug');
        }
      } else {
        console.log('⚠️  Android platform not found, skipping APK generation');
        console.log('💡 Make sure to run: npx cap add android');
      }
    } catch (apkError) {
      console.log('⚠️  APK generation failed:', apkError.message);
      console.log('💡 You can manually generate APK with: cd android && ./gradlew assembleDebug');
    }

    // Step 6: Test the app
    console.log('\n🧪 Testing app functionality...');
    try {
      console.log('Starting test server...');
      const testProcess = spawn('npm', ['start'], {
        cwd: appDir,
        shell: true,
        stdio: 'pipe'
      });
      
      let testOutput = '';
      let serverStarted = false;
      
      testProcess.stdout.on('data', (data) => {
        testOutput += data.toString();
        if (testOutput.includes('Local:') || testOutput.includes('localhost:')) {
          serverStarted = true;
        }
      });
      
      // Wait 15 seconds for server to start
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          testProcess.kill();
          resolve();
        }, 15000);
        
        testProcess.on('close', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      
      if (serverStarted) {
        console.log('✅ App test passed - server started successfully');
      } else {
        console.log('⚠️  App test inconclusive - manual testing recommended');
      }
    } catch (testError) {
      console.log('⚠️  App test failed, but setup completed');
    }
    
    console.log('\n✅ App setup completed successfully!');
    console.log('\n📱 Your app is now ready. You can:');
    console.log('   • Install APK: Look for .apk file in the app directory');
    console.log('   • Open in Android Studio: npx cap open android');
    console.log('   • Open in Xcode: npx cap open ios');
    console.log('   • Build for web: npm run build');
    console.log('   • Run dev server: npm start');
    console.log('   • Generate new APK: cd android && ./gradlew assembleDebug');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n🔧 To fix this manually, run these commands in your app directory:');
    console.log('   1. npm install');
    console.log('   2. npm run build');
    console.log('   3. npx capacitor-assets generate');
    console.log('   4. npx cap sync');
    console.log('   5. npm start (to test)');
    console.log('   6. cd android && ./gradlew assembleDebug (to generate APK)');
    process.exit(1);
  }
}

// Get app directory from command line argument or use current directory
const appDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

setupApp(appDir);
