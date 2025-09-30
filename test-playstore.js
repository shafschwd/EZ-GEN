const FormData = require('form-data');
const fetch = require('node-fetch');

async function testPlayStoreGeneration() {
  const form = new FormData();
  form.append('appName', 'Test Play Store App');
  form.append('websiteUrl', 'https://example.com');
  form.append('packageName', 'com.testcompany.playstoreapp');

  try {
    console.log('Sending request to generate app...');
  const response = await fetch('http://localhost:5005/api/generate-app', {
      method: 'POST',
      body: form
    });

    const result = await response.json();
    console.log('Response:', result);

    if (result.success) {
      console.log('App generated successfully!');
      console.log('App ID:', result.appId);
      
      // Wait a moment for the app to be fully generated
      console.log('Waiting for app generation to complete...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Try to download AAB (Play Store build)
      console.log('Attempting to download AAB...');
  const aabResponse = await fetch(`http://localhost:5005/api/download-aab/${result.appId}`);
      
      if (aabResponse.ok) {
        console.log('✅ AAB download available!');
      } else {
        console.log('⚠️ AAB not ready, response:', aabResponse.status, aabResponse.statusText);
      }
      
      // Try to download APK
      console.log('Attempting to download APK...');
  const apkResponse = await fetch(`http://localhost:5005/api/download-apk/${result.appId}`);
      
      if (apkResponse.ok) {
        console.log('✅ APK download available!');
      } else {
        console.log('⚠️ APK not ready, response:', apkResponse.status, apkResponse.statusText);
      }
      
    } else {
      console.log('❌ App generation failed:', result.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testPlayStoreGeneration();
