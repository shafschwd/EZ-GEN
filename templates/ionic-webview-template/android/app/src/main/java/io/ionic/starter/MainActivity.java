package {{PACKAGE_NAME}};

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.WebSettings;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Configure window insets to respect system UI (status bar, navigation bar, notch)
        setupWindowInsets();
        
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
    
     private void setupWindowInsets() {
        View decorView = getWindow().getDecorView();

        // Set up window insets listener to handle system UI overlays with newer AndroidX libraries
        ViewCompat.setOnApplyWindowInsetsListener(decorView, (v, windowInsets) -> {
            // For newer AndroidX Core libraries
            // Get system bars insets (status bar, navigation bar, etc.)
            androidx.core.graphics.Insets systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            androidx.core.graphics.Insets displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout());

            // Apply padding to the root view to avoid overlap with system UI
            int topInset = Math.max(systemBars.top, displayCutout.top);
            int bottomInset = Math.max(systemBars.bottom, displayCutout.bottom);
            int leftInset = Math.max(systemBars.left, displayCutout.left);
            int rightInset = Math.max(systemBars.right, displayCutout.right);

            v.setPadding(leftInset, topInset, rightInset, bottomInset);

            return WindowInsetsCompat.CONSUMED;
        });

        // Enable edge-to-edge display while respecting system UI
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+ (API 30+)
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                // Show status bar but make it transparent
                controller.show(WindowInsets.Type.statusBars());
            }
        } else {
            // Android 10 and below
            decorView.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            );
        }
    }
}
