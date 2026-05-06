import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomNav } from '@/components/navigation/bottom-nav';
import { useAuth } from '@/context/AuthContext';
import { BookingDto, deleteBooking, getBookings } from '@/lib/api';

function formatDisplayDate(value: string | null) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleDateString('da-DK', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

export default function MyBookingsScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [deletingBookingId, setDeletingBookingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  const loadBookings = useCallback(async () => {
    if (!user) {
      setLoadingBookings(false);
      return;
    }

    setLoadingBookings(true);
    const result = await getBookings(user.userId);

    if (result.error) {
      Alert.alert('Kunne ikke hente bookinger', result.error);
      setLoadingBookings(false);
      return;
    }

    setBookings(result.data ?? []);
    setLoadingBookings(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings]),
  );

  const handleDeleteBooking = (booking: BookingDto) => {
    if (!user || !booking.bookingId) {
      return;
    }

    Alert.alert(
      'Slet vasketid',
      'Vil du fjerne denne booking?',
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Slet',
          style: 'destructive',
          onPress: async () => {
            setDeletingBookingId(booking.bookingId!);
            const result = await deleteBooking(booking.bookingId!, user.userId);
            setDeletingBookingId(null);

            if (result.error) {
              Alert.alert('Kunne ikke slette bookingen', result.error);
              return;
            }

            await loadBookings();
          },
        },
      ],
    );
  };

  if (isLoading || loadingBookings) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>Mine vasketider</Text>
          <View style={styles.iconButton} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {bookings.length === 0 ? (
            <Text style={styles.emptyText}>Du har ingen bookede vasketider endnu.</Text>
          ) : (
            bookings.map((booking) => (
              <View key={booking.bookingId} style={styles.bookingCard}>
                <View style={styles.bookingRow}>
                  <View style={styles.bookingContent}>
                    <Text style={styles.bookingTitle}>Vaskeri</Text>
                    <Text style={styles.bookingMeta}>
                      {formatDisplayDate(booking.date)} | {booking.startTime} - {booking.endTime}
                    </Text>
                  </View>

                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDeleteBooking(booking)}
                    disabled={deletingBookingId === booking.bookingId}
                  >
                    <Ionicons
                      name={deletingBookingId === booking.bookingId ? 'hourglass-outline' : 'trash-outline'}
                      size={18}
                      color="#B42318"
                    />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <BottomNav
          active="washing"
          onHomePress={() => router.replace('/home')}
          onWashingPress={() => router.replace('/book-washing')}
          onPartyPress={() => router.push('/book-partyroom')}
          onProfilePress={() => router.push('/profile')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 120,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  bookingCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bookingContent: {
    flex: 1,
  },
  bookingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  bookingMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
});
