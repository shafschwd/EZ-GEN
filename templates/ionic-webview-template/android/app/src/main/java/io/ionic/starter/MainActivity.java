package io.ionic.starter;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Configure webview settings for better external website loading
        Bridge bridge = this.getBridge();
        if (bridge != null && bridge.getWebView() != null) {
            WebSettings webSettings = bridge.getWebView().getSettings();
            
            // Enable mixed content (HTTP on HTTPS)
            webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            
            // Enable DOM storage
            webSettings.setDomStorageEnabled(true);
            
            // Enable database storage
            webSettings.setDatabaseEnabled(true);
            
            // Enable JavaScript (should already be enabled)
            webSettings.setJavaScriptEnabled(true);
            
            // Allow file access
            webSettings.setAllowFileAccess(true);
            webSettings.setAllowContentAccess(true);
            
            // Enable zooming
            webSettings.setSupportZoom(true);
            webSettings.setBuiltInZoomControls(true);
            webSettings.setDisplayZoomControls(false);
            
            // Improve loading performance
            webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
            // Note: setAppCacheEnabled is deprecated in API 33+
            
            // Set user agent to help with compatibility
            String userAgent = webSettings.getUserAgentString();
            webSettings.setUserAgentString(userAgent + " CapacitorWebView");
        }
    }
}
