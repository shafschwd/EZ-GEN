import { Component, OnInit } from '@angular/core';
import { IonApp, IonContent, IonButton, IonIcon, IonText } from '@ionic/angular/standalone';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { globe, refresh, home } from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonContent, IonButton, IonIcon, IonText, CommonModule],
})
export class AppComponent implements OnInit {
  websiteUrl = 'https://example.com';
  safeUrl: SafeResourceUrl;
  isNative = false;
  loadingError = false;
  
  constructor(private sanitizer: DomSanitizer) {
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.websiteUrl);
    this.isNative = Capacitor.isNativePlatform();
    
    // Add icons
    addIcons({ globe, refresh, home });
  }

  async ngOnInit() {
    if (this.isNative) {
      // On native platforms, try to load the URL in the app's webview
      // If that fails, we'll show controls to open in external browser
      this.checkUrlAccessibility();
    }
  }

  async checkUrlAccessibility() {
    try {
      // Test if the URL is accessible
      const response = await fetch(this.websiteUrl, { method: 'HEAD', mode: 'no-cors' });
      console.log('URL accessibility check completed');
    } catch (error) {
      console.warn('URL may not be accessible in webview:', error);
      this.loadingError = true;
    }
  }

  async openInExternalBrowser() {
    if (this.isNative) {
      await Browser.open({ url: this.websiteUrl });
    } else {
      window.open(this.websiteUrl, '_blank');
    }
  }

  async reloadWebsite() {
    this.loadingError = false;
    const iframe = document.querySelector('iframe');
    if (iframe) {
      iframe.src = iframe.src; // Reload iframe
    }
  }

  onIframeError() {
    console.error('Iframe failed to load website');
    this.loadingError = true;
  }

  onIframeLoad() {
    console.log('Iframe loaded successfully');
    this.loadingError = false;
    // Add loaded class for smooth transition
    const iframe = document.querySelector('iframe');
    if (iframe) {
      iframe.classList.add('loaded');
    }
  }
}
