import { Component, OnInit } from '@angular/core';
import { IonApp, IonContent, IonButton, IonIcon, IonText, IonSpinner } from '@ionic/angular/standalone';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { globe, refresh, home, eye } from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonContent, IonButton, IonIcon, IonText, IonSpinner, CommonModule],
})
export class AppComponent implements OnInit {
  websiteUrl = 'https://example.com';
  safeUrl: SafeResourceUrl;
  isNative = false;
  loadingError = false;
  isLoading = true;
  showContent = false;
  
  constructor(private sanitizer: DomSanitizer) {
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.websiteUrl);
    this.isNative = Capacitor.isNativePlatform();
    
    // Add icons
    addIcons({ globe, refresh, home, eye });
  }

  async ngOnInit() {
    if (this.isNative) {
      // On native platforms, redirect to the website URL directly
      // This uses the native WebView to load the website fullscreen
      await this.loadInNativeWebView();
    } else {
      // On web platforms, show iframe fallback
      this.showContent = true;
      this.checkUrlAccessibility();
    }
  }

  async loadInNativeWebView() {
    try {
      // Show loading for a brief moment, then redirect
      setTimeout(() => {
        // Use Capacitor's native WebView to navigate to the website
        window.location.href = this.websiteUrl;
      }, 1500); // Show loading spinner for 1.5 seconds for better UX
    } catch (error) {
      console.error('Error loading website in native WebView:', error);
      this.loadingError = true;
      this.isLoading = false;
      this.showContent = true;
    }
  }

  async checkUrlAccessibility() {
    // Don't perform accessibility check for web platform iframe
    // The iframe will handle errors automatically
  }

  async openInExternalBrowser() {
    if (this.isNative) {
      await Browser.open({ url: this.websiteUrl });
    } else {
      window.open(this.websiteUrl, '_blank');
    }
  }

  async openInInAppBrowser() {
    if (this.isNative) {
      await Browser.open({ 
        url: this.websiteUrl,
        windowName: '_self'  // Opens in the same window/app
      });
    } else {
      // For web, redirect to the website
      window.location.href = this.websiteUrl;
    }
  }

  async reloadWebsite() {
    this.loadingError = false;
    this.isLoading = true;
    this.showContent = false;
    
    if (this.isNative) {
      await this.loadInNativeWebView();
    } else {
      const iframe = document.querySelector('iframe');
      if (iframe) {
        iframe.src = iframe.src; // Reload iframe
      }
      this.showContent = true;
    }
  }

  onIframeError() {
    console.error('Iframe failed to load website');
    this.loadingError = true;
    this.isLoading = false;
  }

  onIframeLoad() {
    console.log('Iframe loaded successfully');
    this.loadingError = false;
    this.isLoading = false;
    // Add loaded class for smooth transition
    const iframe = document.querySelector('iframe');
    if (iframe) {
      iframe.classList.add('loaded');
    }
  }
}
