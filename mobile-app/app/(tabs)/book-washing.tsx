import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BottomNav } from '@/components/navigation/bottom-nav';
import { useAuth } from '@/context/AuthContext';
import {
  BookingAvailabilityDto,
  BookingDto,
  BookingSlotDto,
  createBooking,
  getBookingAvailability,
  getBookings,
} from '@/lib/api';

function formatDate(value: Date) {
  return value.toISOString().split('T')[0];
}

function createDateOptions() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  });
}

function formatDisplayDate(value: string) {
  return new Date(value).toLocaleDateString('da-DK', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

export default function BookWashingScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const dateOptions = useMemo(() => createDateOptions(), []);

  const [selectedDate, setSelectedDate] = useState(formatDate(dateOptions[0]));
  const [availability, setAvailability] = useState<BookingAvailabilityDto | null>(null);
  const [userBookings, setUserBookings] = useState<BookingDto[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingSlotKey, setBookingSlotKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  const loadAvailability = useCallback(async () => {
    setLoadingAvailability(true);

    const result = await getBookingAvailability(selectedDate);

    if (result.error) {
      Alert.alert('Kunne ikke hente ledige tider', result.error);
      setLoadingAvailability(false);
      return;
    }

    setAvailability(result.data ?? null);
    setLoadingAvailability(false);
  }, [selectedDate]);

  const loadUserBookings = useCallback(async () => {
    if (!user) {
      setLoadingBookings(false);
      return;
    }

    setLoadingBookings(true);
    const result = await getBookings(user.userId);

    if (result.error) {
      Alert.alert('Kunne ikke hente dine bookinger', result.error);
      setLoadingBookings(false);
      return;
    }

    const sortedBookings = [...(result.data ?? [])].sort((left, right) => {
      const leftValue = `${left.date ?? ''} ${left.startTime ?? ''}`;
      const rightValue = `${right.date ?? ''} ${right.startTime ?? ''}`;
      return leftValue.localeCompare(rightValue);
    });

    setUserBookings(sortedBookings);
    setLoadingBookings(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadUserBookings();
    }, [loadUserBookings]),
  );

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const handleBookSlot = async (slot: BookingSlotDto) => {
    if (!user || !availability) {
      return;
    }

    if (!slot.available) {
      return;
    }

    const slotKey = `${selectedDate}-${slot.startTime}`;
    setBookingSlotKey(slotKey);

    const result = await createBooking({
      userId: user.userId,
      facilityId: availability.facilityId,
      date: selectedDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });

    setBookingSlotKey(null);

    if (result.error) {
      Alert.alert('Kunne ikke booke tid', result.error.message);
      await loadAvailability();
      return;
    }

    await Promise.all([loadAvailability(), loadUserBookings()]);
    Alert.alert('Vasketid booket', `Du har booket ${slot.startTime} - ${slot.endTime} den ${formatDisplayDate(selectedDate)}.`);
  };

  if (isLoading || loadingAvailability) {
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
          <View style={styles.headerLeft}>
            <Pressable style={styles.iconButton} onPress={() => router.replace('/home')}>
              <Ionicons name="arrow-back" size={22} color="#111827" />
            </Pressable>
            <MaterialCommunityIcons name="washing-machine" size={26} color="#3F7FC4" />
            <Text style={styles.headerTitle}>Vasketider</Text>
          </View>

          <Pressable style={styles.iconButton} onPress={() => router.push('/my-bookings')}>
            <Ionicons name="list-outline" size={22} color="#111827" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Se ledige tider i vaskeriet</Text>
            <Text style={styles.heroText}>
              Vælg en dato for at se ledige tidsrum. Optagede tider kan ikke bookes.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vælg dato</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateRow}
            >
              {dateOptions.map((date) => {
                const dateValue = formatDate(date);
                const isActive = selectedDate === dateValue;

                return (
                  <Pressable
                    key={dateValue}
                    style={[styles.dateCard, isActive ? styles.dateCardActive : null]}
                    onPress={() => setSelectedDate(dateValue)}
                  >
                    <Text style={[styles.dateWeekday, isActive ? styles.dateTextActive : null]}>
                      {date.toLocaleDateString('da-DK', { weekday: 'short' })}
                    </Text>
                    <Text style={[styles.dateDay, isActive ? styles.dateTextActive : null]}>
                      {date.toLocaleDateString('da-DK', { day: '2-digit' })}
                    </Text>
                    <Text style={[styles.dateMonth, isActive ? styles.dateTextActive : null]}>
                      {date.toLocaleDateString('da-DK', { month: 'short' })}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Vaskeri</Text>
                <Text style={styles.sectionSubtext}>{formatDisplayDate(selectedDate)}</Text>
              </View>

              <Pressable style={styles.refreshButton} onPress={loadAvailability}>
                <Ionicons name="refresh" size={18} color="#3F7FC4" />
              </Pressable>
            </View>

            <View style={styles.legendRow}>
              <LegendDot color="#D1FAE5" label="Ledig" />
              <LegendDot color="#FEE2E2" label="Optaget" />
            </View>

            <View style={styles.slotGrid}>
              {availability?.slots.map((slot) => {
                const slotKey = `${selectedDate}-${slot.startTime}`;
                const isSubmitting = bookingSlotKey === slotKey;

                return (
                  <Pressable
                    key={slotKey}
                    style={[
                      styles.slotCard,
                      slot.available ? styles.slotAvailable : styles.slotUnavailable,
                    ]}
                    disabled={!slot.available || isSubmitting}
                    onPress={() => handleBookSlot(slot)}
                  >
                    <View style={styles.slotHeader}>
                      <Text style={styles.slotTime}>
                        {slot.startTime} - {slot.endTime}
                      </Text>
                      <MaterialCommunityIcons
                        name={slot.available ? 'check-circle-outline' : 'close-circle-outline'}
                        size={20}
                        color={slot.available ? '#15803D' : '#B42318'}
                      />
                    </View>

                    <Text style={styles.slotStatus}>
                      {isSubmitting ? 'Booker...' : slot.available ? 'Ledig tid' : 'Optaget'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mine kommende bookinger</Text>

            {loadingBookings ? (
              <ActivityIndicator style={styles.inlineLoader} />
            ) : userBookings.length === 0 ? (
              <Text style={styles.emptyText}>Du har ingen kommende vasketider endnu.</Text>
            ) : (
              userBookings.slice(0, 4).map((booking) => (
                <View key={booking.bookingId} style={styles.bookingCard}>
                  <View>
                    <Text style={styles.bookingTitle}>Vaskeri</Text>
                    <Text style={styles.bookingMeta}>
                      {booking.date ? formatDisplayDate(booking.date) : ''} · {booking.startTime} - {booking.endTime}
                    </Text>
                  </View>

                  <View style={styles.bookingBadge}>
                    <Text style={styles.bookingBadgeText}>Booket</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <BottomNav
          active="washing"
          onHomePress={() => router.replace('/home')}
          onWashingPress={() => router.replace('/book-washing')}
          onProfilePress={() => router.push('/profile')}
        />
      </View>
    </SafeAreaView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    gap: 14,
  },
  heroSection: {
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#4B5563',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  sectionSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  dateRow: {
    gap: 10,
  },
  dateCard: {
    width: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCardActive: {
    backgroundColor: '#3F7FC4',
    borderColor: '#3F7FC4',
  },
  dateWeekday: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  dateDay: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginVertical: 2,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  dateTextActive: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  legendLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  slotGrid: {
    gap: 10,
  },
  slotCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  slotAvailable: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  slotUnavailable: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  slotTime: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  slotStatus: {
    fontSize: 13,
    color: '#4B5563',
  },
  inlineLoader: {
    marginTop: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  bookingBadge: {
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bookingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
});
