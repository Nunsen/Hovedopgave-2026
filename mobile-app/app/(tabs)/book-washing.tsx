import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  BookingFacilityAvailabilityDto,
  BookingSlotDto,
  createBooking,
  deleteBooking,
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
  const { logout, user, isLoading } = useAuth();
  const dateOptions = useMemo(() => createDateOptions(), []);

  const [selectedDate, setSelectedDate] = useState(formatDate(dateOptions[0]));
  const [availability, setAvailability] = useState<BookingAvailabilityDto | null>(null);
  const [userBookings, setUserBookings] = useState<BookingDto[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingSlotKey, setBookingSlotKey] = useState<string | null>(null);
  const [deletingBookingId, setDeletingBookingId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  const loadAvailability = useCallback(async () => {
    setLoadingAvailability(true);

    const result = await getBookingAvailability(selectedDate, user?.userId);

    if (result.error) {
      Alert.alert('Kunne ikke hente ledige tider', result.error);
      setLoadingAvailability(false);
      return;
    }

    setAvailability(result.data ?? null);
    setLoadingAvailability(false);
  }, [selectedDate, user?.userId]);

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

  const handleLogout = async () => {
    setIsSidebarOpen(false);
    await logout();
    router.replace('/login');
  };

  const handleBookSlot = async (facilityId: number, slot: BookingSlotDto) => {
    if (!user || !slot.available) {
      return;
    }

    const slotKey = `${facilityId}-${selectedDate}-${slot.startTime}`;
    setBookingSlotKey(slotKey);

    const result = await createBooking({
      userId: user.userId,
      facilityId,
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
    Alert.alert('Tid booket', `Du har booket ${slot.startTime} - ${slot.endTime} den ${formatDisplayDate(selectedDate)}.`);
  };

  const handleDeleteBooking = async (bookingId: number) => {
    if (!user) {
      return;
    }

    setDeletingBookingId(bookingId);
    const result = await deleteBooking(bookingId, user.userId);
    setDeletingBookingId(null);

    if (result.error) {
      Alert.alert('Kunne ikke slette bookingen', result.error);
      return;
    }

    await Promise.all([loadAvailability(), loadUserBookings()]);
  };

  const confirmDeleteBooking = (bookingId: number) => {
    Alert.alert(
      'Slet booking',
      'Vil du fjerne denne booking?',
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Slet',
          style: 'destructive',
          onPress: async () => {
            await handleDeleteBooking(bookingId);
          },
        },
      ],
    );
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
        <Modal
          transparent
          visible={isSidebarOpen}
          animationType="fade"
          onRequestClose={() => setIsSidebarOpen(false)}
        >
          <View style={styles.sidebarOverlay}>
            <Pressable style={styles.sidebarBackdrop} onPress={() => setIsSidebarOpen(false)} />

            <View style={styles.sidebarPanel}>
              <View>
                <View style={styles.sidebarHeader}>
                  <Text style={styles.sidebarTitle}>Menu</Text>
                  <Pressable style={styles.sidebarCloseButton} onPress={() => setIsSidebarOpen(false)}>
                    <Ionicons name="close" size={22} color="#111827" />
                  </Pressable>
                </View>

                <View style={styles.sidebarUserCard}>
                  <Text style={styles.sidebarUserName}>{user.fullName}</Text>
                  <Text style={styles.sidebarUserMeta}>{user.email}</Text>
                  <Text style={styles.sidebarUserMeta}>{user.role}</Text>
                </View>

                <Pressable
                  style={styles.sidebarLink}
                  onPress={() => {
                    setIsSidebarOpen(false);
                    router.replace('/home');
                  }}
                >
                  <Ionicons name="home-outline" size={20} color="#111827" />
                  <Text style={styles.sidebarLinkText}>Forside</Text>
                </Pressable>

                <Pressable
                  style={styles.sidebarLink}
                  onPress={() => {
                    setIsSidebarOpen(false);
                    router.push('/new-post');
                  }}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#111827" />
                  <Text style={styles.sidebarLinkText}>Nyt opslag</Text>
                </Pressable>

                <Pressable
                  style={styles.sidebarLink}
                  onPress={() => {
                    setIsSidebarOpen(false);
                    router.push('/profile');
                  }}
                >
                  <Ionicons name="person-outline" size={20} color="#111827" />
                  <Text style={styles.sidebarLinkText}>Profil</Text>
                </Pressable>

                <Pressable
                  style={styles.sidebarLink}
                  onPress={() => {
                    setIsSidebarOpen(false);
                    router.replace('/book-washing');
                  }}
                >
                  <MaterialCommunityIcons name="washing-machine" size={20} color="#111827" />
                  <Text style={styles.sidebarLinkText}>Vaskeri</Text>
                </Pressable>
              </View>

              <Pressable style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
                <Text style={styles.logoutButtonText}>Log ud</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.iconButton} onPress={() => setIsSidebarOpen(true)}>
              <Feather name="menu" size={22} color="#1F2937" />
            </Pressable>
            <MaterialCommunityIcons name="washing-machine" size={26} color="#3F7FC4" />
            <Text style={styles.headerTitle}>Vasketider</Text>
          </View>

          <View style={styles.iconButtonPlaceholder} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mine kommende vasketider</Text>

            {loadingBookings ? (
              <ActivityIndicator style={styles.inlineLoader} />
            ) : userBookings.length === 0 ? (
              <Text style={styles.emptyText}>Du har ingen kommende vasketider endnu.</Text>
            ) : (
              userBookings.slice(0, 4).map((booking) => (
                <View key={booking.bookingId} style={styles.bookingCard}>
                  <View style={styles.bookingCardContent}>
                    <Text style={styles.bookingTitle}>{booking.facilityName ?? 'Vaskeri'}</Text>
                    <Text style={styles.bookingMeta}>
                      {booking.date ? formatDisplayDate(booking.date) : ''} | {booking.startTime} - {booking.endTime}
                    </Text>
                  </View>

                  <Pressable
                    style={styles.deleteBookingButton}
                    onPress={() => booking.bookingId && confirmDeleteBooking(booking.bookingId)}
                    disabled={deletingBookingId === booking.bookingId}
                  >
                    <Ionicons
                      name={deletingBookingId === booking.bookingId ? 'hourglass-outline' : 'trash-outline'}
                      size={18}
                      color="#B42318"
                    />
                  </Pressable>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vaelg dato</Text>

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
                <Text style={styles.sectionTitle}>Ledige tider</Text>
                <Text style={styles.sectionSubtext}>{formatDisplayDate(selectedDate)}</Text>
              </View>

              <Pressable style={styles.refreshButton} onPress={loadAvailability}>
                <Ionicons name="refresh" size={18} color="#3F7FC4" />
              </Pressable>
            </View>

            <View style={styles.legendRow}>
              <LegendDot color="#D1FAE5" label="Ledig" />
              <LegendDot color="#FEE2E2" label="Optaget" />
              <LegendDot color="#FED7AA" label="Din booking" />
            </View>
          </View>

          {(availability?.facilities ?? []).map((facility) => (
            <FacilitySection
              key={facility.facilityId}
              facility={facility}
              selectedDate={selectedDate}
              bookingSlotKey={bookingSlotKey}
              deletingBookingId={deletingBookingId}
              onBook={handleBookSlot}
              onDelete={confirmDeleteBooking}
            />
          ))}
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

function FacilitySection({
  facility,
  selectedDate,
  bookingSlotKey,
  deletingBookingId,
  onBook,
  onDelete,
}: {
  facility: BookingFacilityAvailabilityDto;
  selectedDate: string;
  bookingSlotKey: string | null;
  deletingBookingId: number | null;
  onBook: (facilityId: number, slot: BookingSlotDto) => void;
  onDelete: (bookingId: number) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.machineTitle}>{facility.facilityName}</Text>

      <View style={styles.slotGrid}>
        {facility.slots.map((slot) => {
          const slotKey = `${facility.facilityId}-${selectedDate}-${slot.startTime}`;
          const isSubmitting = bookingSlotKey === slotKey;
          const isDeleting = slot.bookingId != null && deletingBookingId === slot.bookingId;
          const canDelete = !slot.available && slot.ownedByCurrentUser && !!slot.bookingId;

          return (
            <Pressable
              key={slotKey}
              style={[
                styles.slotCard,
                slot.available ? styles.slotAvailable : canDelete ? styles.slotOwned : styles.slotUnavailable,
              ]}
              disabled={(!slot.available && !canDelete) || isSubmitting || isDeleting}
              onPress={() => {
                if (canDelete && slot.bookingId) {
                  onDelete(slot.bookingId);
                  return;
                }

                onBook(facility.facilityId, slot);
              }}
            >
              <View style={styles.slotHeader}>
                <Text style={styles.slotTime}>
                  {slot.startTime} - {slot.endTime}
                </Text>
                <MaterialCommunityIcons
                  name={slot.available ? 'check-circle-outline' : canDelete ? 'trash-can-outline' : 'close-circle-outline'}
                  size={20}
                  color={slot.available ? '#15803D' : canDelete ? '#B54708' : '#B42318'}
                />
              </View>

              <Text style={styles.slotStatus}>
                {isSubmitting
                  ? 'Booker...'
                  : isDeleting
                    ? 'Sletter...'
                    : slot.available
                      ? 'Ledig tid'
                      : canDelete
                        ? 'Din booking'
                        : 'Optaget'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
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
  sidebarOverlay: {
    flex: 1,
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(17, 24, 39, 0.28)',
  },
  sidebarBackdrop: {
    flex: 1,
  },
  sidebarPanel: {
    width: 278,
    backgroundColor: '#FFFFFF',
    paddingTop: 58,
    paddingHorizontal: 18,
    paddingBottom: 24,
    justifyContent: 'space-between',
    shadowColor: '#111827',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sidebarTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  sidebarCloseButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarUserCard: {
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#EFF6FF',
    marginBottom: 18,
  },
  sidebarUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sidebarUserMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  sidebarLink: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  sidebarLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  logoutButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#3F7FC4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
  iconButtonPlaceholder: {
    width: 34,
    height: 34,
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
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  machineTitle: {
    fontSize: 17,
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
    flexWrap: 'wrap',
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
  slotOwned: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
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
    gap: 12,
  },
  bookingCardContent: {
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
  deleteBookingButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
});
