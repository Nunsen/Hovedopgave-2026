import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { ChatUserSearchDto, createDirectChat, searchChatUsers } from '@/lib/api';

export default function NewChatScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [searchText, setSearchText] = useState('');
    const [users, setUsers] = useState<ChatUserSearchDto[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [creatingUserId, setCreatingUserId] = useState<number | null>(null);

    const loadUsers = useCallback(async (query: string) => {
        if (!user) return;

        setLoadingUsers(true);
        const result = await searchChatUsers(user.userId, query);

        if (result.error) {
            Alert.alert('Kunne ikke hente brugere', result.error);
            setLoadingUsers(false);
            return;
        }

        setUsers(result.data ?? []);
        setLoadingUsers(false);
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            void loadUsers(searchText);
        }, [loadUsers, searchText]),
    );

    useEffect(() => {
        const timeout = setTimeout(() => {
            void loadUsers(searchText);
        }, 250);

        return () => clearTimeout(timeout);
    }, [loadUsers, searchText]);

    const handleCreateConversation = async (targetUserId: number) => {
        if (!user) return;

        setCreatingUserId(targetUserId);
        const result = await createDirectChat({
            userId: user.userId,
            targetUserId,
        });
        setCreatingUserId(null);

        if (result.error || !result.data) {
            Alert.alert('Kunne ikke oprette samtalen', result.error ?? 'Ukendt fejl.');
            return;
        }

        router.replace({
            pathname: '/chat',
            params: {
                tab: 'Samtaler',
                groupId: String(result.data.groupId),
                conversation: '1',
            },
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Pressable style={styles.headerIcon} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color="#2563EB" />
                    </Pressable>
                    <Text style={styles.title}>Ny besked</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <View style={styles.searchField}>
                    <Feather name="search" size={18} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Søg efter en person"
                        placeholderTextColor="#9CA3AF"
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Pressable style={styles.groupCard} onPress={() => router.push('/new-group')}>
                        <View style={styles.groupCardText}>
                            <Text style={styles.groupTitle}>Gruppechat</Text>
                            <Text style={styles.groupSubtitle}>Opret en ny gruppe og vælg medlemmer</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="#2563EB" />
                    </Pressable>

                    <Text style={styles.sectionTitle}>
                        {searchText.trim() ? 'Brugere' : 'Anbefalede'}
                    </Text>

                    {loadingUsers ? (
                        <ActivityIndicator style={styles.loader} />
                    ) : users.length === 0 ? (
                        <Text style={styles.emptyText}>Ingen brugere matcher din søgning.</Text>
                    ) : (
                        users.map((chatUser) => (
                            <Pressable
                                key={chatUser.userId}
                                style={styles.userRow}
                                onPress={() => handleCreateConversation(chatUser.userId)}
                                disabled={creatingUserId === chatUser.userId}
                            >
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>
                                        {chatUser.fullName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>

                                <View style={styles.userTextWrap}>
                                    <Text style={styles.userName}>{chatUser.fullName}</Text>
                                    <Text style={styles.userSubtitle}>{chatUser.subtitle}</Text>
                                </View>

                                {creatingUserId === chatUser.userId ? (
                                    <ActivityIndicator color="#2563EB" />
                                ) : null}
                            </Pressable>
                        ))
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 8 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
    },
    headerIcon: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerSpacer: { width: 36, height: 36 },
    title: { fontSize: 24, fontWeight: '700', color: '#111827' },
    searchField: {
        minHeight: 48,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        marginBottom: 18,
    },
    searchInput: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: 0 },
    content: { flex: 1 },
    contentContainer: { paddingBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },
    loader: { marginTop: 18 },
    emptyText: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#DBEAFE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: 16, fontWeight: '700', color: '#1D4ED8' },
    userTextWrap: { flex: 1 },
    userName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
    userSubtitle: { fontSize: 14, color: '#6B7280' },
    groupCard: {
        marginBottom: 24,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 16,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
    },
    groupCardText: { flex: 1, paddingRight: 12 },
    groupTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
    groupSubtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
});
