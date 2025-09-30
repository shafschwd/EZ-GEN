Play Store Background Location Guide

When you request the `ACCESS_BACKGROUND_LOCATION` permission you must provide a clear and honest declaration to Google Play and to users explaining why background location is necessary. Follow these steps:

1) Only request background location if your app truly requires it for user-visible features (e.g., turn-by-turn navigation, ongoing activity tracking).

2) Provide a prominent in-app disclosure before requesting background access. The disclosure should explain:
   - What data is collected (location) and the frequency/conditions.
   - Why background location is necessary and how it benefits the user.
   - How to disable the feature and what happens if they deny permission.

3) On Android 11+ the runtime flow should:
   - Request foreground location (ACCESS_COARSE/FINE).
   - If foreground granted and the app needs background access, present the in-app disclosure and then request ACCESS_BACKGROUND_LOCATION.
   - If the user denies and selects "Don't ask again", direct them to App Settings to enable the permission.

4) Update your Play Console: Under "App content" add the Background Location form and provide accurate responses and a privacy policy link.

5) Ensure your privacy policy includes location usage details, retention time, and third-party sharing policies.

6) Test thoroughly on Android 10/11/12/13 devices and emulators.

Suggested in-app disclosure template:
"Timeless uses your location in the background to provide continuous location-based features such as automatic location-based reminders and tracking. Background location allows the app to work even when it's not on screen. You can choose to allow foreground-only location if you prefer. You can change this later in Settings." 

Add this document to your docs and include the disclosure text in the UI before the background permission request.
