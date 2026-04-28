import { StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const entities = [
  'User',
  'ActivationCode',
  'Facility',
  'Booking',
  'Post',
  'Comment',
  'CommunityGroup',
  'GroupMember',
  'GroupMessage',
  'Faq',
];

const endpoints = [
  '/api/dashboard',
  '/api/users',
  '/api/facilities',
  '/api/bookings',
  '/api/posts',
  '/api/groups',
  '/api/faqs',
];

export default function ExploreScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#EEE3D3', dark: '#332820' }}
      headerImage={<View style={styles.headerShape} />}>
      <ThemedView style={styles.section}>
        <ThemedText type="title">Backend Setup</ThemedText>
        <ThemedText>
          The Spring Boot backend now contains the full resident platform domain model with seeded
          demo data for Expo.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Entities</ThemedText>
        {entities.map((entity) => (
          <ThemedText key={entity}>{entity}</ThemedText>
        ))}
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Available endpoints</ThemedText>
        {endpoints.map((endpoint) => (
          <ThemedText key={endpoint}>{endpoint}</ThemedText>
        ))}
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Expo connection</ThemedText>
        <ThemedText>
          Use `EXPO_PUBLIC_API_BASE_URL` for a full URL, or `EXPO_PUBLIC_API_HOST` to point the app
          to your machine on the same network.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(198, 145, 86, 0.14)',
  },
  headerShape: {
    width: 240,
    height: 160,
    borderRadius: 28,
    backgroundColor: '#c69156',
    position: 'absolute',
    right: -30,
    top: 18,
    transform: [{ rotate: '-18deg' }],
  },
});
