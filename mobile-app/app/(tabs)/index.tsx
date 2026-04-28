import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiBaseUrl, fetchDashboard } from '@/lib/api';

type DashboardState = Awaited<ReturnType<typeof fetchDashboard>>;

export default function HomeScreen() {
  const [data, setData] = useState<DashboardState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);
      const dashboard = await fetchDashboard();
      setData(dashboard);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D8E8E2', dark: '#1E2C2A' }}
      headerImage={<View style={styles.headerBlob} />}>
      <ThemedView style={styles.hero}>
        <ThemedText type="title">Resident Hub</ThemedText>
        <ThemedText>Spring Boot API connected to Expo at {apiBaseUrl}</ThemedText>
      </ThemedView>

      {loading ? (
        <ThemedView style={styles.panel}>
          <ActivityIndicator size="large" />
          <ThemedText>Loading community data...</ThemedText>
        </ThemedView>
      ) : null}

      {error ? (
        <ThemedView style={styles.panel}>
          <ThemedText type="subtitle">Connection issue</ThemedText>
          <ThemedText>{error}</ThemedText>
          <ThemedText>
            Set `EXPO_PUBLIC_API_BASE_URL` or `EXPO_PUBLIC_API_HOST` if your device cannot reach
            `localhost`.
          </ThemedText>
          <Pressable onPress={loadDashboard} style={styles.button}>
            <ThemedText type="defaultSemiBold">Retry</ThemedText>
          </Pressable>
        </ThemedView>
      ) : null}

      {data ? (
        <>
          <ThemedView style={styles.metricsRow}>
            <MetricCard label="Residents" value={String(data.users.length)} />
            <MetricCard label="Facilities" value={String(data.facilities.length)} />
            <MetricCard label="Bookings" value={String(data.bookings.length)} />
          </ThemedView>

          <ThemedView style={styles.panel}>
            <ThemedText type="subtitle">Upcoming booking</ThemedText>
            {data.bookings[0] ? (
              <>
                <ThemedText type="defaultSemiBold">
                  {data.bookings[0].facility.name} • {data.bookings[0].date}
                </ThemedText>
                <ThemedText>
                  {data.bookings[0].startTime} - {data.bookings[0].endTime} for{' '}
                  {data.bookings[0].user.firstName} {data.bookings[0].user.lastName}
                </ThemedText>
              </>
            ) : (
              <ThemedText>No bookings found.</ThemedText>
            )}
          </ThemedView>

          <ThemedView style={styles.panel}>
            <ThemedText type="subtitle">Important post</ThemedText>
            {data.posts[0] ? (
              <>
                <ThemedText type="defaultSemiBold">{data.posts[0].title}</ThemedText>
                <ThemedText>{data.posts[0].content}</ThemedText>
              </>
            ) : (
              <ThemedText>No posts found.</ThemedText>
            )}
          </ThemedView>

          <ThemedView style={styles.panel}>
            <ThemedText type="subtitle">Facilities</ThemedText>
            {data.facilities.map((facility) => (
              <ThemedText key={facility.facilityId}>
                {facility.name} • {facility.type} • {facility.status}
              </ThemedText>
            ))}
          </ThemedView>
        </>
      ) : null}
    </ParallaxScrollView>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView style={styles.metricCard}>
      <ThemedText type="defaultSemiBold">{value}</ThemedText>
      <ThemedText>{label}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 8,
    marginBottom: 12,
  },
  panel: {
    gap: 8,
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(127, 176, 157, 0.16)',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(36, 91, 76, 0.14)',
    gap: 6,
  },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(36, 91, 76, 0.22)',
  },
  headerBlob: {
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: '#7fb09d',
    position: 'absolute',
    right: -30,
    top: 10,
  },
});
