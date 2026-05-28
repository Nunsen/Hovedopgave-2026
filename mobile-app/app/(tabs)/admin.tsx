import {Feather, Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {useFocusEffect} from '@react-navigation/native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {useAuth} from '@/context/AuthContext';
import {
  createDirectChat,
  DashboardBookingDto,
  DashboardDto,
  DashboardFacilityDto,
  DashboardFaqRequestDto,
  DashboardGroupDto,
  DashboardPostDto,
  deleteBooking,
  deletePost,
  deleteUserProfile,
  getDashboard,
  getUserProfile,
  updateFacilityStatus,
  updateFaqRequestStatus,
  UserProfileDto,
} from '@/lib/api';

type AdminSection = 'bookings' | 'posts' | 'groups' | 'requests';
type AdminView =
    | 'overview'
    | 'bookings'
    | 'bookingDetail'
    | 'users'
    | 'userDetail'
    | 'facilities'
    | 'posts'
    | 'requests'
    | 'requestDetail';
type BookingTab = 'all' | 'washing' | 'party';
type UserTab = 'all' | 'residents' | 'admins';
type FacilityTab = 'washing' | 'party';
type AdminNavTarget = 'overview' | 'bookings' | 'users' | 'posts' | 'facilities' | 'requests';

function formatBookingDate(booking: DashboardBookingDto) {
    const date = booking.date
        ? new Date(booking.date).toLocaleDateString('da-DK', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })
        : '';

    return `${date} • ${booking.startTime} - ${booking.endTime}`;
}

function getGroupName(group: DashboardGroupDto) {
    return group.groupName?.trim() || group.legacyName?.trim() || 'Gruppe uden navn';
}

function getProblemBadgeColor(category: string) {
    const normalizedCategory = category.trim().toLowerCase();

    if (normalizedCategory.includes('kritisk') || normalizedCategory.includes('akut')) {
        return {backgroundColor: '#FEE4E2', textColor: '#B42318'};
    }

    if (normalizedCategory.includes('ny')) {
        return {backgroundColor: '#EEF4FF', textColor: '#3538CD'};
    }

    return {backgroundColor: '#F2F4F7', textColor: '#344054'};
}

function isAcuteRequest(request: DashboardFaqRequestDto) {
    return request.category?.trim().toLowerCase() === 'akutte problemer';
}

function getRequestStatusColors(status: string | null | undefined) {
    const normalizedStatus = status?.trim().toUpperCase() ?? '';

    if (normalizedStatus === 'DONE') {
        return {backgroundColor: '#E8F7EC', textColor: '#166534', label: 'Behandlet'};
    }

    return {backgroundColor: '#FFF7E5', textColor: '#B54708', label: 'I gang'};
}

function getRequestResidentLabel(request: DashboardFaqRequestDto) {
    if (!request.user) {
        return 'Ukendt bruger';
    }

    const fullName = `${request.user.firstName} ${request.user.lastName}`.trim();
    const apartmentNumber = request.user.apartmentNumber?.trim();
    return apartmentNumber ? `${fullName} (${apartmentNumber})` : fullName;
}

function getBookingResidentLabel(booking: DashboardBookingDto) {
    if (!booking.user) {
        return 'Ukendt bruger';
    }

    const fullName = `${booking.user.firstName} ${booking.user.lastName}`.trim();
    const apartmentNumber = booking.user.apartmentNumber?.trim();
    return apartmentNumber ? `${fullName} (${apartmentNumber})` : fullName;
}

function getBookingStatusColors(status: string | null | undefined) {
    const normalizedStatus = status?.trim().toUpperCase() ?? '';

    if (['ACTIVE', 'AKTIV', 'BOOKED'].includes(normalizedStatus)) {
        return {backgroundColor: '#E8F7EC', textColor: '#166534'};
    }

    if (['GODKENDT', 'CONFIRMED'].includes(normalizedStatus)) {
        return {backgroundColor: '#E9F2FF', textColor: '#1D4ED8'};
    }

    if (['AFVENTER', 'PENDING'].includes(normalizedStatus)) {
        return {backgroundColor: '#FFF7E5', textColor: '#B54708'};
    }

    return {backgroundColor: '#F2F4F7', textColor: '#344054'};
}

function getFacilityStatusLabel(status: string | null | undefined) {
    const normalizedStatus = status?.trim().toUpperCase() ?? '';

    if (normalizedStatus === 'OUT_OF_ORDER') {
        return 'Ude af drift';
    }

    return '';
}

function getFacilityStatusColors(status: string | null | undefined) {
    const normalizedStatus = status?.trim().toUpperCase() ?? '';

    if (normalizedStatus === 'OUT_OF_ORDER') {
        return {backgroundColor: '#FEE4E2', textColor: '#B42318'};
    }

    return {backgroundColor: '#FFFFFF', textColor: '#111827'};
}

function getFacilityPlacement(facility: DashboardFacilityDto) {
    return facility.type?.trim().toUpperCase().includes('PARTY') ? 'Stuen' : 'Kælder';
}

function SectionHeader({
                           title,
                           actionLabel,
                           onPress,
                       }: {
    title: string;
    actionLabel: string;
    onPress: () => void;
}) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Pressable onPress={onPress}>
                <Text style={styles.sectionAction}>{actionLabel}</Text>
            </Pressable>
        </View>
    );
}

export default function AdminScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ view?: string; requestId?: string }>();
    const {isLoading, logout, user} = useAuth();
    const appliedRouteStateRef = useRef<string | null>(null);

    const [dashboard, setDashboard] = useState<DashboardDto | null>(null);
    const [loadingDashboard, setLoadingDashboard] = useState(true);
    const [expandedSection, setExpandedSection] = useState<AdminSection | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeView, setActiveView] = useState<AdminView>('overview');
    const [bookingTab, setBookingTab] = useState<BookingTab>('all');
    const [bookingSearchText, setBookingSearchText] = useState('');
    const [requestSearchText, setRequestSearchText] = useState('');
    const [userTab, setUserTab] = useState<UserTab>('all');
    const [userSearchText, setUserSearchText] = useState('');
    const [facilityTab, setFacilityTab] = useState<FacilityTab>('washing');
    const [selectedBooking, setSelectedBooking] = useState<DashboardBookingDto | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<DashboardFaqRequestDto | null>(null);
    const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfileDto | null>(null);
    const [loadingUserProfile, setLoadingUserProfile] = useState(false);
    const [deletingBookingId, setDeletingBookingId] = useState<number | null>(null);
    const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
    const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
    const [updatingFacilityId, setUpdatingFacilityId] = useState<number | null>(null);
    const [updatingRequestId, setUpdatingRequestId] = useState<number | null>(null);
    const [startingChatUserId, setStartingChatUserId] = useState<number | null>(null);

    const navigateToAdminView = useCallback((target: AdminNavTarget) => {
        setIsSidebarOpen(false);

        if (target === 'overview') {
            setSelectedBooking(null);
            setSelectedUserProfile(null);
            setSelectedRequest(null);
            setActiveView('overview');
            return;
        }

        if (target === 'bookings') {
            setSelectedBooking(null);
            setActiveView('bookings');
            return;
        }

        if (target === 'users') {
            setSelectedUserProfile(null);
            setActiveView('users');
            return;
        }

        if (target === 'posts') {
            setActiveView('posts');
            return;
        }

        if (target === 'facilities') {
            setActiveView('facilities');
            return;
        }

        setSelectedRequest(null);
        setActiveView('requests');
    }, []);

    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/login');
        }
    }, [isLoading, router, user]);

    useEffect(() => {
        if (!isLoading && user && user.role !== 'ADMIN') {
            router.replace('/home');
        }
    }, [isLoading, router, user]);

    const loadDashboard = useCallback(async () => {
        setLoadingDashboard(true);

        const result = await getDashboard();

        if (result.error) {
            Alert.alert('Kunne ikke hente overblik', result.error);
            setLoadingDashboard(false);
            return;
        }

        setDashboard(result.data ?? null);
        setLoadingDashboard(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            void loadDashboard();
        }, [loadDashboard]),
    );

    useEffect(() => {
        if (!dashboard) {
            return;
        }

        const routeKey = `${params.view ?? ''}:${params.requestId ?? ''}`;
        if (!params.view || appliedRouteStateRef.current === routeKey) {
            return;
        }

        if (params.view === 'requestDetail') {
            const requestId = Number(params.requestId);

            if (Number.isFinite(requestId)) {
                const matchingRequest =
                    (dashboard.requests ?? []).find((request) => request.faqRequestId === requestId) ?? null;

                if (matchingRequest) {
                    setSelectedRequest(matchingRequest);
                    setActiveView('requestDetail');
                    appliedRouteStateRef.current = routeKey;
                    return;
                }
            }
        }

        if (params.view === 'requests') {
            setSelectedRequest(null);
            setActiveView('requests');
            appliedRouteStateRef.current = routeKey;
        }
    }, [dashboard, params.requestId, params.view]);

    const activeBookings = useMemo(
        () =>
            (dashboard?.bookings ?? []).filter((booking) =>
                ['ACTIVE', 'AKTIV', 'BOOKED', 'GODKENDT', 'CONFIRMED'].includes(
                    booking.status?.trim().toUpperCase() ?? '',
                ),
            ),
        [dashboard],
    );

    const upcomingPartyBookings = useMemo(
        () =>
            (dashboard?.bookings ?? []).filter((booking) =>
                booking.facility?.type?.toUpperCase().includes('PARTY'),
            ),
        [dashboard],
    );

    const manageableGroups = useMemo(
        () =>
            (dashboard?.groups ?? []).filter(
                (group) => group.type?.trim().toUpperCase() !== 'DIRECT',
            ),
        [dashboard],
    );

    const recentBookings = useMemo(
        () =>
            [...(dashboard?.bookings ?? [])]
                .sort((left, right) => {
                    const leftValue = new Date(`${left.date}T${left.startTime}`).getTime();
                    const rightValue = new Date(`${right.date}T${right.startTime}`).getTime();
                    return leftValue - rightValue;
                })
                .slice(0, expandedSection === 'bookings' ? 8 : 3),
        [dashboard, expandedSection],
    );

    const sortedRequests = useMemo(
        () =>
            [...(dashboard?.requests ?? [])].sort((left, right) => {
                if (isAcuteRequest(left) !== isAcuteRequest(right)) {
                    return isAcuteRequest(left) ? -1 : 1;
                }

                return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
            }),
        [dashboard],
    );

    const recentRequests = useMemo(
        () => sortedRequests.slice(0, expandedSection === 'requests' ? 8 : 3),
        [expandedSection, sortedRequests],
    );

    const latestPosts = useMemo(
        () =>
            [...(dashboard?.posts ?? [])]
                .sort(
                    (left, right) =>
                        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
                )
                .slice(0, expandedSection === 'posts' ? 6 : 3),
        [dashboard, expandedSection],
    );

    const groups = useMemo(
        () =>
            [...manageableGroups]
                .sort(
                    (left, right) =>
                        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
                )
                .slice(0, expandedSection === 'groups' ? 6 : 3),
        [expandedSection, manageableGroups],
    );

    const filteredAdminBookings = useMemo(() => {
        const normalizedSearch = bookingSearchText.trim().toLowerCase();

        return [...(dashboard?.bookings ?? [])]
            .filter((booking) => {
                const facilityType = booking.facility?.type?.toUpperCase() ?? '';

                if (bookingTab === 'washing' && !facilityType.includes('WASHING')) {
                    return false;
                }

                if (bookingTab === 'party' && !facilityType.includes('PARTY')) {
                    return false;
                }

                if (!normalizedSearch) {
                    return true;
                }

                const searchableValues = [
                    booking.facility?.name ?? '',
                    getBookingResidentLabel(booking),
                    booking.status ?? '',
                    booking.date ?? '',
                    booking.startTime ?? '',
                    booking.endTime ?? '',
                    formatBookingDate(booking),
                ];

                return searchableValues.some((value) =>
                    value.toLowerCase().includes(normalizedSearch),
                );
            })
            .sort((left, right) => {
                const leftValue = new Date(`${left.date}T${left.startTime}`).getTime();
                const rightValue = new Date(`${right.date}T${right.startTime}`).getTime();
                return leftValue - rightValue;
            });
    }, [bookingSearchText, bookingTab, dashboard]);

    const filteredAdminUsers = useMemo(() => {
        const normalizedSearch = userSearchText.trim().toLowerCase();

        return [...(dashboard?.users ?? [])]
            .filter((dashboardUser) => {
                const role = dashboardUser.role?.trim().toUpperCase() ?? '';

                if (userTab === 'residents' && role !== 'RESIDENT') {
                    return false;
                }

                if (userTab === 'admins' && role !== 'ADMIN') {
                    return false;
                }

                if (!normalizedSearch) {
                    return true;
                }

                const fullName = `${dashboardUser.firstName} ${dashboardUser.lastName}`.trim();
                const searchableValues = [
                    fullName,
                    dashboardUser.email ?? '',
                    dashboardUser.apartmentNumber ?? '',
                ];

                return searchableValues.some((value) =>
                    value.toLowerCase().includes(normalizedSearch),
                );
            })
            .sort((left, right) => {
                const leftName = `${left.firstName} ${left.lastName}`.trim().toLowerCase();
                const rightName = `${right.firstName} ${right.lastName}`.trim().toLowerCase();
                return leftName.localeCompare(rightName, 'da');
            });
    }, [dashboard, userSearchText, userTab]);

    const filteredFacilities = useMemo(
        () =>
            [...(dashboard?.facilities ?? [])]
                .filter((facility) => {
                    const facilityType = facility.type?.trim().toUpperCase() ?? '';

                    if (facilityTab === 'party') {
                        return facilityType.includes('PARTY');
                    }

                    return facilityType.includes('WASHING') || facilityType.includes('DRYER');
                })
                .sort((left, right) => left.name.localeCompare(right.name, 'da')),
        [dashboard, facilityTab],
    );

    const adminPosts = useMemo(
        () =>
            [...(dashboard?.posts ?? [])].sort(
                (left, right) =>
                    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
            ),
        [dashboard],
    );

    const filteredRequests = useMemo(() => {
        const normalizedSearch = requestSearchText.trim().toLowerCase();

        return sortedRequests.filter((request) => {
            if (!normalizedSearch) {
                return true;
            }

            const createdAtLabel = request.createdAt
                ? new Date(request.createdAt).toLocaleDateString('da-DK')
                : '';
            const searchableValues = [
                request.title ?? '',
                request.category ?? '',
                request.description ?? '',
                request.contactEmail ?? '',
                request.status ?? '',
                getRequestResidentLabel(request),
                createdAtLabel,
            ];

            return searchableValues.some((value) =>
                value.toLowerCase().includes(normalizedSearch),
            );
        });
    }, [requestSearchText, sortedRequests]);

    const handleOpenUserProfile = useCallback(async (selectedUserId: number) => {
        setLoadingUserProfile(true);

        const result = await getUserProfile(selectedUserId);

        setLoadingUserProfile(false);

        if (result.error || !result.data) {
            Alert.alert('Kunne ikke hente brugerprofil', result.error ?? 'Brugerprofilen kunne ikke åbnes.');
            return;
        }

        setSelectedUserProfile(result.data);
        setActiveView('userDetail');
    }, []);

    const handleDeleteUserProfile = useCallback(async () => {
        if (!selectedUserProfile?.userId) {
            return;
        }

        setDeletingUserId(selectedUserProfile.userId);
        const result = await deleteUserProfile(selectedUserProfile.userId);
        setDeletingUserId(null);

        if (result.error) {
            Alert.alert('Kunne ikke slette bruger', result.error);
            return;
        }

        await loadDashboard();

        if (user && selectedUserProfile.userId === user.userId) {
            await logout();
            router.replace('/login');
            return;
        }

        setSelectedUserProfile(null);
        setActiveView('users');
        Alert.alert('Bruger slettet', 'Brugeren er fjernet fra databasen.');
    }, [loadDashboard, logout, router, selectedUserProfile, user]);

    const handleUpdateFacilityStatus = useCallback(
        async (facilityId: number, status: 'ACTIVE' | 'OUT_OF_ORDER') => {
            setUpdatingFacilityId(facilityId);
            const result = await updateFacilityStatus(facilityId, {status});
            setUpdatingFacilityId(null);

            if (result.error) {
                Alert.alert('Kunne ikke opdatere facilitet', result.error.message || 'Ukendt fejl fra backend.');
                return;
            }

            await loadDashboard();
        },
        [loadDashboard],
    );

    const handleDeletePost = useCallback(
        async (postId: number) => {
            if (!user) {
                return;
            }

            setDeletingPostId(postId);
            const result = await deletePost(postId, user.userId);
            setDeletingPostId(null);

            if (result.error) {
                Alert.alert('Kunne ikke slette opslag', result.error);
                return;
            }

            await loadDashboard();
            Alert.alert('Opslag slettet', 'Opslaget er fjernet fra oversigten.');
        },
        [loadDashboard, user],
    );

    const handleDeleteBooking = useCallback(async () => {
        if (!selectedBooking?.bookingId || !user) {
            return;
        }

        setDeletingBookingId(selectedBooking.bookingId);
        let result = await deleteBooking(selectedBooking.bookingId, user.userId);

        const bookingOwnerUserId = selectedBooking.user?.userId;
        const shouldRetryAsOwner =
            Boolean(result.error) &&
            user.role === 'ADMIN' &&
            bookingOwnerUserId != null &&
            bookingOwnerUserId !== user.userId;

        if (shouldRetryAsOwner) {
            result = await deleteBooking(selectedBooking.bookingId, bookingOwnerUserId!);
        }

        setDeletingBookingId(null);

        if (result.error) {
            Alert.alert('Kunne ikke slette booking', result.error);
            return;
        }

        await loadDashboard();
        setSelectedBooking(null);
        setActiveView('bookings');
        Alert.alert('Booking slettet', 'Bookingen er fjernet fra oversigten og databasen.');
    }, [loadDashboard, selectedBooking, user]);

    const handleMarkRequestDone = useCallback(async () => {
        if (!selectedRequest?.faqRequestId) {
            return;
        }

        setUpdatingRequestId(selectedRequest.faqRequestId);
        const result = await updateFaqRequestStatus(selectedRequest.faqRequestId, {
            status: 'DONE',
        });
        setUpdatingRequestId(null);

        if (result.error) {
            Alert.alert('Kunne ikke opdatere henvendelse', result.error.message);
            return;
        }

        await loadDashboard();
        setSelectedRequest(result.data ?? null);
        setActiveView('requests');
        Alert.alert('Henvendelse behandlet', 'Henvendelsen er markeret som behandlet.');
    }, [loadDashboard, selectedRequest]);

    const handleStartDirectChat = useCallback(async () => {
        if (!user?.userId || !selectedRequest?.user?.userId) {
            return;
        }

        setStartingChatUserId(selectedRequest.user.userId);
        const result = await createDirectChat({
            userId: user.userId,
            targetUserId: selectedRequest.user.userId,
        });
        setStartingChatUserId(null);

        if (result.error || !result.data) {
            Alert.alert('Kunne ikke starte samtale', result.error ?? 'Samtalen kunne ikke oprettes.');
            return;
        }

        router.push({
            pathname: '/chat',
            params: {
                tab: 'Samtaler',
                groupId: String(result.data.groupId),
                conversation: '1',
                origin: 'admin',
                requestId: String(selectedRequest.faqRequestId),
            },
        });
    }, [router, selectedRequest, user]);

    if (isLoading || loadingDashboard) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator/>
            </SafeAreaView>
        );
    }

    if (!user || user.role !== 'ADMIN') {
        return null;
    }

    const usersCount = dashboard?.users.length ?? 0;
    const groupsCount = manageableGroups.length;
    const postsCount = dashboard?.posts.length ?? 0;
    const requestsCount = dashboard?.requests.length ?? 0;

    const handleToggleSection = (section: AdminSection) => {
        setExpandedSection((currentSection) => (currentSection === section ? null : section));
    };

    const activeNavTarget: AdminNavTarget =
        activeView === 'bookingDetail'
            ? 'bookings'
            : activeView === 'userDetail'
                ? 'users'
                : activeView === 'requestDetail'
                    ? 'requests'
                    : activeView === 'bookings'
                        ? 'bookings'
                        : activeView === 'users'
                            ? 'users'
                            : activeView === 'posts'
                                ? 'posts'
                                : activeView === 'facilities'
                                    ? 'facilities'
                                    : activeView === 'requests'
                                        ? 'requests'
                                        : 'overview';

    const renderOverview = () => (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.welcomeText}>Velkommen tilbage, {user.fullName.split(' ')[0]}</Text>
            <View style={styles.statsGrid}>
                <Pressable style={styles.statCard} onPress={() => handleToggleSection('bookings')}>
                    <View style={styles.statTopRow}>
                        <Text style={styles.statValue}>{activeBookings.length}</Text>
                        <Ionicons name="calendar-outline" size={18} color="#475467"/>
                    </View>
                    <Text style={styles.statLabel}>Aktive bookinger</Text>
                </Pressable>
                <Pressable style={styles.statCard} onPress={() => handleToggleSection('bookings')}>
                    <View style={styles.statTopRow}>
                        <Text style={styles.statValue}>{upcomingPartyBookings.length}</Text>
                        <MaterialCommunityIcons name="party-popper" size={18} color="#475467"/>
                    </View>
                    <Text style={styles.statLabel}>Kommende festsalsbookinger</Text>
                </Pressable>
                <Pressable style={styles.statCard} onPress={() => handleToggleSection('groups')}>
                    <View style={styles.statTopRow}>
                        <Text style={styles.statValue}>{usersCount}</Text>
                        <Ionicons name="person-outline" size={18} color="#475467"/>
                    </View>
                    <Text style={styles.statLabel}>Brugere</Text>
                </Pressable>
                <Pressable style={styles.statCard} onPress={() => handleToggleSection('groups')}>
                    <View style={styles.statTopRow}>
                        <Text style={styles.statValue}>{groupsCount}</Text>
                        <Ionicons name="chatbubble-ellipses-outline" size={18} color="#475467"/>
                    </View>
                    <Text style={styles.statLabel}>Grupper / chats</Text>
                </Pressable>
                <Pressable style={styles.statCard} onPress={() => handleToggleSection('requests')}>
                    <View style={styles.statTopRow}>
                        <Text style={styles.statValue}>{requestsCount}</Text>
                        <Ionicons name="warning-outline" size={18} color="#475467"/>
                    </View>
                    <Text style={styles.statLabel}>Henvendelser</Text>
                </Pressable>
                <Pressable style={styles.statCard} onPress={() => handleToggleSection('posts')}>
                    <View style={styles.statTopRow}>
                        <Text style={styles.statValue}>{postsCount}</Text>
                        <MaterialCommunityIcons name="bullhorn-outline" size={18} color="#475467"/>
                    </View>
                    <Text style={styles.statLabel}>Opslag</Text>
                </Pressable>
            </View>
            <SectionHeader
                title="Seneste bookinger"
                actionLabel={expandedSection === 'bookings' ? 'Vis f?rre' : 'Se alle'}
                onPress={() => handleToggleSection('bookings')}
            />
            {recentBookings.length === 0 ? (
                <Text style={styles.emptyText}>Ingen bookinger fundet.</Text>
            ) : (
                recentBookings.map((booking) => (
                    <View key={booking.bookingId} style={styles.listCard}>
                        <View style={styles.listMain}>
                            <Text style={styles.listTitle}>
                                {booking.facility?.name?.trim() || 'Booking uden facilitet'}
                            </Text>
                            <Text style={styles.listSubtitle}>{formatBookingDate(booking)}</Text>
                            <Text style={styles.listMeta}>
                                {booking.user
                                    ? `${booking.user.firstName} ${booking.user.lastName}`
                                    : 'Ukendt bruger'}
                            </Text>
                        </View>
                        <View style={styles.statusPill}>
                            <Text style={styles.statusPillText}>
                                {booking.status?.trim() || 'Ukendt'}
                            </Text>
                        </View>
                    </View>
                ))
            )}
            <SectionHeader
                title="Henvendelser"
                actionLabel={expandedSection === 'requests' ? 'Vis f?rre' : 'Se alle'}
                onPress={() => handleToggleSection('requests')}
            />
            {recentRequests.length === 0 ? (
                <Text style={styles.emptyText}>Ingen henvendelser endnu.</Text>
            ) : (
                recentRequests.map((request) => {
                    const badgeColors = getProblemBadgeColor(request.category);
                    return (
                        <Pressable
                            key={request.faqRequestId}
                            style={styles.listCard}
                            onPress={() => {
                                setSelectedRequest(request);
                                setActiveView('requestDetail');
                            }}
                        >
                            <View style={styles.listMain}>
                                <Text style={styles.listTitle}>{request.title}</Text>
                                <Text style={styles.listSubtitle} numberOfLines={2}>
                                    {request.description}
                                </Text>
                                <Text style={styles.listMeta}>{getRequestResidentLabel(request)}</Text>
                            </View>
                            <View
                                style={[
                                    styles.problemBadge,
                                    {backgroundColor: badgeColors.backgroundColor},
                                ]}
                            >
                                <Text style={[styles.problemBadgeText, {color: badgeColors.textColor}]}>
                                    {request.category}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })
            )}
            <SectionHeader
                title="Opslag"
                actionLabel={expandedSection === 'posts' ? 'Vis f?rre' : 'Se alle'}
                onPress={() => handleToggleSection('posts')}
            />
            {latestPosts.length === 0 ? (
                <Text style={styles.emptyText}>Ingen opslag fundet.</Text>
            ) : (
                latestPosts.map((post: DashboardPostDto) => (
                    <View key={post.postId} style={styles.listCard}>
                        <View style={styles.listMain}>
                            <Text style={styles.listTitle}>{post.title}</Text>
                            <Text style={styles.listSubtitle} numberOfLines={2}>
                                {post.content}
                            </Text>
                            <Text style={styles.listMeta}>{post.category}</Text>
                        </View>
                        {post.isImportant ? <Ionicons name="bookmark" size={18} color="#3F7FC4"/> : null}
                    </View>
                ))
            )}
            <SectionHeader
                title="Grupper"
                actionLabel={expandedSection === 'groups' ? 'Vis f?rre' : 'Se alle'}
                onPress={() => handleToggleSection('groups')}
            />
            {groups.length === 0 ? (
                <Text style={styles.emptyText}>Ingen grupper fundet.</Text>
            ) : (
                groups.map((group) => (
                    <View key={group.groupId} style={styles.listCard}>
                        <View style={styles.listMain}>
                            <Text style={styles.listTitle}>{getGroupName(group)}</Text>
                            <Text style={styles.listSubtitle} numberOfLines={2}>
                                {group.description?.trim() || 'Ingen beskrivelse'}
                            </Text>
                            <Text style={styles.listMeta}>{group.type}</Text>
                        </View>
                    </View>
                ))
            )}
        </ScrollView>
    );
    const renderBookingsView = () => (
        <View style={styles.bookingsView}>
            <View style={styles.bookingTabsRow}>
                <Pressable style={styles.bookingTabButton} onPress={() => setBookingTab('all')}>
                    <Text style={[styles.bookingTabText, bookingTab === 'all' ? styles.bookingTabTextActive : null]}>
                        Alle
                    </Text>
                    {bookingTab === 'all' ? <View style={styles.bookingTabIndicator}/> : null}
                </Pressable>

                <Pressable style={styles.bookingTabButton} onPress={() => setBookingTab('washing')}>
                    <Text
                        style={[styles.bookingTabText, bookingTab === 'washing' ? styles.bookingTabTextActive : null]}>
                        Vaskefaciliteter
                    </Text>
                    {bookingTab === 'washing' ? <View style={styles.bookingTabIndicator}/> : null}
                </Pressable>

                <Pressable style={styles.bookingTabButton} onPress={() => setBookingTab('party')}>
                    <Text style={[styles.bookingTabText, bookingTab === 'party' ? styles.bookingTabTextActive : null]}>
                        Festsal
                    </Text>
                    {bookingTab === 'party' ? <View style={styles.bookingTabIndicator}/> : null}
                </Pressable>
            </View>

            <View style={styles.bookingsFilters}>
                <View style={styles.searchField}>
                    <Feather name="search" size={18} color="#98A2B3"/>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Søg efter dato, facilitet eller bruger..."
                        placeholderTextColor="#98A2B3"
                        value={bookingSearchText}
                        onChangeText={setBookingSearchText}
                    />
                </View>
            </View>

            <ScrollView
                style={styles.bookingsList}
                contentContainerStyle={styles.bookingsListContent}
                showsVerticalScrollIndicator={false}
            >
                {filteredAdminBookings.length === 0 ? (
                    <Text style={styles.emptyText}>Ingen bookinger matcher filtrene.</Text>
                ) : (
                    filteredAdminBookings.map((booking) => {
                        const statusColors = getBookingStatusColors(booking.status);

                        return (
                            <Pressable
                                key={booking.bookingId}
                                style={styles.bookingOverviewCard}
                                onPress={() => {
                                    setSelectedBooking(booking);
                                    setActiveView('bookingDetail');
                                }}
                            >
                                <View style={styles.bookingOverviewMain}>
                                    <Text style={styles.bookingOverviewTitle}>
                                        {booking.facility?.name?.trim() || 'Booking uden facilitet'}
                                    </Text>
                                    <Text style={styles.bookingOverviewResident}>
                                        {getBookingResidentLabel(booking)}
                                    </Text>
                                    <Text style={styles.bookingOverviewMeta}>{formatBookingDate(booking)}</Text>
                                </View>

                                <View style={styles.bookingOverviewSide}>
                                    <View
                                        style={[
                                            styles.bookingOverviewStatus,
                                            {backgroundColor: statusColors.backgroundColor},
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.bookingOverviewStatusText,
                                                {color: statusColors.textColor},
                                            ]}
                                        >
                                            {booking.status?.trim() || 'Ukendt'}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#98A2B3"/>
                                </View>
                            </Pressable>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );

    const renderBookingDetailView = () => {
        if (!selectedBooking) {
            return null;
        }

        const statusColors = getBookingStatusColors(selectedBooking.status);
        const bookingDate = selectedBooking.date
            ? new Date(selectedBooking.date).toLocaleDateString('da-DK')
            : '';
        const createdAt = selectedBooking.createdAt
            ? new Date(selectedBooking.createdAt).toLocaleString('da-DK', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })
            : 'Ukendt';

        return (
            <ScrollView
                style={styles.bookingDetailScroll}
                contentContainerStyle={styles.bookingDetailContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.bookingDetailHero}>
                    <View
                        style={[
                            styles.bookingDetailStatus,
                            {backgroundColor: statusColors.backgroundColor},
                        ]}
                    >
                        <Text
                            style={[
                                styles.bookingDetailStatusText,
                                {color: statusColors.textColor},
                            ]}
                        >
                            {selectedBooking.status?.trim() || 'Ukendt'}
                        </Text>
                    </View>

                    <View style={styles.bookingDetailIconWrap}>
                        <MaterialCommunityIcons name="washing-machine" size={42} color="#667085"/>
                    </View>

                    <Text style={styles.bookingDetailTitle}>
                        {selectedBooking.facility?.name?.trim() || 'Booking uden facilitet'}
                    </Text>
                    <Text style={styles.bookingDetailSubtitle}>
                        {bookingDate} • {selectedBooking.startTime} - {selectedBooking.endTime}
                    </Text>
                </View>

                <Text style={styles.bookingDetailSectionTitle}>Bruger</Text>
                <View style={styles.bookingDetailCard}>
                    <View style={styles.bookingDetailUserRow}>
                        <View style={styles.bookingDetailAvatar}>
                            <Ionicons name="person" size={20} color="#667085"/>
                        </View>

                        <View style={styles.bookingDetailUserInfo}>
                            <Text style={styles.bookingDetailUserName}>
                                {getBookingResidentLabel(selectedBooking)}
                            </Text>
                            <Text style={styles.bookingDetailUserEmail}>
                                {selectedBooking.user?.email ?? 'Ingen email'}
                            </Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.bookingDetailSectionTitle}>Information</Text>
                <View style={styles.bookingDetailCard}>
                    <View style={styles.bookingDetailInfoRow}>
                        <Text style={styles.bookingDetailInfoLabel}>Facilitet</Text>
                        <Text style={styles.bookingDetailInfoValue}>
                            {selectedBooking.facility?.name?.trim() || 'Ukendt'}
                        </Text>
                    </View>

                    <View style={styles.bookingDetailDivider}/>

                    <View style={styles.bookingDetailInfoRow}>
                        <Text style={styles.bookingDetailInfoLabel}>Placering</Text>
                        <Text style={styles.bookingDetailInfoValue}>
                            {selectedBooking.facility?.type?.toUpperCase().includes('PARTY') ? 'Festsal' : 'Kælder'}
                        </Text>
                    </View>

                    <View style={styles.bookingDetailDivider}/>

                    <View style={styles.bookingDetailInfoRow}>
                        <Text style={styles.bookingDetailInfoLabel}>Oprettet</Text>
                        <Text style={styles.bookingDetailInfoValue}>{createdAt}</Text>
                    </View>
                </View>

                <Text style={styles.bookingDetailSectionTitle}>Handlinger</Text>
                <View style={styles.bookingDetailCard}>
                    <Pressable
                        style={styles.bookingDetailActionRow}
                        disabled={deletingBookingId === selectedBooking.bookingId}
                        onPress={() =>
                            Alert.alert(
                                'Slet booking',
                                'Vil du fjerne denne booking?',
                                [
                                    {text: 'Annuller', style: 'cancel'},
                                    {
                                        text: 'Fjern',
                                        style: 'destructive',
                                        onPress: () => {
                                            void handleDeleteBooking();
                                        },
                                    },
                                ],
                            )
                        }
                    >
                        <View style={styles.bookingDetailActionLeft}>
                            <Ionicons
                                name={deletingBookingId === selectedBooking.bookingId ? 'hourglass-outline' : 'close-circle-outline'}
                                size={18}
                                color="#D92D20"
                            />
                            <Text style={styles.bookingDetailActionDanger}>
                                {deletingBookingId === selectedBooking.bookingId ? 'Sletter booking...' : 'Slet booking'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#98A2B3"/>
                    </Pressable>
                </View>
            </ScrollView>
        );
    };

    const renderRequestsView = () => (
        <View style={styles.bookingsView}>
            <View style={styles.bookingsFilters}>
                <View style={styles.searchField}>
                    <Feather name="search" size={18} color="#98A2B3"/>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="S?g efter kategori, bruger eller dato..."
                        placeholderTextColor="#98A2B3"
                        value={requestSearchText}
                        onChangeText={setRequestSearchText}
                    />
                </View>
            </View>
            <ScrollView
                style={styles.bookingsList}
                contentContainerStyle={styles.bookingsListContent}
                showsVerticalScrollIndicator={false}
            >
                {filteredRequests.length === 0 ? (
                    <Text style={styles.emptyText}>Ingen henvendelser matcher s?gningen.</Text>
                ) : (
                    filteredRequests.map((request) => {
                        const statusColors = getRequestStatusColors(request.status);
                        const badgeColors = getProblemBadgeColor(request.category);
                        const createdAtLabel = request.createdAt
                            ? new Date(request.createdAt).toLocaleDateString('da-DK')
                            : 'Ukendt dato';
                        return (
                            <Pressable
                                key={request.faqRequestId}
                                style={styles.bookingOverviewCard}
                                onPress={() => {
                                    setSelectedRequest(request);
                                    setActiveView('requestDetail');
                                }}
                            >
                                <View style={styles.bookingOverviewMain}>
                                    <View style={styles.requestCardTop}>
                                        <Text style={styles.bookingOverviewTitle}>{request.title}</Text>
                                        <View
                                            style={[
                                                styles.problemBadge,
                                                {backgroundColor: badgeColors.backgroundColor},
                                            ]}
                                        >
                                            <Text style={[styles.problemBadgeText, {color: badgeColors.textColor}]}>
                                                {request.category}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text
                                        style={styles.bookingOverviewResident}>{getRequestResidentLabel(request)}</Text>
                                    <Text style={styles.bookingOverviewMeta}>{createdAtLabel}</Text>
                                </View>
                                <View style={styles.bookingOverviewSide}>
                                    <View
                                        style={[
                                            styles.bookingOverviewStatus,
                                            {backgroundColor: statusColors.backgroundColor},
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.bookingOverviewStatusText,
                                                {color: statusColors.textColor},
                                            ]}
                                        >
                                            {statusColors.label}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#98A2B3"/>
                                </View>
                            </Pressable>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
    const renderRequestDetailView = () => {
        if (!selectedRequest) {
            return null;
        }
        const statusColors = getRequestStatusColors(selectedRequest.status);
        const createdAt = selectedRequest.createdAt
            ? new Date(selectedRequest.createdAt).toLocaleString('da-DK', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })
            : 'Ukendt';
        return (
            <ScrollView
                style={styles.bookingDetailScroll}
                contentContainerStyle={styles.bookingDetailContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.bookingDetailHero}>
                    <View
                        style={[
                            styles.bookingDetailStatus,
                            {backgroundColor: statusColors.backgroundColor},
                        ]}
                    >
                        <Text
                            style={[
                                styles.bookingDetailStatusText,
                                {color: statusColors.textColor},
                            ]}
                        >
                            {statusColors.label}
                        </Text>
                    </View>
                    <View style={styles.bookingDetailIconWrap}>
                        <Ionicons name="document-text-outline" size={38} color="#667085"/>
                    </View>
                    <Text style={styles.bookingDetailTitle}>{selectedRequest.title}</Text>
                    <Text style={styles.bookingDetailSubtitle}>{selectedRequest.category}</Text>
                </View>
                <Text style={styles.bookingDetailSectionTitle}>Bruger</Text>
                <View style={styles.bookingDetailCard}>
                    <View style={styles.bookingDetailUserRow}>
                        <View style={styles.bookingDetailAvatar}>
                            <Ionicons name="person" size={20} color="#667085"/>
                        </View>
                        <View style={styles.bookingDetailUserInfo}>
                            <Text style={styles.bookingDetailUserName}>{getRequestResidentLabel(selectedRequest)}</Text>
                            <Text style={styles.bookingDetailUserEmail}>
                                {selectedRequest.contactEmail || selectedRequest.user?.email || 'Ingen email'}
                            </Text>
                        </View>
                        <Pressable
                            style={styles.requestChatButton}
                            disabled={!selectedRequest.user?.userId || startingChatUserId === selectedRequest.user?.userId}
                            onPress={() => {
                                void handleStartDirectChat();
                            }}
                        >
                            <Ionicons
                                name={startingChatUserId === selectedRequest.user?.userId ? 'hourglass-outline' : 'chatbubble-ellipses-outline'}
                                size={18}
                                color="#1D4ED8"
                            />
                        </Pressable>
                    </View>
                </View>
                <Text style={styles.bookingDetailSectionTitle}>Information</Text>
                <View style={styles.bookingDetailCard}>
                    <View style={styles.bookingDetailInfoRow}>
                        <Text style={styles.bookingDetailInfoLabel}>Kategori</Text>
                        <Text style={styles.bookingDetailInfoValue}>{selectedRequest.category}</Text>
                    </View>
                    <View style={styles.bookingDetailDivider}/>
                    <View style={styles.bookingDetailInfoRow}>
                        <Text style={styles.bookingDetailInfoLabel}>Status</Text>
                        <Text style={styles.bookingDetailInfoValue}>{statusColors.label}</Text>
                    </View>
                    <View style={styles.bookingDetailDivider}/>
                    <View style={styles.bookingDetailInfoRow}>
                        <Text style={styles.bookingDetailInfoLabel}>Kontakt</Text>
                        <Text style={styles.bookingDetailInfoValue}>
                            {selectedRequest.contactEmail || selectedRequest.user?.email || 'Ingen email'}
                        </Text>
                    </View>
                    <View style={styles.bookingDetailDivider}/>
                    <View style={styles.bookingDetailInfoRow}>
                        <Text style={styles.bookingDetailInfoLabel}>Oprettet</Text>
                        <Text style={styles.bookingDetailInfoValue}>{createdAt}</Text>
                    </View>
                </View>
                <Text style={styles.bookingDetailSectionTitle}>Beskrivelse</Text>
                <View style={styles.bookingDetailCard}>
                    <Text style={styles.requestDescription}>{selectedRequest.description}</Text>
                </View>
                <Text style={styles.bookingDetailSectionTitle}>Handlinger</Text>
                <View style={styles.bookingDetailCard}>
                    <Pressable
                        style={styles.bookingDetailActionRow}
                        disabled={selectedRequest.status?.trim().toUpperCase() === 'DONE' || updatingRequestId === selectedRequest.faqRequestId}
                        onPress={() => {
                            Alert.alert('Behandlet', 'Vil du markere henvendelsen som behandlet?', [
                                {text: 'Annuller', style: 'cancel'},
                                {
                                    text: 'Behandlet',
                                    onPress: () => {
                                        void handleMarkRequestDone();
                                    },
                                },
                            ]);
                        }}
                    >
                        <View style={styles.bookingDetailActionLeft}>
                            <Ionicons
                                name={updatingRequestId === selectedRequest.faqRequestId ? 'hourglass-outline' : 'checkmark-circle-outline'}
                                size={18}
                                color="#166534"
                            />
                            <Text style={styles.bookingDetailActionText}>
                                {selectedRequest.status?.trim().toUpperCase() === 'DONE'
                                    ? 'Henvendelsen er behandlet'
                                    : updatingRequestId === selectedRequest.faqRequestId
                                        ? 'Opdaterer henvendelse...'
                                        : 'Behandlet'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#98A2B3"/>
                    </Pressable>
                </View>
            </ScrollView>
        );
    };
    const renderUsersView = () => (
        <View style={styles.bookingsView}>
            <View style={styles.bookingTabsRow}>
                <Pressable style={styles.bookingTabButton} onPress={() => setUserTab('all')}>
                    <Text style={[styles.bookingTabText, userTab === 'all' ? styles.bookingTabTextActive : null]}>
                        Alle
                    </Text>
                    {userTab === 'all' ? <View style={styles.bookingTabIndicator}/> : null}
                </Pressable>

                <Pressable style={styles.bookingTabButton} onPress={() => setUserTab('residents')}>
                    <Text style={[styles.bookingTabText, userTab === 'residents' ? styles.bookingTabTextActive : null]}>
                        Beboere
                    </Text>
                    {userTab === 'residents' ? <View style={styles.bookingTabIndicator}/> : null}
                </Pressable>

                <Pressable style={styles.bookingTabButton} onPress={() => setUserTab('admins')}>
                    <Text style={[styles.bookingTabText, userTab === 'admins' ? styles.bookingTabTextActive : null]}>
                        Administratorer
                    </Text>
                    {userTab === 'admins' ? <View style={styles.bookingTabIndicator}/> : null}
                </Pressable>
            </View>

            <View style={styles.bookingsFilters}>
                <View style={styles.searchField}>
                    <Feather name="search" size={18} color="#98A2B3"/>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Søg efter bruger..."
                        placeholderTextColor="#98A2B3"
                        value={userSearchText}
                        onChangeText={setUserSearchText}
                    />
                </View>
            </View>

            <ScrollView
                style={styles.bookingsList}
                contentContainerStyle={styles.bookingsListContent}
                showsVerticalScrollIndicator={false}
            >
                {filteredAdminUsers.length === 0 ? (
                    <Text style={styles.emptyText}>Ingen brugere matcher søgningen.</Text>
                ) : (
                    filteredAdminUsers.map((dashboardUser) => {
                        const fullName = `${dashboardUser.firstName} ${dashboardUser.lastName}`.trim();
                        const apartmentLabel = dashboardUser.apartmentNumber?.trim()
                            ? `(${dashboardUser.apartmentNumber.trim()})`
                            : '';
                        const isAdminRole = dashboardUser.role?.trim().toUpperCase() === 'ADMIN';

                        return (
                            <Pressable
                                key={dashboardUser.userId}
                                style={styles.userListCard}
                                onPress={() => {
                                    void handleOpenUserProfile(dashboardUser.userId);
                                }}
                            >
                                <View style={styles.userListLeft}>
                                    <View style={styles.userAvatar}>
                                        <Ionicons name="person" size={20} color="#667085"/>
                                    </View>

                                    <View style={styles.userInfo}>
                                        <Text style={styles.userName}>
                                            {fullName} {apartmentLabel}
                                        </Text>
                                        <Text style={styles.userEmail}>{dashboardUser.email}</Text>
                                    </View>
                                </View>

                                <View style={styles.userListRight}>
                                    {isAdminRole ? (
                                        <Text style={styles.userRoleBadge}>Administrator</Text>
                                    ) : null}
                                    <Ionicons name="chevron-forward" size={18} color="#98A2B3"/>
                                </View>
                            </Pressable>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );

    const renderUserDetailView = () => {
        if (loadingUserProfile) {
            return (
                <SafeAreaView style={styles.loadingContainer}>
                    <ActivityIndicator/>
                </SafeAreaView>
            );
        }

        if (!selectedUserProfile) {
            return null;
        }

        return (
            <ScrollView
                style={styles.bookingDetailScroll}
                contentContainerStyle={styles.bookingDetailContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.userProfileHero}>
                    <View style={styles.userProfileAvatar}>
                        <Ionicons name="person" size={30} color="#667085"/>
                    </View>
                    <Text style={styles.userProfileName}>{selectedUserProfile.fullName}</Text>
                    <Text style={styles.userProfileSubtitle}>
                        {selectedUserProfile.apartmentNumber?.trim()
                            ? `Lejlighed ${selectedUserProfile.apartmentNumber}`
                            : 'Intet lejlighedsnummer'}
                    </Text>
                </View>

                <Text style={styles.bookingDetailSectionTitle}>Brugeroplysninger</Text>
                <View style={styles.bookingDetailCard}>
                    <View style={styles.bookingDetailInfoRow}>
                        <Text style={styles.bookingDetailInfoLabel}>Navn</Text>
                        <Text style={styles.bookingDetailInfoValue}>{selectedUserProfile.fullName}</Text>
                    </View>

                    <View style={styles.bookingDetailDivider}/>

                    <View style={styles.bookingDetailInfoRow}>
                        <Text style={styles.bookingDetailInfoLabel}>Email</Text>
                        <Text style={styles.bookingDetailInfoValue}>{selectedUserProfile.email}</Text>
                    </View>

                    <View style={styles.bookingDetailDivider}/>

                    <View style={styles.bookingDetailInfoRow}>
                        <Text style={styles.bookingDetailInfoLabel}>Lejlighed</Text>
                        <Text style={styles.bookingDetailInfoValue}>
                            {selectedUserProfile.apartmentNumber?.trim() || 'Ikke angivet'}
                        </Text>
                    </View>

                    <View style={styles.bookingDetailDivider}/>

                    <View style={styles.bookingDetailInfoRow}>
                        <Text style={styles.bookingDetailInfoLabel}>Telefon</Text>
                        <Text style={styles.bookingDetailInfoValue}>
                            {selectedUserProfile.phoneNumber?.trim() || 'Ikke angivet'}
                        </Text>
                    </View>
                </View>

                <Text style={styles.bookingDetailSectionTitle}>Handlinger</Text>
                <View style={styles.bookingDetailCard}>
                    <Pressable
                        style={styles.bookingDetailActionRow}
                        disabled={deletingUserId === selectedUserProfile.userId}
                        onPress={() =>
                            Alert.alert(
                                'Slet bruger',
                                'Vil du slette denne bruger fra databasen?',
                                [
                                    {text: 'Annuller', style: 'cancel'},
                                    {
                                        text: 'Slet',
                                        style: 'destructive',
                                        onPress: () => {
                                            void handleDeleteUserProfile();
                                        },
                                    },
                                ],
                            )
                        }
                    >
                        <View style={styles.bookingDetailActionLeft}>
                            <Ionicons
                                name={deletingUserId === selectedUserProfile.userId ? 'hourglass-outline' : 'trash-outline'}
                                size={18}
                                color="#D92D20"
                            />
                            <Text style={styles.bookingDetailActionDanger}>
                                {deletingUserId === selectedUserProfile.userId ? 'Sletter bruger...' : 'Slet bruger'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#98A2B3"/>
                    </Pressable>
                </View>
            </ScrollView>
        );
    };

    const renderFacilitiesView = () => (
        <View style={styles.bookingsView}>
            <View style={styles.bookingTabsRow}>
                <Pressable style={styles.bookingTabButton} onPress={() => setFacilityTab('washing')}>
                    <Text
                        style={[styles.bookingTabText, facilityTab === 'washing' ? styles.bookingTabTextActive : null]}>
                        Vaskefaciliteter
                    </Text>
                    {facilityTab === 'washing' ? <View style={styles.bookingTabIndicator}/> : null}
                </Pressable>

                <Pressable style={styles.bookingTabButton} onPress={() => setFacilityTab('party')}>
                    <Text style={[styles.bookingTabText, facilityTab === 'party' ? styles.bookingTabTextActive : null]}>
                        Festsal
                    </Text>
                    {facilityTab === 'party' ? <View style={styles.bookingTabIndicator}/> : null}
                </Pressable>
            </View>

            <ScrollView
                style={styles.bookingsList}
                contentContainerStyle={styles.bookingsListContent}
                showsVerticalScrollIndicator={false}
            >
                {filteredFacilities.length === 0 ? (
                    <Text style={styles.emptyText}>Ingen faciliteter fundet.</Text>
                ) : (
                    filteredFacilities.map((facility) => {
                        const statusColors = getFacilityStatusColors(facility.status);
                        const isUpdating = updatingFacilityId === facility.facilityId;
                        const isOutOfOrder = facility.status?.trim().toUpperCase() === 'OUT_OF_ORDER';

                        return (
                            <View key={facility.facilityId} style={styles.facilityCard}>
                                <View style={styles.facilityCardTop}>
                                    <View style={styles.facilityCardInfo}>
                                        <Text style={styles.facilityCardTitle}>{facility.name}</Text>
                                        <Text style={styles.facilityCardMeta}>{getFacilityPlacement(facility)}</Text>
                                    </View>

                                    {isOutOfOrder ? (
                                        <View
                                            style={[
                                                styles.facilityStatusPill,
                                                {backgroundColor: statusColors.backgroundColor},
                                            ]}
                                        >
                                            <Text
                                                style={[styles.facilityStatusPillText, {color: statusColors.textColor}]}>
                                                {getFacilityStatusLabel(facility.status)}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>

                                <View style={styles.facilityActionsRow}>
                                    <Pressable
                                        style={[
                                            styles.facilityActionButton,
                                            isOutOfOrder ? styles.facilityActionButtonDanger : null,
                                        ]}
                                        disabled={isUpdating}
                                        onPress={() => {
                                            void handleUpdateFacilityStatus(
                                                facility.facilityId,
                                                isOutOfOrder ? 'ACTIVE' : 'OUT_OF_ORDER',
                                            );
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.facilityActionText,
                                                isOutOfOrder ? styles.facilityActionTextDanger : null,
                                            ]}
                                        >
                                            {isOutOfOrder ? 'Sæt i drift' : 'Sæt ude af drift'}
                                        </Text>
                                    </Pressable>
                                </View>

                                {isUpdating ?
                                    <Text style={styles.facilityUpdatingText}>Opdaterer status...</Text> : null}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );

    const renderPostsView = () => (
        <View style={styles.bookingsView}>
            <ScrollView
                style={styles.bookingsList}
                contentContainerStyle={styles.bookingsListContent}
                showsVerticalScrollIndicator={false}
            >
                {adminPosts.length === 0 ? (
                    <Text style={styles.emptyText}>Ingen opslag fundet.</Text>
                ) : (
                    adminPosts.map((post) => (
                        <View key={post.postId} style={styles.postAdminCard}>
                            <View style={styles.postAdminHeader}>
                                <View style={styles.postAdminTitleWrap}>
                                    <Text style={styles.postAdminTitle}>{post.title}</Text>
                                    <Text style={styles.postAdminMeta}>{post.category}</Text>
                                </View>

                                {post.isImportant ? (
                                    <Ionicons name="bookmark" size={18} color="#3F7FC4"/>
                                ) : null}
                            </View>

                            <Text style={styles.postAdminContent} numberOfLines={3}>
                                {post.content}
                            </Text>

                            <View style={styles.postAdminFooter}>
                                <Text style={styles.postAdminDate}>
                                    {new Date(post.createdAt).toLocaleDateString('da-DK')}
                                </Text>

                                <Pressable
                                    style={styles.postDeleteButton}
                                    disabled={deletingPostId === post.postId}
                                    onPress={() =>
                                        Alert.alert(
                                            'Slet opslag',
                                            'Vil du slette dette opslag?',
                                            [
                                                {text: 'Annuller', style: 'cancel'},
                                                {
                                                    text: 'Slet',
                                                    style: 'destructive',
                                                    onPress: () => {
                                                        void handleDeletePost(post.postId);
                                                    },
                                                },
                                            ],
                                        )
                                    }
                                >
                                    <Ionicons
                                        name={deletingPostId === post.postId ? 'hourglass-outline' : 'trash-outline'}
                                        size={18}
                                        color="#D92D20"
                                    />
                                    <Text style={styles.postDeleteText}>
                                        {deletingPostId === post.postId ? 'Sletter...' : 'Slet'}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );

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
                        <View style={styles.sidebarPanel}>
                            <View>
                                <View style={styles.sidebarHeader}>
                                    <Text style={styles.sidebarTitle}>Menu</Text>
                                    <Pressable
                                        style={styles.sidebarCloseButton}
                                        onPress={() => setIsSidebarOpen(false)}
                                    >
                                        <Ionicons name="close" size={20} color="#111827"/>
                                    </Pressable>
                                </View>

                                <View style={styles.sidebarUserCard}>
                                    <Text style={styles.sidebarUserName}>{user.fullName}</Text>
                                    <Text style={styles.sidebarUserMeta}>{user.email}</Text>
                                    <Text style={styles.sidebarUserMeta}>{user.role}</Text>
                                </View>

                                <Pressable
                                    style={styles.sidebarLink}
                                    onPress={() => navigateToAdminView('overview')}
                                >
                                    <Ionicons name="grid-outline" size={20} color="#111827"/>
                                    <Text style={styles.sidebarLinkText}>Dashboard</Text>
                                </Pressable>

                                <Pressable
                                    style={styles.sidebarLink}
                                    onPress={() => navigateToAdminView('bookings')}
                                >
                                    <Ionicons name="calendar-outline" size={20} color="#111827"/>
                                    <Text style={styles.sidebarLinkText}>Bookinger</Text>
                                </Pressable>

                                <Pressable
                                    style={styles.sidebarLink}
                                    onPress={() => navigateToAdminView('users')}
                                >
                                    <Ionicons name="people-outline" size={20} color="#111827"/>
                                    <Text style={styles.sidebarLinkText}>Brugere</Text>
                                </Pressable>

                                <Pressable
                                    style={styles.sidebarLink}
                                    onPress={() => navigateToAdminView('posts')}
                                >
                                    <MaterialCommunityIcons name="bullhorn-outline" size={20} color="#111827"/>
                                    <Text style={styles.sidebarLinkText}>Opslag</Text>
                                </Pressable>

                                <Pressable
                                    style={styles.sidebarLink}
                                    onPress={() => navigateToAdminView('facilities')}
                                >
                                    <MaterialCommunityIcons name="office-building-outline" size={20} color="#111827"/>
                                    <Text style={styles.sidebarLinkText}>Faciliteter</Text>
                                </Pressable>

                                <Pressable
                                    style={styles.sidebarLink}
                                    onPress={() => navigateToAdminView('requests')}
                                >
                                    <Ionicons name="document-text-outline" size={20} color="#111827"/>
                                    <Text style={styles.sidebarLinkText}>Henvendelser</Text>
                                </Pressable>
                            </View>

                            <Pressable
                                style={styles.logoutButton}
                                onPress={async () => {
                                    setIsSidebarOpen(false);
                                    await logout();
                                    router.replace('/login');
                                }}
                            >
                                <Ionicons name="log-out-outline" size={20} color="#FFFFFF"/>
                                <Text style={styles.logoutButtonText}>Log ud</Text>
                            </Pressable>
                        </View>

                        <Pressable style={styles.sidebarBackdrop} onPress={() => setIsSidebarOpen(false)}/>
                    </View>
                </Modal>

                <View style={styles.header}>
                    {activeView === 'bookingDetail' || activeView === 'userDetail' || activeView === 'requestDetail' ? (
                        <Pressable
                            style={styles.iconButton}
                            onPress={() => {
                                if (activeView === 'bookingDetail') {
                                    setSelectedBooking(null);
                                    setActiveView('bookings');
                                    return;
                                }

                                if (activeView === 'userDetail') {
                                    setSelectedUserProfile(null);
                                    setActiveView('users');
                                    return;
                                }

                                setSelectedRequest(null);
                                setActiveView('requests');
                            }}
                        >
                            <Ionicons name="arrow-back" size={20} color="#111827"/>
                        </Pressable>
                    ) : (
                        <Pressable style={styles.iconButton} onPress={() => setIsSidebarOpen(true)}>
                            <Feather name="menu" size={20} color="#111827"/>
                        </Pressable>
                    )}

                    <Text style={styles.headerTitle}>
                        {activeView === 'bookingDetail'
                            ? 'Booking detaljer'
                            : activeView === 'userDetail'
                                ? 'Brugerprofil'
                                : activeView === 'bookings'
                                    ? 'Bookinger'
                                    : activeView === 'users'
                                        ? 'Brugere'
                                        : activeView === 'facilities'
                                            ? 'Faciliteter'
                                            : activeView === 'posts'
                                                ? 'Opslag'
                                                : activeView === 'requests'
                                                    ? 'Henvendelser'
                                                    : activeView === 'requestDetail'
                                                        ? 'Henvendelse'
                                                        : 'Overblik'}
                    </Text>

                    {activeView === 'overview'
                    || activeView === 'bookings'
                    || activeView === 'users'
                    || activeView === 'userDetail'
                    || activeView === 'facilities'
                    || activeView === 'posts'
                    || activeView === 'requests'
                    || activeView === 'requestDetail' ? (
                        <View style={styles.iconButtonPlaceholder}/>
                    ) : (
                        <View style={styles.iconButton}>
                            <Ionicons
                                name={
                                    activeView === 'bookingDetail'
                                        ? 'create-outline'
                                        : activeView === 'userDetail'
                                            ? 'person-outline'
                                            : activeView === 'bookings'
                                                ? 'options-outline'
                                                : activeView === 'users'
                                                    ? 'search-outline'
                                                    : activeView === 'posts'
                                                        ? 'bookmark-outline'
                                                        : activeView === 'requests'
                                                            ? 'document-text-outline'
                                                            : activeView === 'requestDetail'
                                                                ? 'chatbubble-outline'
                                                                : 'notifications-outline'
                                }
                                size={20}
                                color="#111827"
                            />
                        </View>
                    )}
                </View>

                {activeView === 'bookingDetail'
                    ? renderBookingDetailView()
                    : activeView === 'userDetail'
                        ? renderUserDetailView()
                        : activeView === 'requestDetail'
                            ? renderRequestDetailView()
                            : activeView === 'bookings'
                                ? renderBookingsView()
                                : activeView === 'users'
                                    ? renderUsersView()
                                    : activeView === 'facilities'
                                        ? renderFacilitiesView()
                                        : activeView === 'posts'
                                            ? renderPostsView()
                                        : activeView === 'requests'
                                                ? renderRequestsView()
                                                : renderOverview()}

                <View style={styles.adminBottomBar}>
                    <Pressable style={styles.adminBottomItem} onPress={() => navigateToAdminView('bookings')}>
                        <Ionicons
                            name="calendar-outline"
                            size={22}
                            color={activeNavTarget === 'bookings' ? '#111827' : '#9CA3AF'}
                        />
                    </Pressable>

                    <Pressable style={styles.adminBottomItem} onPress={() => navigateToAdminView('users')}>
                        <Ionicons
                            name="people-outline"
                            size={22}
                            color={activeNavTarget === 'users' ? '#111827' : '#9CA3AF'}
                        />
                    </Pressable>

                    <Pressable
                        style={styles.adminBottomItem}
                        onPress={() => navigateToAdminView('overview')}
                    >
                        <Ionicons
                            name="grid-outline"
                            size={24}
                            color={activeNavTarget === 'overview' ? '#111827' : '#9CA3AF'}
                        />
                    </Pressable>

                    <Pressable style={styles.adminBottomItem} onPress={() => navigateToAdminView('posts')}>
                        <MaterialCommunityIcons
                            name="bullhorn-outline"
                            size={22}
                            color={activeNavTarget === 'posts' ? '#111827' : '#9CA3AF'}
                        />
                    </Pressable>

                    <Pressable style={styles.adminBottomItem} onPress={() => navigateToAdminView('facilities')}>
                        <MaterialCommunityIcons
                            name="office-building-outline"
                            size={22}
                            color={activeNavTarget === 'facilities' ? '#111827' : '#9CA3AF'}
                        />
                    </Pressable>

                    <Pressable style={styles.adminBottomItem} onPress={() => navigateToAdminView('requests')}>
                        <Ionicons
                            name="document-text-outline"
                            size={22}
                            color={activeNavTarget === 'requests' ? '#111827' : '#9CA3AF'}
                        />
                    </Pressable>
                </View>
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
    adminBottomBar: {
        minHeight: 78,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingTop: 8,
        paddingBottom: 8,
    },
    adminBottomItem: {
        flex: 1,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
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
    iconButtonPlaceholder: {
        width: 34,
        height: 34,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
    },
    sidebarOverlay: {
        flex: 1,
        flexDirection: 'row',
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
        shadowOffset: {width: 0, height: 4},
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
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
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
        backgroundColor: '#1D4ED8',
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
    bookingsView: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    bookingTabsRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    bookingTabButton: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 10,
    },
    bookingTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#667085',
    },
    bookingTabTextActive: {
        color: '#111827',
    },
    bookingTabIndicator: {
        marginTop: 12,
        height: 3,
        width: '82%',
        borderRadius: 999,
        backgroundColor: '#3F7FC4',
    },
    bookingsFilters: {
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 12,
    },
    searchField: {
        minHeight: 56,
        borderRadius: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
        paddingVertical: 0,
    },
    filterPill: {
        minHeight: 56,
        borderRadius: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 10,
    },
    filterPillText: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
    },
    bookingsList: {
        flex: 1,
        marginTop: 16,
    },
    bookingsListContent: {
        paddingHorizontal: 16,
        paddingBottom: 28,
    },
    bookingOverviewCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    bookingOverviewMain: {
        flex: 1,
    },
    requestCardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 4,
    },
    bookingOverviewTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    bookingOverviewResident: {
        fontSize: 14,
        color: '#344054',
        marginBottom: 4,
    },
    bookingOverviewMeta: {
        fontSize: 13,
        color: '#667085',
    },
    bookingOverviewSide: {
        alignItems: 'flex-end',
        gap: 10,
    },
    facilityCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        padding: 14,
        marginBottom: 12,
    },
    facilityCardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 14,
    },
    facilityCardInfo: {
        flex: 1,
    },
    facilityCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    facilityCardMeta: {
        fontSize: 13,
        color: '#667085',
    },
    facilityStatusPill: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    facilityStatusPillText: {
        fontSize: 12,
        fontWeight: '700',
    },
    facilityActionsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    facilityActionButton: {
        flex: 1,
        minHeight: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D0D5DD',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
    },
    facilityActionButtonActive: {
        borderColor: '#3F7FC4',
        backgroundColor: '#EFF6FF',
    },
    facilityActionText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#344054',
        textAlign: 'center',
    },
    facilityActionTextActive: {
        color: '#1D4ED8',
    },
    facilityUpdatingText: {
        fontSize: 12,
        color: '#667085',
        marginTop: 10,
    },
    postAdminCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        padding: 14,
        marginBottom: 12,
    },
    postAdminHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 10,
    },
    postAdminTitleWrap: {
        flex: 1,
    },
    postAdminTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    postAdminMeta: {
        fontSize: 12,
        color: '#667085',
    },
    postAdminContent: {
        fontSize: 14,
        lineHeight: 20,
        color: '#344054',
        marginBottom: 12,
    },
    postAdminFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    postAdminDate: {
        fontSize: 12,
        color: '#667085',
    },
    postDeleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 36,
    },
    postDeleteText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#D92D20',
    },
    userListCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        padding: 14,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    userListLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    userAvatar: {
        width: 42,
        height: 42,
        borderRadius: 999,
        backgroundColor: '#F2F4F7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 12,
        color: '#667085',
    },
    userListRight: {
        alignItems: 'flex-end',
        gap: 6,
    },
    userRoleBadge: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6941C6',
    },
    bookingOverviewStatus: {
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    bookingOverviewStatusText: {
        fontSize: 13,
        fontWeight: '700',
    },
    bookingDetailScroll: {
        flex: 1,
    },
    bookingDetailContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 32,
    },
    bookingDetailHero: {
        alignItems: 'center',
        paddingTop: 6,
        paddingBottom: 18,
    },
    userProfileHero: {
        alignItems: 'center',
        paddingTop: 6,
        paddingBottom: 18,
    },
    userProfileAvatar: {
        width: 72,
        height: 72,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#D0D5DD',
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    userProfileName: {
        fontSize: 26,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 6,
    },
    userProfileSubtitle: {
        fontSize: 14,
        color: '#475467',
        textAlign: 'center',
    },
    bookingDetailStatus: {
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginBottom: 14,
    },
    bookingDetailStatusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    bookingDetailIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#D0D5DD',
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    bookingDetailTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 6,
    },
    bookingDetailSubtitle: {
        fontSize: 14,
        color: '#475467',
        textAlign: 'center',
    },
    bookingDetailSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#344054',
        marginBottom: 8,
        marginTop: 12,
    },
    bookingDetailCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        marginBottom: 4,
        overflow: 'hidden',
    },
    bookingDetailUserRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    bookingDetailAvatar: {
        width: 40,
        height: 40,
        borderRadius: 999,
        backgroundColor: '#F2F4F7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bookingDetailUserInfo: {
        flex: 1,
    },
    requestChatButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EEF4FF',
    },
    bookingDetailUserName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    bookingDetailUserEmail: {
        fontSize: 12,
        color: '#667085',
    },
    bookingDetailInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 12,
    },
    bookingDetailInfoLabel: {
        fontSize: 13,
        color: '#475467',
    },
    bookingDetailInfoValue: {
        flex: 1,
        textAlign: 'right',
        fontSize: 13,
        fontWeight: '500',
        color: '#111827',
    },
    bookingDetailDivider: {
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    bookingDetailActionRow: {
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        gap: 12,
    },
    bookingDetailActionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    bookingDetailActionText: {
        fontSize: 14,
        color: '#111827',
    },
    bookingDetailActionDanger: {
        fontSize: 14,
        color: '#D92D20',
    },
    requestDescription: {
        paddingHorizontal: 14,
        paddingVertical: 14,
        fontSize: 14,
        lineHeight: 21,
        color: '#344054',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 28,
    },
    welcomeText: {
        fontSize: 15,
        color: '#344054',
        marginBottom: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 16,
    },
    statCard: {
        width: '48.5%',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 14,
        minHeight: 100,
    },
    statTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '800',
        color: '#101828',
    },
    statLabel: {
        fontSize: 13,
        lineHeight: 18,
        color: '#475467',
        maxWidth: '85%',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#101828',
    },
    sectionAction: {
        fontSize: 13,
        fontWeight: '600',
        color: '#3F7FC4',
    },
    listCard: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
    },
    listMain: {
        flex: 1,
    },
    listTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#101828',
        marginBottom: 4,
    },
    listSubtitle: {
        fontSize: 13,
        lineHeight: 18,
        color: '#475467',
        marginBottom: 6,
    },
    listMeta: {
        fontSize: 12,
        color: '#667085',
    },
    statusPill: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#F2F4F7',
    },
    statusPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#344054',
    },
    problemBadge: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    problemBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    emptyText: {
        fontSize: 14,
        color: '#667085',
        marginBottom: 16,
    },
});
