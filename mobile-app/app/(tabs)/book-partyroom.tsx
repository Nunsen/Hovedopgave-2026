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
  BookingDto,
  CreateBookingError,
  createPartyRoomBooking,
  deleteBooking,
  getBookings,
  getPartyRoomAvailability,
  PartyRoomAvailabilityDto,
  PartyRoomDayAvailabilityDto,
} from '@/lib/api';

function formatMonthValue(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

function formatDisplayDate(value: string) {
  return new Date(value).toLocaleDateString('da-DK', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

function getFacilityStatusLabel(status: string | null | undefined) {
  const normalizedStatus = status?.trim().toUpperCase() ?? '';

  if (normalizedStatus === 'OUT_OF_ORDER') {
    return 'Ude af drift';
  }

  return '';
}

function formatMonthLabel(value: Date) {
  return value.toLocaleDateString('da-DK', {
    month: 'long',
    year: 'numeric',
  });
}

const weekdayLabels = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'];

export default function BookPartyRoomScreen() {
  const router = useRouter();
  const { logout, user, isLoading } = useAuth();
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [availability, setAvailability] = useState<PartyRoomAvailabilityDto | null>(null);
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [selectedDay, setSelectedDay] = useState<PartyRoomDayAvailabilityDto | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingBookingId, setDeletingBookingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  const loadAvailability = useCallback(async () => {
    setLoadingAvailability(true);
    const result = await getPartyRoomAvailability(formatMonthValue(visibleMonth), user?.userId);

    if (result.error) {
      Alert.alert('Kunne ikke hente festsalen', result.error);
      setLoadingAvailability(false);
      return;
    }

    const nextAvailability = result.data ?? null;
    setAvailability(nextAvailability);
    setLoadingAvailability(false);
  }, [user?.userId, visibleMonth]);

  const loadBookings = useCallback(async () => {
    if (!user) {
      return;
    }

    const result = await getBookings(user.userId);

    if (result.error) {
      Alert.alert('Kunne ikke hente dine bookinger', result.error);
      return;
    }

    const filteredBookings = (result.data ?? []).filter((booking) => booking.facilityName?.toLowerCase().includes('fest'));
    setBookings(filteredBookings);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings]),
  );

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const handleLogout = async () => {
    setIsSidebarOpen(false);
    await logout();
    router.replace('/login');
  };

  const handleSelectDay = (day: PartyRoomDayAvailabilityDto) => {
    if (!day.inCurrentMonth) {
      return;
    }

    if (day.status === 'owned' && day.bookingId) {
      confirmDeleteBooking(day.bookingId);
      return;
    }

    if (day.status !== 'available') {
      return;
    }

    setSelectedDay(day);
  };

  const handleConfirmBooking = async () => {
    if (!user || !selectedDay || selectedDay.status !== 'available') {
      return;
    }

    setSubmitting(true);
    const result = await createPartyRoomBooking({
      userId: user.userId,
      date: selectedDay.date,
    });
    setSubmitting(false);

    if (result.error) {
      Alert.alert('Kunne ikke booke festsalen', (result.error as CreateBookingError).message);
      await loadAvailability();
      return;
    }

    setSelectedDay(null);
    await Promise.all([loadAvailability(), loadBookings()]);
    Alert.alert('Festsal booket', `Du har booket festsalen den ${formatDisplayDate(result.data?.date ?? selectedDay.date)}.`);
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

    await Promise.all([loadAvailability(), loadBookings()]);
    setSelectedDay(null);
  };

  const confirmDeleteBooking = (bookingId: number) => {
    Alert.alert(
      'Slet booking',
      'Vil du fjerne reservationen af festsalen?',
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

  const partyRoomBooking = useMemo(
    () => bookings.find((booking) => booking.date && booking.facilityName?.toLowerCase().includes('fest')) ?? null,
    [bookings],
  );
  const partyRoomOutOfOrder = availability?.facilityStatus?.trim().toUpperCase() === 'OUT_OF_ORDER';

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

                <Pressable style={styles.sidebarLink} onPress={() => { setIsSidebarOpen(false); router.replace('/home'); }}>
                  <Ionicons name="home-outline" size={20} color="#111827" />
                  <Text style={styles.sidebarLinkText}>Forside</Text>
                </Pressable>

                <Pressable style={styles.sidebarLink} onPress={() => { setIsSidebarOpen(false); router.push('/new-post'); }}>
                  <Ionicons name="add-circle-outline" size={20} color="#111827" />
                  <Text style={styles.sidebarLinkText}>Nyt opslag</Text>
                </Pressable>

                <Pressable style={styles.sidebarLink} onPress={() => { setIsSidebarOpen(false); router.push('/profile'); }}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color="#111827" />
                  <Text style={styles.sidebarLinkText}>Chat</Text>
                </Pressable>

                <Pressable style={styles.sidebarLink} onPress={() => { setIsSidebarOpen(false); router.push('/profile'); }}>
                  <Ionicons name="person-outline" size={20} color="#111827" />
                  <Text style={styles.sidebarLinkText}>Profil</Text>
                </Pressable>

                <Pressable style={styles.sidebarLink} onPress={() => { setIsSidebarOpen(false); router.replace('/book-washing'); }}>
                  <MaterialCommunityIcons name="washing-machine" size={20} color="#111827" />
                  <Text style={styles.sidebarLinkText}>Vaskeri</Text>
                </Pressable>

                <Pressable style={styles.sidebarLink} onPress={() => { setIsSidebarOpen(false); router.replace('/book-partyroom'); }}>
                  <MaterialCommunityIcons name="party-popper" size={20} color="#111827" />
                  <Text style={styles.sidebarLinkText}>Festsal</Text>
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
            <Text style={styles.headerTitle}>Book festsal</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mine kommende reservationer</Text>

            {partyRoomBooking ? (
              <View style={styles.bookingCard}>
                <View style={styles.bookingCardContent}>
                  <Text style={styles.bookingTitle}>Festsal</Text>
                  <Text style={styles.bookingMeta}>{formatDisplayDate(partyRoomBooking.date ?? '')}</Text>
                </View>

                <Pressable
                  style={styles.deleteButton}
                  onPress={() => partyRoomBooking.bookingId && confirmDeleteBooking(partyRoomBooking.bookingId)}
                  disabled={deletingBookingId === partyRoomBooking.bookingId}
                >
                  <Ionicons
                    name={deletingBookingId === partyRoomBooking.bookingId ? 'hourglass-outline' : 'trash-outline'}
                    size={18}
                    color="#B42318"
                  />
                </Pressable>
              </View>
            ) : (
              <Text style={styles.emptyText}>Du har ingen kommende reservationer endnu.</Text>
            )}
          </View>

          <View style={styles.calendarCard}>
            <View style={styles.facilityStatusRow}>
              <Text style={styles.sectionTitle}>Festsal</Text>
              {partyRoomOutOfOrder ? (
                <Text
                  style={[
                    styles.facilityStatusBadge,
                    styles.facilityStatusOutOfOrder,
                  ]}
                >
                  {getFacilityStatusLabel(availability?.facilityStatus)}
                </Text>
              ) : null}
            </View>

            {partyRoomOutOfOrder ? (
              <Text style={styles.outOfOrderText}>
                Festsalen er midlertidigt ude af drift og kan ikke bookes.
              </Text>
            ) : null}

            <View style={styles.monthHeader}>
              <Pressable
                style={styles.monthButton}
                onPress={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              >
                <Ionicons name="chevron-back" size={24} color="#111827" />
              </Pressable>

              <Text style={styles.monthLabel}>{formatMonthLabel(visibleMonth)}</Text>

              <Pressable
                style={styles.monthButton}
                onPress={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              >
                <Ionicons name="chevron-forward" size={24} color="#111827" />
              </Pressable>
            </View>

            <View style={styles.weekdayRow}>
              {weekdayLabels.map((label) => (
                <Text key={label} style={styles.weekdayLabel}>{label}</Text>
              ))}
            </View>

            <View style={styles.dayGrid}>
              {(availability?.days ?? []).map((day) => {
                const isSelected = selectedDay?.date === day.date;
                const isOwned = day.status === 'owned';
                const isBooked = day.status === 'booked';
                const isCooldown = day.status === 'cooldown';
                const isDisabled = !day.inCurrentMonth || isBooked || isCooldown || partyRoomOutOfOrder;

                return (
                  <Pressable
                    key={day.date}
                    style={[
                      styles.dayCell,
                      !day.inCurrentMonth ? styles.dayCellOutsideMonth : null,
                      isBooked ? styles.dayCellBooked : null,
                      isCooldown ? styles.dayCellCooldown : null,
                      isOwned ? styles.dayCellOwned : null,
                      isSelected ? styles.dayCellSelected : null,
                    ]}
                    disabled={!day.inCurrentMonth || (isDisabled && !isOwned)}
                    onPress={() => handleSelectDay(day)}
                  >
                    <Text
                      style={[
                        styles.dayCellText,
                        !day.inCurrentMonth ? styles.dayCellTextOutsideMonth : null,
                        (isBooked || isSelected || isOwned) ? styles.dayCellTextOnDark : null,
                      ]}
                    >
                      {day.dayOfMonth}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.legendRow}>
              <LegendSwatch label="Ledig" style={styles.legendAvailable} />
              <LegendSwatch label="Optaget" style={styles.legendBooked} />
              <LegendSwatch label="Din booking" style={styles.legendSelected} />
              <LegendSwatch label="Ude af drift" style={styles.legendOutOfOrder} />
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle-outline" size={24} color="#111827" />
              <Text style={styles.infoTitle}>Information</Text>
            </View>

            <Text style={styles.infoBullet}>• Festsalen bookes for en hel dag.</Text>
            <Text style={styles.infoBullet}>• Der skal gå mindst 3 dage mellem dine reservationer.</Text>
            <Text style={styles.infoBullet}>• Bookede datoer kan ikke vælges af andre beboere.</Text>
            <Text style={styles.infoBullet}>• Du kan fjerne din reservation igen fra denne side.</Text>
          </View>

          <Pressable
            style={[
              styles.confirmButton,
              !selectedDay || selectedDay.status !== 'available' || submitting || partyRoomOutOfOrder
                ? styles.confirmButtonDisabled
                : null,
            ]}
            disabled={!selectedDay || selectedDay.status !== 'available' || submitting || partyRoomOutOfOrder}
            onPress={handleConfirmBooking}
          >
            <Text style={styles.confirmButtonText}>{submitting ? 'Bekræfter...' : 'Bekræft booking'}</Text>
          </Pressable>
        </ScrollView>

        <BottomNav
          onChatPress={() => router.push('/chat')}
          active="party"
          onHomePress={() => router.replace('/home')}
          onWashingPress={() => router.replace('/book-washing')}
          onPartyPress={() => router.replace('/book-partyroom')}
          onProfilePress={() => router.push('/profile')}
        />
      </View>
    </SafeAreaView>
  );
}

function LegendSwatch({ label, style }: { label: string; style: object }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendBox, style]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  sidebarOverlay: { flex: 1, flexDirection: 'row-reverse', backgroundColor: 'rgba(17, 24, 39, 0.28)' },
  sidebarBackdrop: { flex: 1 },
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
  sidebarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sidebarTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  sidebarCloseButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  sidebarUserCard: {
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#EFF6FF',
    marginBottom: 18,
  },
  sidebarUserName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sidebarUserMeta: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
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
  sidebarLinkText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  logoutButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#3F7FC4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  header: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  scrollContent: { padding: 14, paddingBottom: 120, gap: 14 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  facilityStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  facilityStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  facilityStatusOutOfOrder: {
    color: '#B42318',
    backgroundColor: '#FEE4E2',
  },
  outOfOrderText: {
    fontSize: 13,
    color: '#B42318',
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
  bookingCardContent: { flex: 1 },
  bookingTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  bookingMeta: { fontSize: 13, color: '#6B7280' },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  calendarCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 14,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  monthButton: { width: 32, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 18, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
  weekdayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#111827' },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    marginBottom: 8,
  },
  dayCellOutsideMonth: { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' },
  dayCellBooked: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
  dayCellCooldown: { backgroundColor: '#D1D5DB', borderColor: '#D1D5DB' },
  dayCellOwned: { backgroundColor: '#9CA3AF', borderColor: '#9CA3AF' },
  dayCellSelected: { backgroundColor: '#FED7AA', borderColor: '#FED7AA' },
  dayCellText: { fontSize: 18, fontWeight: '600', color: '#111827' },
  dayCellTextOutsideMonth: { color: '#9CA3AF' },
  dayCellTextOnDark: { color: '#111827' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendBox: { width: 12, height: 12, borderRadius: 999, borderWidth: 1, borderColor: '#D1D5DB' },
  legendAvailable: { backgroundColor: '#D1FAE5' },
  legendBooked: { backgroundColor: '#FEE2E2' },
  legendSelected: { backgroundColor: '#FED7AA', borderColor: '#FED7AA' },
  legendOutOfOrder: { backgroundColor: '#FECACA' },
  legendText: { fontSize: 14, color: '#111827' },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 10,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  infoBullet: { fontSize: 14, lineHeight: 22, color: '#111827' },
  confirmButton: {
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#111827',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: { borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  confirmButtonText: { fontSize: 18, fontWeight: '800', color: '#111827' },
});
