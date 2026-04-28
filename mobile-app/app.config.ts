import { ExpoConfig, ConfigContext } from 'expo/config';

const localIp = process.env.EXPO_PUBLIC_API_HOST ?? '192.168.1.10';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'mobile-app',
  slug: config.slug ?? 'mobile-app',
  version: config.version ?? '1.0.0',
  extra: {
    ...config.extra,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? `http://${localIp}:8080/api`,
  },
});
