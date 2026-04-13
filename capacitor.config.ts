import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ksombeast.ksom360',
  appName: 'KSOM360',
  webDir: 'dist',
  ios: {
    // Prevent stale WebView cache — always load fresh bundled assets
    allowsLinkPreview: false,
  },
  // Load the app from the current live production URL
  server: {
    url: 'https://everfit-stride-cloud.lovable.app',
    androidScheme: 'https',
    iosScheme: 'capacitor',
    cleartext: false,
  },
  plugins: {
    CapacitorHealthConnect: {
      // Android Health Connect configuration
    },
    CapacitorHealthKit: {
      // iOS HealthKit configuration
    }
  }
};

export default config;
