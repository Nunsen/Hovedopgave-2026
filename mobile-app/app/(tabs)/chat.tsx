import {Feather, Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {useFocusEffect} from '@react-navigation/native';
import {useRouter} from 'expo-router';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {BottomNav} from '@/components/navigation/bottom-nav';
import {useAuth} from '@/context/AuthContext';
import {
    ChatMessageDto,
    ChatOverviewDto,
    createChatGroup,
    createChatMessage,
    getChatMessages,
    getChatOverview,
    joinChatGroup,
} from '@/lib/api';
import {type ChatStompClient, createChatClient} from '@/lib/chat';

type ChatTab = 'Samtaler' | 'Grupper';

type CreateGroupFieldErrors = {
    name?: string;
    description?: string;
};

function formatConversationTime(value: string | null) {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayDiff = Math.round((startOfToday.getTime() - startOfTarget.getTime()) / 86400000);

    if (dayDiff === 0) {
        return date.toLocaleTimeString('da-DK', {hour: '2-digit', minute: '2-digit'});
    }

    if (dayDiff === 1) {
        return 'I går';
    }

    if (dayDiff > 1 && dayDiff < 7) {
        const weekday = date.toLocaleDateString('da-DK', {weekday: 'long'});
        return weekday.charAt(0).toUpperCase() + weekday.slice(1);
    }

    return date.toLocaleDateString('da-DK', {day: '2-digit', month: '2-digit'});
}

function formatMessageTime(value: string) {
    return new Date(value).toLocaleTimeString('da-DK', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function ChatScreen() {
    const router = useRouter();
    const {isLoading, logout, user} = useAuth();
    const [activeTab, setActiveTab] = useState<ChatTab>('Samtaler');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isConversationOpen, setIsConversationOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [overview, setOverview] = useState<ChatOverviewDto | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessageDto[]>([]);
    const [messageText, setMessageText] = useState('');
    const [createName, setCreateName] = useState('');
    const [createDescription, setCreateDescription] = useState('');
    const [fieldErrors, setFieldErrors] = useState<CreateGroupFieldErrors>({});
    const [loadingOverview, setLoadingOverview] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [joiningGroupId, setJoiningGroupId] = useState<number | null>(null);
    const [creatingGroup, setCreatingGroup] = useState(false);
    const clientRef = useRef<ChatStompClient | null>(null);
    const selectedGroupIdRef = useRef<number | null>(null);
    const messagesScrollRef = useRef<ScrollView | null>(null);

    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/login');
        }
    }, [isLoading, router, user]);

    useEffect(() => {
        selectedGroupIdRef.current = selectedGroupId;
    }, [selectedGroupId]);

    const loadOverview = useCallback(async () => {
        if (!user) {
            return;
        }

        setLoadingOverview(true);
        const result = await getChatOverview(user.userId);

        if (result.error) {
            Alert.alert('Kunne ikke hente chat', result.error);
            setLoadingOverview(false);
            return;
        }

        const nextOverview = result.data ?? {joinedGroups: [], availableGroups: []};
        setOverview(nextOverview);

        setSelectedGroupId((currentSelectedGroupId) => {
            if (
                currentSelectedGroupId &&
                nextOverview.joinedGroups.some((group) => group.groupId === currentSelectedGroupId)
            ) {
                return currentSelectedGroupId;
            }

            return nextOverview.joinedGroups[0]?.groupId ?? null;
        });

        setLoadingOverview(false);
    }, [user]);

    const loadMessages = useCallback(async (groupId: number) => {
        if (!user) {
            return;
        }

        setLoadingMessages(true);
        const result = await getChatMessages(groupId, user.userId);

        if (result.error) {
            Alert.alert('Kunne ikke hente beskeder', result.error);
            setLoadingMessages(false);
            return;
        }

        setMessages(result.data ?? []);
        setLoadingMessages(false);
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            loadOverview();
        }, [loadOverview]),
    );

    useEffect(() => {
        if (selectedGroupId) {
            loadMessages(selectedGroupId);
        } else {
            setMessages([]);
        }
    }, [loadMessages, selectedGroupId]);

    const joinedGroupIdsKey = useMemo(
        () => (overview?.joinedGroups ?? []).map((group) => group.groupId).sort((left, right) => left - right).join(','),
        [overview?.joinedGroups],
    );
    const joinedGroupIds = useMemo(
        () => (joinedGroupIdsKey ? joinedGroupIdsKey.split(',').map((value) => Number(value)) : []),
        [joinedGroupIdsKey],
    );

    useEffect(() => {
        if (!user || joinedGroupIds.length === 0) {
            return undefined;
        }

        const {client, disconnect} = createChatClient({
            groupIds: joinedGroupIds,
            onError: (message) => {
                console.warn('Chat realtime connection failed:', message);
            },
            onMessage: (incomingMessage) => {
                setMessages((currentMessages) => {
                    if (incomingMessage.groupId !== selectedGroupIdRef.current) {
                        return currentMessages;
                    }

                    if (currentMessages.some((message) => message.messageId === incomingMessage.messageId)) {
                        return currentMessages;
                    }

                    return [...currentMessages, incomingMessage];
                });

                setOverview((currentOverview) => {
                    if (!currentOverview) {
                        return currentOverview;
                    }

                    return {
                        ...currentOverview,
                        joinedGroups: currentOverview.joinedGroups.map((group) =>
                            group.groupId === incomingMessage.groupId
                                ? {
                                    ...group,
                                    lastMessagePreview: incomingMessage.message,
                                    lastMessageAt: incomingMessage.sentAt,
                                }
                                : group,
                        ),
                    };
                });
            },
        });

        client.activate();
        clientRef.current = client;

        return () => {
            clientRef.current = null;
            void disconnect();
        };
    }, [joinedGroupIds, user]);

    const handleLogout = async () => {
        setIsSidebarOpen(false);
        await logout();
        router.replace('/login');
    };

    const handleJoinGroup = async (groupId: number) => {
        if (!user) {
            return;
        }

        setJoiningGroupId(groupId);
        const result = await joinChatGroup(groupId, {userId: user.userId});
        setJoiningGroupId(null);

        if (result.error) {
            Alert.alert('Kunne ikke tilmelde gruppen', result.error);
            return;
        }

        await loadOverview();
        setActiveTab('Samtaler');
        setSelectedGroupId(result.data?.groupId ?? groupId);
        setIsConversationOpen(true);
    };

    const handleCreateGroup = async () => {
        if (!user) {
            return;
        }

        const nextFieldErrors: CreateGroupFieldErrors = {};

        if (!createName.trim()) {
            nextFieldErrors.name = 'Gruppenavn er obligatorisk.';
        }

        if (!createDescription.trim()) {
            nextFieldErrors.description = 'Beskrivelse er obligatorisk.';
        }

        if (Object.keys(nextFieldErrors).length > 0) {
            setFieldErrors(nextFieldErrors);
            return;
        }

        setCreatingGroup(true);
        const result = await createChatGroup({
            userId: user.userId,
            name: createName.trim(),
            description: createDescription.trim(),
        });
        setCreatingGroup(false);

        if (result.error) {
            setFieldErrors(result.error.fieldErrors ?? {});
            Alert.alert('Kunne ikke oprette gruppe', result.error.message);
            return;
        }

        setCreateName('');
        setCreateDescription('');
        setFieldErrors({});
        setIsCreateModalOpen(false);
        await loadOverview();
        setActiveTab('Samtaler');
        setSelectedGroupId(result.data?.groupId ?? null);
        setIsConversationOpen(true);
    };

    const handleSendMessage = async () => {
        if (!user || !selectedGroupId || !messageText.trim()) {
            return;
        }

        const trimmedMessage = messageText.trim();
        const result = await createChatMessage(selectedGroupId, {
            userId: user.userId,
            message: trimmedMessage,
        });

        if (result.error) {
            Alert.alert('Kunne ikke sende beskeden', result.error);
            return;
        }

        setMessageText('');

        if (result.data) {
            const createdMessage = result.data;

            setMessages((currentMessages) => {
                if (currentMessages.some((message) => message.messageId === createdMessage.messageId)) {
                    return currentMessages;
                }

                return [...currentMessages, createdMessage];
            });

            setOverview((currentOverview) => {
                if (!currentOverview) {
                    return currentOverview;
                }

                return {
                    ...currentOverview,
                    joinedGroups: currentOverview.joinedGroups.map((group) =>
                        group.groupId === selectedGroupId
                            ? {
                                ...group,
                                lastMessagePreview: result.data?.message ?? null,
                                lastMessageAt: result.data?.sentAt ?? null,
                            }
                            : group,
                    ),
                };
            });
        }
    };

    const joinedGroups = useMemo(() => overview?.joinedGroups ?? [], [overview]);
    const availableGroups = useMemo(() => overview?.availableGroups ?? [], [overview]);
    const selectedGroup = joinedGroups.find((group) => group.groupId === selectedGroupId) ?? null;

    const filteredJoinedGroups = useMemo(() => {
        const searchValue = searchText.trim().toLowerCase();
        if (!searchValue) {
            return joinedGroups;
        }

        return joinedGroups.filter((group) =>
            group.name.toLowerCase().includes(searchValue)
            || group.description.toLowerCase().includes(searchValue)
            || (group.lastMessagePreview ?? '').toLowerCase().includes(searchValue),
        );
    }, [joinedGroups, searchText]);

    const filteredAvailableGroups = useMemo(() => {
        const searchValue = searchText.trim().toLowerCase();
        if (!searchValue) {
            return availableGroups;
        }

        return availableGroups.filter((group) =>
            group.name.toLowerCase().includes(searchValue)
            || group.description.toLowerCase().includes(searchValue),
        );
    }, [availableGroups, searchText]);

    if (isLoading || loadingOverview) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator/>
            </SafeAreaView>
        );
    }

    if (!user) {
        return null;
    }

    const showConversationView = activeTab === 'Samtaler' && isConversationOpen && selectedGroup;

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.container}>
                <Modal
                    transparent
                    visible={isSidebarOpen}
                    animationType="fade"
                    onRequestClose={() => setIsSidebarOpen(false)}
                >
                    <View style={styles.sidebarOverlay}>
                        <Pressable style={styles.sidebarBackdrop} onPress={() => setIsSidebarOpen(false)}/>

                        <View style={styles.sidebarPanel}>
                            <View>
                                <View style={styles.sidebarHeader}>
                                    <Text style={styles.sidebarTitle}>Menu</Text>
                                    <Pressable style={styles.sidebarCloseButton}
                                               onPress={() => setIsSidebarOpen(false)}>
                                        <Ionicons name="close" size={22} color="#111827"/>
                                    </Pressable>
                                </View>

                                <View style={styles.sidebarUserCard}>
                                    <Text style={styles.sidebarUserName}>{user.fullName}</Text>
                                    <Text style={styles.sidebarUserMeta}>{user.email}</Text>
                                    <Text style={styles.sidebarUserMeta}>{user.role}</Text>
                                </View>

                                <Pressable style={styles.sidebarLink} onPress={() => {
                                    setIsSidebarOpen(false);
                                    router.replace('/home');
                                }}>
                                    <Ionicons name="home-outline" size={20} color="#111827"/>
                                    <Text style={styles.sidebarLinkText}>Forside</Text>
                                </Pressable>

                                <Pressable style={styles.sidebarLink} onPress={() => {
                                    setIsSidebarOpen(false);
                                    router.replace('/chat');
                                }}>
                                    <Ionicons name="chatbubble-ellipses-outline" size={20} color="#111827"/>
                                    <Text style={styles.sidebarLinkText}>Chat</Text>
                                </Pressable>

                                <Pressable style={styles.sidebarLink} onPress={() => {
                                    setIsSidebarOpen(false);
                                    router.push('/profile');
                                }}>
                                    <Ionicons name="person-outline" size={20} color="#111827"/>
                                    <Text style={styles.sidebarLinkText}>Profil</Text>
                                </Pressable>

                                <Pressable style={styles.sidebarLink} onPress={() => {
                                    setIsSidebarOpen(false);
                                    router.push('/book-washing');
                                }}>
                                    <MaterialCommunityIcons name="washing-machine" size={20} color="#111827"/>
                                    <Text style={styles.sidebarLinkText}>Vaskeri</Text>
                                </Pressable>

                                <Pressable style={styles.sidebarLink} onPress={() => {
                                    setIsSidebarOpen(false);
                                    router.push('/book-partyroom');
                                }}>
                                    <MaterialCommunityIcons name="party-popper" size={20} color="#111827"/>
                                    <Text style={styles.sidebarLinkText}>Festsal</Text>
                                </Pressable>
                            </View>

                            <Pressable style={styles.logoutButton} onPress={handleLogout}>
                                <Ionicons name="log-out-outline" size={20} color="#FFFFFF"/>
                                <Text style={styles.logoutButtonText}>Log ud</Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>

                <Modal
                    transparent
                    visible={isCreateModalOpen}
                    animationType="slide"
                    onRequestClose={() => setIsCreateModalOpen(false)}
                >
                    <View style={styles.createOverlay}>
                        <View style={styles.createModalCard}>
                            <View style={styles.createModalHeader}>
                                <Text style={styles.createModalTitle}>Opret gruppe</Text>
                                <Pressable style={styles.sidebarCloseButton}
                                           onPress={() => setIsCreateModalOpen(false)}>
                                    <Ionicons name="close" size={22} color="#111827"/>
                                </Pressable>
                            </View>

                            <TextInput
                                style={[styles.createInput, fieldErrors.name ? styles.createInputError : null]}
                                placeholder="Gruppenavn"
                                placeholderTextColor="#9CA3AF"
                                value={createName}
                                onChangeText={(value) => {
                                    setCreateName(value);
                                    setFieldErrors((currentErrors) => ({...currentErrors, name: undefined}));
                                }}
                            />
                            {fieldErrors.name ? <Text style={styles.fieldError}>{fieldErrors.name}</Text> : null}

                            <TextInput
                                style={[styles.createInput, styles.createTextArea, fieldErrors.description ? styles.createInputError : null]}
                                placeholder="Beskrivelse eller formaal"
                                placeholderTextColor="#9CA3AF"
                                value={createDescription}
                                onChangeText={(value) => {
                                    setCreateDescription(value);
                                    setFieldErrors((currentErrors) => ({...currentErrors, description: undefined}));
                                }}
                                multiline
                            />
                            {fieldErrors.description ? <Text style={styles.fieldError}>{fieldErrors.description}</Text> : null}

                            <Pressable
                                style={[styles.primaryButton, creatingGroup ? styles.primaryButtonDisabled : null]}
                                onPress={handleCreateGroup}
                                disabled={creatingGroup}
                            >
                                {creatingGroup ? <ActivityIndicator color="#FFFFFF"/> : (
                                    <Text style={styles.primaryButtonText}>Opret chatgruppe</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </Modal>

                {showConversationView ? (
                    <View style={styles.conversationScreen}>
                        <View style={styles.detailHeader}>
                            <Pressable style={styles.detailHeaderIcon} onPress={() => setIsConversationOpen(false)}>
                                <Ionicons name="arrow-back" size={22} color="#2563EB"/>
                            </Pressable>

                            <View style={styles.detailHeaderContent}>
                                <Text style={styles.detailHeaderTitle}>{selectedGroup.name}</Text>
                                <Text style={styles.detailHeaderSubtitle}>{selectedGroup.memberCount} medlemmer</Text>
                            </View>

                            <Pressable style={styles.detailHeaderIcon}>
                                <Ionicons name="information-circle-outline" size={24} color="#2563EB"/>
                            </Pressable>
                        </View>

                        <ScrollView
                            ref={messagesScrollRef}
                            style={styles.detailMessages}
                            contentContainerStyle={styles.detailMessagesContent}
                            showsVerticalScrollIndicator={false}
                            onContentSizeChange={() => {
                                messagesScrollRef.current?.scrollToEnd({animated: true});
                            }}
                        >
                            {loadingMessages ? (
                                <ActivityIndicator style={styles.inlineLoader}/>
                            ) : messages.length === 0 ? (
                                <Text style={styles.emptyText}>Der er ingen beskeder i gruppen endnu.</Text>
                            ) : (
                                messages.map((message) => {
                                    const ownMessage = message.userId === user.userId;

                                    return (
                                        <View key={`${message.messageId}-${message.sentAt}`} style={styles.detailMessageBlock}>
                                            <View style={[styles.detailMessageRow, ownMessage ? styles.detailMessageRowOwn : null]}>
                                                {!ownMessage ? <View style={styles.detailAvatar}/> : null}

                                                <View style={[styles.detailBubbleWrap, ownMessage ? styles.detailBubbleWrapOwn : null]}>
                                                    <View style={[styles.detailBubble, ownMessage ? styles.detailBubbleOwn : null]}>
                                                        <Text style={[styles.detailAuthor, ownMessage ? styles.detailAuthorOwn : null]}>
                                                            {ownMessage ? 'Dig' : message.authorName}
                                                        </Text>
                                                        <Text style={[styles.detailMessageText, ownMessage ? styles.detailMessageTextOwn : null]}>
                                                            {message.message}
                                                        </Text>
                                                    </View>
                                                    <Text style={[styles.detailTime, ownMessage ? styles.detailTimeOwn : null]}>
                                                        {formatMessageTime(message.sentAt)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })
                            )}
                        </ScrollView>

                        <View style={styles.detailComposerBar}>
                            <TextInput
                                style={styles.detailComposerInput}
                                placeholder="Skriv en besked..."
                                placeholderTextColor="#9CA3AF"
                                value={messageText}
                                onChangeText={setMessageText}
                            />
                            <Pressable
                                style={[styles.detailSendButton, !messageText.trim() ? styles.sendButtonDisabled : null]}
                                onPress={handleSendMessage}
                                disabled={!messageText.trim()}
                            >
                                <Ionicons name="send" size={18} color="#FFFFFF"/>
                            </Pressable>
                        </View>
                    </View>
                ) : (
                    <>
                        <View style={styles.header}>
                            <Pressable style={styles.iconButton} onPress={() => setIsSidebarOpen(true)}>
                                <Feather name="menu" size={22} color="#1F2937"/>
                            </Pressable>

                            <View style={styles.headerTitleWrap}>
                                <MaterialCommunityIcons name="chat" size={24} color="#2563EB"/>
                                <Text style={styles.headerTitle}>Chat</Text>
                            </View>

                            {activeTab === 'Grupper' && user.role?.toUpperCase() === 'ADMIN' ? (
                                <Pressable style={styles.iconButton} onPress={() => setIsCreateModalOpen(true)}>
                                    <Ionicons name="add" size={22} color="#2563EB"/>
                                </Pressable>
                            ) : (
                                <View style={styles.headerSpacer}/>
                            )}
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                            <View style={styles.segmentRow}>
                                {(['Samtaler', 'Grupper'] as ChatTab[]).map((tab) => (
                                    <Pressable
                                        key={tab}
                                        style={[styles.segmentButton, activeTab === tab ? styles.segmentButtonActive : null]}
                                        onPress={() => {
                                            setActiveTab(tab);
                                            setIsConversationOpen(false);
                                        }}
                                    >
                                        <Text style={[styles.segmentButtonText, activeTab === tab ? styles.segmentButtonTextActive : null]}>
                                            {tab}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>

                            <View style={styles.searchField}>
                                <Feather name="search" size={18} color="#9CA3AF"/>
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Søg efter samtaler eller grupper"
                                    placeholderTextColor="#9CA3AF"
                                    value={searchText}
                                    onChangeText={setSearchText}
                                />
                            </View>

                            {activeTab === 'Samtaler' ? (
                                <View style={styles.conversationListCard}>
                                    {filteredJoinedGroups.length === 0 ? (
                                        <Text style={styles.emptyStateText}>Du er ikke tilmeldt nogen chatgrupper endnu.</Text>
                                    ) : (
                                        filteredJoinedGroups.map((group, index) => (
                                            <Pressable
                                                key={group.groupId}
                                                style={[styles.conversationItem, index === filteredJoinedGroups.length - 1 ? styles.conversationItemLast : null]}
                                                onPress={() => {
                                                    setSelectedGroupId(group.groupId);
                                                    setIsConversationOpen(true);
                                                }}
                                            >
                                                <View style={styles.conversationAvatar}>
                                                    <Ionicons name="people" size={22} color="#2563EB"/>
                                                </View>

                                                <View style={styles.conversationContent}>
                                                    <View style={styles.conversationTopRow}>
                                                        <Text style={styles.conversationName}>{group.name}</Text>
                                                        <Text style={styles.conversationTime}>{formatConversationTime(group.lastMessageAt)}</Text>
                                                    </View>

                                                    <Text style={styles.conversationPreview} numberOfLines={1}>
                                                        {group.lastMessagePreview ?? group.description}
                                                    </Text>
                                                </View>
                                            </Pressable>
                                        ))
                                    )}
                                </View>
                            ) : (
                                <View style={styles.availableList}>
                                    {filteredAvailableGroups.length === 0 ? (
                                        <Text style={styles.emptyText}>Der er ingen andre grupper at tilmelde sig lige nu.</Text>
                                    ) : (
                                        filteredAvailableGroups.map((group) => (
                                            <View key={group.groupId} style={styles.availableCard}>
                                                <View style={styles.availableCardTop}>
                                                    <View style={styles.availableCardHeaderText}>
                                                        <Text style={styles.availableCardTitle}>{group.name}</Text>
                                                        <Text style={styles.availableCardMeta}>{group.memberCount} medlemmer</Text>
                                                    </View>

                                                    <Pressable
                                                        style={[styles.joinButton, joiningGroupId === group.groupId ? styles.primaryButtonDisabled : null]}
                                                        onPress={() => handleJoinGroup(group.groupId)}
                                                        disabled={joiningGroupId === group.groupId}
                                                    >
                                                        <Text style={styles.joinButtonText}>
                                                            {joiningGroupId === group.groupId ? 'Tilmelder...' : 'Tilmeld'}
                                                        </Text>
                                                    </Pressable>
                                                </View>

                                                <Text style={styles.availableCardDescription}>{group.description}</Text>
                                                <Text style={styles.availableCardCreator}>Oprettet af {group.createdByName}</Text>
                                            </View>
                                        ))
                                    )}
                                </View>
                            )}
                        </ScrollView>

                        <BottomNav
                            active="chat"
                            onChatPress={() => router.replace('/chat')}
                            onHomePress={() => router.replace('/home')}
                            onWashingPress={() => router.push('/book-washing')}
                            onPartyPress={() => router.push('/book-partyroom')}
                            onProfilePress={() => router.push('/profile')}
                        />
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: '#FFFFFF'},
    loadingContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'},
    container: {flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingTop: 10},
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
    },
    headerTitleWrap: {flexDirection: 'row', alignItems: 'center', gap: 10},
    headerTitle: {fontSize: 20, fontWeight: '800', color: '#111827'},
    headerSpacer: {width: 36, height: 36},
    scrollContent: {paddingTop: 14, paddingBottom: 110},
    segmentRow: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderRadius: 14,
        padding: 4,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    segmentButton: {
        flex: 1,
        minHeight: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentButtonActive: {backgroundColor: '#2F2F2F'},
    segmentButtonText: {fontSize: 14, fontWeight: '700', color: '#6B7280'},
    segmentButtonTextActive: {color: '#FFFFFF'},
    searchField: {
        height: 44,
        borderRadius: 16,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 14,
    },
    searchInput: {flex: 1, fontSize: 15, color: '#111827', paddingVertical: 0},
    conversationListCard: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
    },
    conversationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    conversationItemLast: {borderBottomWidth: 0},
    conversationAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    conversationContent: {flex: 1},
    conversationTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    conversationName: {flex: 1, fontSize: 15, fontWeight: '700', color: '#111827'},
    conversationTime: {fontSize: 12, color: '#6B7280'},
    conversationPreview: {fontSize: 13, color: '#6B7280', lineHeight: 18},
    conversationScreen: {flex: 1, paddingTop: 2},
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingBottom: 12,
    },
    detailHeaderIcon: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailHeaderContent: {flex: 1},
    detailHeaderTitle: {fontSize: 18, fontWeight: '800', color: '#111827'},
    detailHeaderSubtitle: {fontSize: 14, color: '#6B7280', marginTop: 2},
    detailMessages: {flex: 1},
    detailMessagesContent: {paddingTop: 10, paddingBottom: 20},
    inlineLoader: {marginVertical: 24},
    detailMessageBlock: {marginBottom: 12},
    detailMessageRow: {flexDirection: 'row', alignItems: 'flex-end', gap: 10},
    detailMessageRowOwn: {justifyContent: 'flex-end'},
    detailAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#E5E7EB',
    },
    detailBubbleWrap: {maxWidth: '78%'},
    detailBubbleWrapOwn: {alignItems: 'flex-end'},
    detailBubble: {
        borderRadius: 18,
        backgroundColor: '#F5F7FB',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    detailBubbleOwn: {backgroundColor: '#2563EB'},
    detailAuthor: {fontSize: 11, fontWeight: '700', color: '#4B5563', marginBottom: 4},
    detailAuthorOwn: {color: '#DBEAFE'},
    detailMessageText: {fontSize: 15, lineHeight: 22, color: '#111827'},
    detailMessageTextOwn: {color: '#FFFFFF'},
    detailTime: {fontSize: 11, color: '#9CA3AF', marginTop: 6},
    detailTimeOwn: {textAlign: 'right'},
    detailComposerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingTop: 10,
        paddingBottom: 8,
    },
    detailComposerInput: {
        flex: 1,
        minHeight: 48,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        fontSize: 14,
        color: '#111827',
    },
    detailSendButton: {
        width: 46,
        height: 46,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563EB',
    },
    sendButtonDisabled: {opacity: 0.6},
    availableList: {gap: 12},
    availableCard: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        padding: 14,
    },
    availableCardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 10,
    },
    availableCardHeaderText: {flex: 1},
    availableCardTitle: {fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4},
    availableCardMeta: {fontSize: 12, color: '#6B7280'},
    availableCardDescription: {fontSize: 13, lineHeight: 20, color: '#374151', marginBottom: 8},
    availableCardCreator: {fontSize: 12, color: '#6B7280'},
    joinButton: {
        minHeight: 38,
        borderRadius: 12,
        backgroundColor: '#3F7FC4',
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    joinButtonText: {color: '#FFFFFF', fontSize: 13, fontWeight: '700'},
    emptyText: {fontSize: 14, color: '#6B7280', lineHeight: 20},
    emptyStateText: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        paddingHorizontal: 14,
        paddingVertical: 18,
    },
    sidebarOverlay: {flex: 1, flexDirection: 'row-reverse', backgroundColor: 'rgba(17, 24, 39, 0.28)'},
    sidebarBackdrop: {flex: 1},
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
    sidebarTitle: {fontSize: 22, fontWeight: '700', color: '#111827'},
    sidebarCloseButton: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
    sidebarUserCard: {
        borderWidth: 1,
        borderColor: '#DBEAFE',
        borderRadius: 16,
        padding: 14,
        backgroundColor: '#EFF6FF',
        marginBottom: 18,
    },
    sidebarUserName: {fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4},
    sidebarUserMeta: {fontSize: 13, color: '#6B7280', marginBottom: 2},
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
    sidebarLinkText: {fontSize: 15, fontWeight: '600', color: '#111827'},
    logoutButton: {
        minHeight: 48,
        borderRadius: 14,
        backgroundColor: '#3F7FC4',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    logoutButtonText: {fontSize: 15, fontWeight: '700', color: '#FFFFFF'},
    createOverlay: {
        flex: 1,
        backgroundColor: 'rgba(17, 24, 39, 0.35)',
        justifyContent: 'flex-end',
        padding: 18,
    },
    createModalCard: {
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        padding: 18,
    },
    createModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    createModalTitle: {fontSize: 20, fontWeight: '800', color: '#111827'},
    createInput: {
        minHeight: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        paddingHorizontal: 14,
        fontSize: 15,
        color: '#111827',
        marginBottom: 8,
    },
    createTextArea: {
        minHeight: 110,
        textAlignVertical: 'top',
        paddingTop: 14,
    },
    createInputError: {borderColor: '#DC2626'},
    fieldError: {fontSize: 12, color: '#DC2626', marginBottom: 8},
    primaryButton: {
        minHeight: 48,
        borderRadius: 14,
        backgroundColor: '#3F7FC4',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    primaryButtonDisabled: {opacity: 0.7},
    primaryButtonText: {fontSize: 15, fontWeight: '700', color: '#FFFFFF'},
});
