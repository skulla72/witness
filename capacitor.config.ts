import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Witness native shell (iOS + Android).
 *
 * Witness runs as a server-rendered app, so the native shell loads the live
 * published site instead of a bundled static export. `mobile/webroot` only holds
 * the offline fallback screen that shows when the phone has no connection.
 */
const config: CapacitorConfig = {
  appId: 'com.commonlight.witness',
  appName: 'Witness',
  webDir: 'mobile/webroot',
  server: {
    url: 'https://witnessmovement.com',
    hostname: 'witnessmovement.com',
    androidScheme: 'https',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0b1729',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
