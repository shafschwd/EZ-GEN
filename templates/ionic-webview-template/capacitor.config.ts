import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'ionic-webview-template',
  webDir: 'www',
  server: {
    androidScheme: 'http', // Changed to http to avoid mixed content issues
    allowNavigation: ['*']
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    // Additional settings for better HTTP handling
    useLegacyBridge: false
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    allowsLinkPreview: false
  },
  plugins: {
    CapacitorAssets: {
      iconPath: 'resources/icon.png',
      splashPath: 'resources/splash.png',
    },
    Browser: {
      windowName: '_self',
      toolbarColor: '#4F46E5',
      enableTabView: false,
      enableNavigationButtons: true,
      enableBackButton: true
    }
  }
};

export default config;
