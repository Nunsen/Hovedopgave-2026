import { ExpoConfig, ConfigContext } from 'expo/config';

const localIp = process.env.EXPO_PUBLIC_API_HOST ?? '10.136.139.62';
const apiPort = process.env.EXPO_PUBLIC_API_PORT ?? '8080';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'mobile-app',
  slug: config.slug ?? 'mobile-app',
  version: config.version ?? '1.0.0',
  extra: {
    ...config.extra,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? `http://${localIp}:${apiPort}/api`,
  },
});
