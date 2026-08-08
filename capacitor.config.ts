import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.apexbeast.apexbeastif',
  appName: 'APEXBEAST-IF',
  webDir: 'dist',
  ios: {
    allowsLinkPreview: false,
  },
  server: {
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
