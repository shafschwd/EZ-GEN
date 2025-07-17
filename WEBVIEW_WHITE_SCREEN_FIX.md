# 🛠️ Webview White Screen Fix Guide

## 🔍 Problem
When you see a **white screen** in Android Studio (or iOS Simulator) but the app works fine in the browser (`ionic serve`), this is typically caused by:

1. **CORS (Cross-Origin Resource Sharing)** restrictions
2. **HTTPS requirements** in mobile webviews
3. **Content Security Policy** headers from your website
4. **Mixed content blocking** (HTTP content on HTTPS pages)

## ✅ Solutions Implemented

### 1. **Enhanced App Component**
The app now includes:
- **Error detection** and user-friendly fallback UI
- **External browser option** using @capacitor/browser
- **Improved iframe handling** with proper error catching
- **Native platform detection** for better UX

### 2. **Android Webview Configuration**
Enhanced `MainActivity.java` with:
```java
// Enable mixed content (HTTP on HTTPS)
webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

// Enable storage and JavaScript
webSettings.setDomStorageEnabled(true);
webSettings.setDatabaseEnabled(true);
webSettings.setJavaScriptEnabled(true);

// Better compatibility
webSettings.setUserAgentString(userAgent + " CapacitorWebView");
```

### 3. **Network Security Configuration**
Added `network_security_config.xml` to allow:
- **Cleartext traffic** for HTTP websites
- **Mixed content** for better compatibility
- **Development domains** (localhost, etc.)

### 4. **Capacitor Configuration**
Enhanced `capacitor.config.ts` with:
```typescript
server: {
  androidScheme: 'https'
},
android: {
  allowMixedContent: true,
  webContentsDebuggingEnabled: true
}
```

## 🔧 Troubleshooting Steps

### Step 1: Test in Browser First
```bash
cd your-app-directory
npm start
```
If this doesn't work, fix your web app first.

### Step 2: Build and Sync
```bash
npm run build
npx cap sync
```

### Step 3: Open in Android Studio
```bash
npx cap open android
```

### Step 4: Check Android Logcat
In Android Studio, open **Logcat** and filter by your app package name to see any errors.

## 🌐 Website Compatibility

### If Your Website Has CORS Issues:
1. **Add CORS headers** to your website server
2. **Use the external browser option** in the app
3. **Consider a proxy server** for development

### If Your Website Requires Authentication:
1. **Implement deep linking** to handle login flows
2. **Use @capacitor/browser** for OAuth flows
3. **Store tokens** using @capacitor/preferences

### If Your Website Uses HTTPS Only:
The app is configured to handle HTTPS websites properly, but some features might not work in HTTP mode.

## 🚨 Common Error Messages

### "net::ERR_CLEARTEXT_NOT_PERMITTED"
- **Cause**: Android blocking HTTP traffic
- **Solution**: Network security config is already added

### "Mixed Content Blocked"
- **Cause**: HTTPS page loading HTTP resources  
- **Solution**: WebView settings are configured to allow this

### "X-Frame-Options: DENY"
- **Cause**: Website blocks iframe embedding
- **Solution**: App shows external browser option

### "Connection timed out"
- **Cause**: Network issues or website down
- **Solution**: App shows retry option

## 🎯 Best Practices

### For Website Owners:
1. **Add CORS headers**: `Access-Control-Allow-Origin: *`
2. **Avoid X-Frame-Options: DENY** for webview apps
3. **Use relative URLs** instead of absolute ones where possible
4. **Test with mobile user agents**

### For App Developers:
1. **Always test on real devices**, not just emulators
2. **Implement fallback options** (external browser)
3. **Add error handling** for network issues
4. **Consider offline capabilities**

## 📱 Testing Checklist

- [ ] App loads in browser (`npm start`)
- [ ] App builds without errors (`npm run build`)
- [ ] Capacitor sync completes (`npx cap sync`)
- [ ] Android Studio can open the project
- [ ] App loads on Android emulator
- [ ] App loads on real Android device
- [ ] External browser option works
- [ ] Error states display properly

## 🔗 Resources

- [Capacitor Android Configuration](https://capacitorjs.com/docs/android/configuration)
- [Android Network Security Config](https://developer.android.com/training/articles/security-config)
- [CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [WebView Debugging Guide](https://developers.google.com/web/tools/chrome-devtools/remote-debugging/webviews)

---

**Need more help?** Check the browser console and Android Logcat for specific error messages!
