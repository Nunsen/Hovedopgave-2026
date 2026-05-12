import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/navigation/bottom-nav';
import { useAuth } from '@/context/AuthContext';
import {
    addChatGroupMembers,
    ChatGroupDto,
    ChatMessageDto,
    ChatOverviewDto,
    createChatMessage,
    deleteDirectChatForUser,
    deleteChatGroup,
    getChatGroup,
    getUserProfile,
    getChatMessages,
    getChatOverview,
    joinChatGroup,
    leaveChatGroup,
    searchChatUsers,
    ChatUserSearchDto,
    UserProfileDto,
} from '@/lib/api';
import { type ChatStompClient, createChatClient } from '@/lib/chat';

type ChatTab = 'Samtaler' | 'Grupper';

function formatConversationTime(value: string | null) {
    if (!value) return '';

    const date = new Date(value);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayDiff = Math.round((startOfToday.getTime() - startOfTarget.getTime()) / 86400000);

    if (dayDiff === 0) {
        return date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
    }

    if (dayDiff === 1) return 'I går';

    if (dayDiff > 1 && dayDiff < 7) {
        const weekday = date.toLocaleDateString('da-DK', { weekday: 'long' });
        return weekday.charAt(0).toUpperCase() + weekday.slice(1);
    }

    return date.toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit' });
}

function formatMessageTime(value: string) {
    return new Date(value).toLocaleTimeString('da-DK', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function matchesChatSearch(group: ChatGroupDto, searchValue: string) {
    if (!searchValue) return true;

    return group.name.toLowerCase().includes(searchValue)
        || group.description.toLowerCase().includes(searchValue)
        || (group.lastMessagePreview ?? '').toLowerCase().includes(searchValue);
}

function updateConversationPreview(groups: ChatGroupDto[], message: ChatMessageDto) {
    return groups.map((group) =>
        group.groupId === message.groupId
            ? {
                ...group,
                lastMessagePreview: message.message,
                lastMessageAt: message.sentAt,
            }
            : group,
    );
}

function getCounterpartUserId(
    conversation: ChatGroupDto | null,
    messages: ChatMessageDto[],
    currentUserId: number | undefined,
) {
    if (!conversation || conversation.groupType !== 'DIRECT') {
        return null;
    }

    if (conversation.counterpartUserId) {
        return conversation.counterpartUserId;
    }

    if (!currentUserId) {
        return null;
    }

    return messages.find((message) => message.userId !== currentUserId)?.userId ?? null;
}

export default function ChatScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ tab?: string; groupId?: string; conversation?: string }>();

    const { isLoading, logout, user } = useAuth();
    const [activeTab, setActiveTab] = useState<ChatTab>('Samtaler');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isConversationOpen, setIsConversationOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [overview, setOverview] = useState<ChatOverviewDto | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessageDto[]>([]);
    const [messageText, setMessageText] = useState('');
    const [loadingOverview, setLoadingOverview] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [joiningGroupId, setJoiningGroupId] = useState<number | null>(null);
    const [isResidentInfoOpen, setIsResidentInfoOpen] = useState(false);
    const [loadingResidentInfo, setLoadingResidentInfo] = useState(false);
    const [residentInfo, setResidentInfo] = useState<UserProfileDto | null>(null);
    const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
    const [isGroupMemberModalOpen, setIsGroupMemberModalOpen] = useState(false);
    const [groupMemberSearchText, setGroupMemberSearchText] = useState('');
    const [groupUserResults, setGroupUserResults] = useState<ChatUserSearchDto[]>([]);
    const [loadingGroupUsers, setLoadingGroupUsers] = useState(false);
    const [selectedNewMembers, setSelectedNewMembers] = useState<ChatUserSearchDto[]>([]);
    const [addingGroupMembers, setAddingGroupMembers] = useState(false);
    const [groupInfoConversation, setGroupInfoConversation] = useState<ChatGroupDto | null>(null);
    const [hiddenDirectGroupIds, setHiddenDirectGroupIds] = useState<number[]>([]);

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

    useEffect(() => {
        if (params.tab === 'Grupper') {
            setActiveTab('Grupper');
        } else if (params.tab === 'Samtaler') {
            setActiveTab('Samtaler');
        }
    }, [params.tab]);

    const loadOverview = useCallback(async () => {
        if (!user) return;

        setLoadingOverview(true);
        const result = await getChatOverview(user.userId);

        if (result.error) {
            Alert.alert('Kunne ikke hente chat', result.error);
            setLoadingOverview(false);
            return;
        }

        const nextOverview = result.data ?? { directConversations: [], joinedGroups: [], availableGroups: [] };
        setOverview(nextOverview);
        setHiddenDirectGroupIds((currentIds) =>
            currentIds.filter(
                (groupId) => !nextOverview.directConversations.some((group) => group.groupId === groupId),
            ),
        );
        setLoadingOverview(false);
    }, [user]);

    const loadMessages = useCallback(async (groupId: number) => {
        if (!user) return;

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
            void loadOverview();
        }, [loadOverview]),
    );

    const directConversations = useMemo(() => overview?.directConversations ?? [], [overview]);
    const joinedGroups = useMemo(() => overview?.joinedGroups ?? [], [overview]);
    const availableGroups = useMemo(() => overview?.availableGroups ?? [], [overview]);
    const allConversationGroups = useMemo(
        () => [...directConversations, ...joinedGroups],
        [directConversations, joinedGroups],
    );

    const restoreHiddenDirectConversation = useCallback(async (groupId: number, incomingMessage: ChatMessageDto) => {
        if (!user) return;

        const result = await getChatGroup(groupId, user.userId);
        if (result.error || !result.data || result.data.groupType !== 'DIRECT') {
            return;
        }

        const restoredConversation: ChatGroupDto = {
            ...result.data,
            lastMessagePreview: incomingMessage.message,
            lastMessageAt: incomingMessage.sentAt,
            joined: true,
        };

        setOverview((currentOverview) => {
            if (!currentOverview) return currentOverview;

            return {
                ...currentOverview,
                directConversations: [
                    restoredConversation,
                    ...currentOverview.directConversations.filter((group) => group.groupId !== groupId),
                ],
                joinedGroups: currentOverview.joinedGroups,
                availableGroups: currentOverview.availableGroups,
            };
        });
        setHiddenDirectGroupIds((currentIds) => currentIds.filter((hiddenGroupId) => hiddenGroupId !== groupId));
    }, [user]);

    useEffect(() => {
        const requestedGroupId = params.groupId ? Number(params.groupId) : NaN;
        if (!Number.isFinite(requestedGroupId)) {
            return;
        }

        const requestedConversation = allConversationGroups.find((group) => group.groupId === requestedGroupId);
        if (!requestedConversation) {
            return;
        }

        setSelectedGroupId(requestedGroupId);
        setIsConversationOpen(params.conversation === '1');
        setActiveTab(requestedConversation.groupType === 'DIRECT' ? 'Samtaler' : 'Grupper');
    }, [allConversationGroups, params.conversation, params.groupId]);

    useEffect(() => {
        if (selectedGroupId) {
            void loadMessages(selectedGroupId);
        } else {
            setMessages([]);
        }
    }, [loadMessages, selectedGroupId]);

    const joinedGroupIdsKey = useMemo(
        () => [...allConversationGroups.map((group) => group.groupId), ...hiddenDirectGroupIds]
            .filter((groupId, index, values) => values.indexOf(groupId) === index)
            .sort((left, right) => left - right)
            .join(','),
        [allConversationGroups, hiddenDirectGroupIds],
    );

    const joinedGroupIds = useMemo(
        () => (joinedGroupIdsKey ? joinedGroupIdsKey.split(',').map((value) => Number(value)) : []),
        [joinedGroupIdsKey],
    );

    useEffect(() => {
        if (!user || joinedGroupIds.length === 0) return undefined;

        const { client, disconnect } = createChatClient({
            groupIds: joinedGroupIds,
            onError: (message) => {
                console.warn('Chat realtime connection failed:', message);
            },
            onGroupDeleted: (deletedGroupId) => {
                setOverview((currentOverview) => {
                    if (!currentOverview) return currentOverview;

                    return {
                        ...currentOverview,
                        directConversations: currentOverview.directConversations.filter((group) => group.groupId !== deletedGroupId),
                        joinedGroups: currentOverview.joinedGroups.filter((group) => group.groupId !== deletedGroupId),
                        availableGroups: currentOverview.availableGroups.filter((group) => group.groupId !== deletedGroupId),
                    };
                });
                setHiddenDirectGroupIds((currentIds) => currentIds.filter((groupId) => groupId !== deletedGroupId));

                if (selectedGroupIdRef.current === deletedGroupId) {
                    setSelectedGroupId(null);
                    setIsConversationOpen(false);
                    setMessages([]);
                    setGroupInfoConversation(null);
                    setIsGroupInfoOpen(false);
                    setIsGroupMemberModalOpen(false);
                }
            },
            onMessage: (incomingMessage) => {
                setMessages((currentMessages) => {
                    if (incomingMessage.groupId !== selectedGroupIdRef.current) return currentMessages;

                    if (currentMessages.some((message) => message.messageId === incomingMessage.messageId)) {
                        return currentMessages;
                    }

                    return [...currentMessages, incomingMessage];
                });

                setOverview((currentOverview) => {
                    if (!currentOverview) return currentOverview;

                    const isKnownConversation =
                        currentOverview.directConversations.some((group) => group.groupId === incomingMessage.groupId)
                        || currentOverview.joinedGroups.some((group) => group.groupId === incomingMessage.groupId);

                    if (!isKnownConversation && hiddenDirectGroupIds.includes(incomingMessage.groupId)) {
                        void restoreHiddenDirectConversation(incomingMessage.groupId, incomingMessage);
                        return currentOverview;
                    }

                    return {
                        ...currentOverview,
                        directConversations: updateConversationPreview(currentOverview.directConversations, incomingMessage),
                        joinedGroups: updateConversationPreview(currentOverview.joinedGroups, incomingMessage),
                        availableGroups: currentOverview.availableGroups,
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
    }, [hiddenDirectGroupIds, joinedGroupIds, restoreHiddenDirectConversation, user]);

    const handleLogout = async () => {
        setIsSidebarOpen(false);
        await logout();
        router.replace('/login');
    };

    const handleOpenConversation = (group: ChatGroupDto, tab: ChatTab) => {
        setActiveTab(tab);
        setSelectedGroupId(group.groupId);
        setIsConversationOpen(true);
    };

    const handleJoinGroup = async (groupId: number) => {
        if (!user) return;

        setJoiningGroupId(groupId);
        const result = await joinChatGroup(groupId, { userId: user.userId });
        setJoiningGroupId(null);

        if (result.error) {
            Alert.alert('Kunne ikke tilmelde gruppen', result.error);
            return;
        }

        await loadOverview();
        setActiveTab('Grupper');
        setSelectedGroupId(result.data?.groupId ?? groupId);
        setIsConversationOpen(true);
    };

    const handleSendMessage = async () => {
        if (!user || !selectedGroupId || !messageText.trim()) return;

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
                if (!currentOverview) return currentOverview;

                return {
                    ...currentOverview,
                    directConversations: updateConversationPreview(currentOverview.directConversations, createdMessage),
                    joinedGroups: updateConversationPreview(currentOverview.joinedGroups, createdMessage),
                    availableGroups: currentOverview.availableGroups,
                };
            });
        }
    };

    const handleOpenResidentInfo = async () => {
        if (!selectedConversation || selectedConversation.groupType !== 'DIRECT') {
            return;
        }

        let conversationDetails = selectedConversation;
        let counterpartUserId = getCounterpartUserId(conversationDetails, messages, user?.userId);

        if (!counterpartUserId && user) {
            const groupResult = await getChatGroup(selectedConversation.groupId, user.userId);
            if (groupResult.data) {
                conversationDetails = groupResult.data;
                counterpartUserId = getCounterpartUserId(groupResult.data, messages, user.userId);
                setOverview((currentOverview) => {
                    if (!currentOverview) return currentOverview;

                    return {
                        ...currentOverview,
                        directConversations: currentOverview.directConversations.map((group) =>
                            group.groupId === groupResult.data?.groupId ? groupResult.data : group,
                        ),
                        joinedGroups: currentOverview.joinedGroups,
                        availableGroups: currentOverview.availableGroups,
                    };
                });
            }
        }

        if (!counterpartUserId) {
            Alert.alert('Kunne ikke hente beboer', 'Der mangler oplysninger om beboeren.');
            return;
        }

        setLoadingResidentInfo(true);
        setIsResidentInfoOpen(true);

        const result = await getUserProfile(counterpartUserId);
        setLoadingResidentInfo(false);

        if (result.error || !result.data) {
            setResidentInfo(null);
            Alert.alert('Kunne ikke hente beboer', result.error ?? 'Ukendt fejl.');
            return;
        }

        setResidentInfo(result.data);
    };

    const loadGroupUsers = useCallback(async (query: string) => {
        if (!user) return;

        setLoadingGroupUsers(true);
        const result = await searchChatUsers(user.userId, query);

        if (result.error) {
            Alert.alert('Kunne ikke hente brugere', result.error);
            setLoadingGroupUsers(false);
            return;
        }

        const currentMemberIds = new Set(
            messages.map((message) => message.userId).filter((memberUserId, index, values) => values.indexOf(memberUserId) === index),
        );
        currentMemberIds.add(user.userId);

        setGroupUserResults((result.data ?? []).filter((chatUser) => !currentMemberIds.has(chatUser.userId)));
        setLoadingGroupUsers(false);
    }, [messages, user]);

    useEffect(() => {
        if (!isGroupMemberModalOpen) {
            return undefined;
        }

        const timeout = setTimeout(() => {
            void loadGroupUsers(groupMemberSearchText);
        }, 250);

        return () => clearTimeout(timeout);
    }, [groupMemberSearchText, isGroupMemberModalOpen, loadGroupUsers]);

    const toggleSelectedGroupMember = (chatUser: ChatUserSearchDto) => {
        setSelectedNewMembers((currentMembers) => {
            const alreadySelected = currentMembers.some((member) => member.userId === chatUser.userId);
            if (alreadySelected) {
                return currentMembers.filter((member) => member.userId !== chatUser.userId);
            }

            return [...currentMembers, chatUser];
        });
    };

    const handleAddGroupMembers = async () => {
        if (!user || !groupInfoConversation || groupInfoConversation.groupType !== 'CHAT') {
            return;
        }

        if (selectedNewMembers.length === 0) {
            Alert.alert('Vælg medlemmer', 'Vælg mindst ét medlem.');
            return;
        }

        setAddingGroupMembers(true);
        const result = await addChatGroupMembers(groupInfoConversation.groupId, {
            userId: user.userId,
            memberUserIds: selectedNewMembers.map((member) => member.userId),
        });
        setAddingGroupMembers(false);

        if (result.error || !result.data) {
            Alert.alert('Kunne ikke tilføje medlemmer', result.error ?? 'Ukendt fejl.');
            return;
        }

        setOverview((currentOverview) => {
            if (!currentOverview) return currentOverview;

            return {
                ...currentOverview,
                directConversations: currentOverview.directConversations,
                joinedGroups: currentOverview.joinedGroups.map((group) =>
                    group.groupId === result.data?.groupId ? result.data : group,
                ),
                availableGroups: currentOverview.availableGroups,
            };
        });

        setGroupInfoConversation(result.data);
        setSelectedNewMembers([]);
        setGroupMemberSearchText('');
        setIsGroupMemberModalOpen(false);
        setIsGroupInfoOpen(false);
        await loadOverview();
    };

    const handleOpenGroupMemberModal = () => {
        setSelectedNewMembers([]);
        setGroupMemberSearchText('');
        setIsGroupInfoOpen(false);

        setTimeout(() => {
            setIsGroupMemberModalOpen(true);
            void loadGroupUsers('');
        }, 150);
    };

    const handleLeaveGroup = async () => {
        if (!user || !groupInfoConversation || groupInfoConversation.groupType !== 'CHAT') {
            return;
        }

        const result = await leaveChatGroup(groupInfoConversation.groupId, { userId: user.userId });
        if (result.error) {
            Alert.alert('Kunne ikke forlade gruppen', result.error);
            return;
        }

        setIsGroupInfoOpen(false);
        setIsGroupMemberModalOpen(false);
        setGroupInfoConversation(null);
        setIsConversationOpen(false);
        setSelectedGroupId(null);
        setMessages([]);
        await loadOverview();
    };

    const handleDeleteGroup = async () => {
        if (!user || !groupInfoConversation || groupInfoConversation.groupType !== 'CHAT') {
            return;
        }

        const result = await deleteChatGroup(groupInfoConversation.groupId, user.userId);
        if (result.error) {
            Alert.alert('Kunne ikke slette gruppen', result.error);
            return;
        }

        setIsGroupInfoOpen(false);
        setIsGroupMemberModalOpen(false);
        setGroupInfoConversation(null);
        setIsConversationOpen(false);
        setSelectedGroupId(null);
        setMessages([]);
        await loadOverview();
    };

    const handleDeleteDirectConversation = async () => {
        if (!user || !selectedConversation || selectedConversation.groupType !== 'DIRECT') {
            return;
        }

        const result = await deleteDirectChatForUser(selectedConversation.groupId, { userId: user.userId });
        if (result.error) {
            Alert.alert('Kunne ikke slette samtalen', result.error);
            return;
        }

        setIsResidentInfoOpen(false);
        setResidentInfo(null);
        setIsConversationOpen(false);
        setSelectedGroupId(null);
        setMessages([]);
        setHiddenDirectGroupIds((currentIds) =>
            currentIds.includes(selectedConversation.groupId)
                ? currentIds
                : [...currentIds, selectedConversation.groupId],
        );
        await loadOverview();
    };

    const filteredDirectConversations = useMemo(() => {
        const searchValue = searchText.trim().toLowerCase();
        return directConversations.filter((group) => matchesChatSearch(group, searchValue));
    }, [directConversations, searchText]);

    const filteredJoinedGroups = useMemo(() => {
        const searchValue = searchText.trim().toLowerCase();
        return joinedGroups.filter((group) => matchesChatSearch(group, searchValue));
    }, [joinedGroups, searchText]);

    const filteredConversationOverview = useMemo(
        () => [...filteredDirectConversations, ...filteredJoinedGroups],
        [filteredDirectConversations, filteredJoinedGroups],
    );

    const filteredAvailableGroups = useMemo(() => {
        const searchValue = searchText.trim().toLowerCase();
        return availableGroups.filter((group) => matchesChatSearch(group, searchValue));
    }, [availableGroups, searchText]);

    const selectedConversation = allConversationGroups.find((group) => group.groupId === selectedGroupId) ?? null;

    if (isLoading || loadingOverview) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator />
            </SafeAreaView>
        );
    }

    if (!user) return null;

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
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

                                <Pressable style={styles.sidebarLink} onPress={() => {
                                    setIsSidebarOpen(false);
                                    router.replace('/home');
                                }}>
                                    <Ionicons name="home-outline" size={20} color="#111827" />
                                    <Text style={styles.sidebarLinkText}>Forside</Text>
                                </Pressable>

                                <Pressable style={styles.sidebarLink} onPress={() => {
                                    setIsSidebarOpen(false);
                                    router.replace('/chat');
                                }}>
                                    <Ionicons name="chatbubble-ellipses-outline" size={20} color="#111827" />
                                    <Text style={styles.sidebarLinkText}>Chat</Text>
                                </Pressable>

                                <Pressable style={styles.sidebarLink} onPress={() => {
                                    setIsSidebarOpen(false);
                                    router.push('/profile');
                                }}>
                                    <Ionicons name="person-outline" size={20} color="#111827" />
                                    <Text style={styles.sidebarLinkText}>Profil</Text>
                                </Pressable>

                                <Pressable style={styles.sidebarLink} onPress={() => {
                                    setIsSidebarOpen(false);
                                    router.push('/book-washing');
                                }}>
                                    <MaterialCommunityIcons name="washing-machine" size={20} color="#111827" />
                                    <Text style={styles.sidebarLinkText}>Vaskeri</Text>
                                </Pressable>

                                <Pressable style={styles.sidebarLink} onPress={() => {
                                    setIsSidebarOpen(false);
                                    router.push('/book-partyroom');
                                }}>
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

                <Modal
                    transparent
                    visible={isResidentInfoOpen}
                    animationType="fade"
                    onRequestClose={() => {
                        setIsResidentInfoOpen(false);
                        setResidentInfo(null);
                    }}
                >
                    <View style={styles.infoOverlay}>
                        <Pressable
                            style={styles.infoBackdrop}
                            onPress={() => {
                                setIsResidentInfoOpen(false);
                                setResidentInfo(null);
                            }}
                        />

                        <View style={styles.infoCard}>
                            <View style={styles.infoHeader}>
                                <Text style={styles.infoTitle}>Beboer</Text>
                                <Pressable
                                    onPress={() => {
                                        setIsResidentInfoOpen(false);
                                        setResidentInfo(null);
                                    }}
                                >
                                    <Ionicons name="close" size={22} color="#111827" />
                                </Pressable>
                            </View>

                            {loadingResidentInfo ? (
                                <ActivityIndicator style={styles.infoLoader} />
                            ) : residentInfo ? (
                                <View style={styles.infoContent}>
                                    <View style={styles.infoAvatar}>
                                        <Ionicons name="person" size={28} color="#2563EB" />
                                    </View>
                                    <Text style={styles.infoName}>{residentInfo.fullName}</Text>
                                    <Text style={styles.infoMetaLabel}>Lejlighedsnr.</Text>
                                    <Text style={styles.infoMetaValue}>
                                        {residentInfo.apartmentNumber?.trim() || 'Ikke angivet'}
                                    </Text>
                                    <Pressable style={styles.deleteGroupButton} onPress={handleDeleteDirectConversation}>
                                        <Text style={styles.deleteGroupButtonText}>Slet samtale</Text>
                                    </Pressable>
                                </View>
                            ) : (
                                <Text style={styles.emptyText}>Ingen oplysninger tilgængelige.</Text>
                            )}
                        </View>
                    </View>
                </Modal>

                <Modal
                    transparent
                    visible={isGroupInfoOpen}
                    animationType="fade"
                    onRequestClose={() => setIsGroupInfoOpen(false)}
                >
                    <View style={styles.infoOverlay}>
                        <Pressable style={styles.infoBackdrop} onPress={() => setIsGroupInfoOpen(false)} />

                        <View style={styles.infoCard}>
                            <View style={styles.infoHeader}>
                                <Text style={styles.infoTitle}>Gruppeinfo</Text>
                                <Pressable onPress={() => setIsGroupInfoOpen(false)}>
                                    <Ionicons name="close" size={22} color="#111827" />
                                </Pressable>
                            </View>

                            {groupInfoConversation ? (
                                <View style={styles.infoContent}>
                                    <View style={[styles.infoAvatar, styles.centeredInfoAvatar]}>
                                        <Ionicons name="people" size={28} color="#2563EB" />
                                    </View>
                                    <Text style={styles.infoName}>{groupInfoConversation.name}</Text>
                                    <Text style={styles.infoMetaLabel}>Beskrivelse</Text>
                                    <Text style={styles.groupDescriptionText}>
                                        {groupInfoConversation.description?.trim() || 'Ingen beskrivelse'}
                                    </Text>
                                    {user?.userId === groupInfoConversation.createdByUserId ? (
                                        <Pressable style={styles.deleteGroupButton} onPress={handleDeleteGroup}>
                                            <Text style={styles.deleteGroupButtonText}>Slet gruppe</Text>
                                        </Pressable>
                                    ) : null}

                                    <View style={styles.groupInfoMemberHeader}>
                                        <Text style={styles.infoMetaLabel}>Tilføj medlemmer</Text>
                                        <Pressable
                                            style={styles.addButton}
                                            onPress={handleOpenGroupMemberModal}
                                            hitSlop={10}
                                        >
                                            <Ionicons name="add" size={22} color="#2563EB" />
                                        </Pressable>
                                    </View>

                                    {selectedNewMembers.length > 0 ? (
                                        <View style={styles.selectedMembers}>
                                            {selectedNewMembers.map((member) => (
                                                <View key={member.userId} style={styles.selectedChip}>
                                                    <Text style={styles.selectedChipText}>{member.fullName}</Text>
                                                    <Pressable onPress={() => toggleSelectedGroupMember(member)}>
                                                        <Ionicons name="close" size={16} color="#374151" />
                                                    </Pressable>
                                                </View>
                                            ))}
                                        </View>
                                    ) : (
                                        <Text style={styles.memberHint}>Tilføj eksisterende brugere til gruppen.</Text>
                                    )}
                                    <Pressable style={styles.leaveGroupButton} onPress={handleLeaveGroup}>
                                        <Text style={styles.leaveGroupButtonText}>Forlad gruppe</Text>
                                    </Pressable>
                                </View>
                            ) : null}
                        </View>
                    </View>
                </Modal>

                <Modal
                    visible={isGroupMemberModalOpen}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setIsGroupMemberModalOpen(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Tilføj medlemmer</Text>
                                <Pressable onPress={() => setIsGroupMemberModalOpen(false)}>
                                    <Ionicons name="close" size={22} color="#111827" />
                                </Pressable>
                            </View>

                            <View style={styles.modalSearch}>
                                <Ionicons name="search" size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.modalSearchInput}
                                    placeholder="Søg efter en person"
                                    placeholderTextColor="#9CA3AF"
                                    value={groupMemberSearchText}
                                    onChangeText={setGroupMemberSearchText}
                                />
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {loadingGroupUsers ? (
                                    <ActivityIndicator style={styles.loader} />
                                ) : groupUserResults.length === 0 ? (
                                    <Text style={styles.emptyText}>Ingen brugere matcher din søgning.</Text>
                                ) : (
                                    groupUserResults.map((chatUser) => {
                                        const isSelected = selectedNewMembers.some((member) => member.userId === chatUser.userId);

                                        return (
                                            <Pressable
                                                key={chatUser.userId}
                                                style={styles.memberRow}
                                                onPress={() => toggleSelectedGroupMember(chatUser)}
                                            >
                                                <View style={styles.memberAvatar}>
                                                    <Text style={styles.memberAvatarText}>
                                                        {chatUser.fullName.charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>

                                                <View style={styles.memberTextWrap}>
                                                    <Text style={styles.memberName}>{chatUser.fullName}</Text>
                                                    <Text style={styles.memberSubtitle}>{chatUser.subtitle}</Text>
                                                </View>

                                                <Ionicons
                                                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                                                    size={24}
                                                    color={isSelected ? '#2563EB' : '#9CA3AF'}
                                                />
                                            </Pressable>
                                        );
                                    })
                                )}
                            </ScrollView>

                            <Pressable
                                style={[styles.submitButton, addingGroupMembers ? styles.submitButtonDisabled : null]}
                                onPress={handleAddGroupMembers}
                                disabled={addingGroupMembers}
                            >
                                {addingGroupMembers ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Tilføj valgte medlemmer</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </Modal>

                {isConversationOpen && selectedConversation ? (
                    <View style={styles.conversationScreen}>
                        <View style={styles.detailHeader}>
                            <Pressable
                                style={styles.detailHeaderIcon}
                                onPress={() => {
                                    setIsConversationOpen(false);
                                }}
                            >
                                <Ionicons name="arrow-back" size={22} color="#2563EB" />
                            </Pressable>

                            <View style={styles.detailHeaderContent}>
                                <Text style={styles.detailHeaderTitle}>{selectedConversation.name}</Text>
                                <Text style={styles.detailHeaderSubtitle}>
                                    {selectedConversation.groupType === 'DIRECT'
                                        ? selectedConversation.description
                                        : `${selectedConversation.memberCount} medlemmer`}
                                </Text>
                            </View>

                            <View style={styles.detailHeaderIcon}>
                                {selectedConversation.groupType === 'DIRECT' ? (
                                    <Pressable style={styles.detailHeaderIcon} onPress={handleOpenResidentInfo}>
                                        <Ionicons name="person-outline" size={22} color="#2563EB" />
                                    </Pressable>
                                ) : (
                                    <Pressable
                                        style={styles.detailHeaderIcon}
                                        onPress={() => {
                                            setGroupInfoConversation(selectedConversation);
                                            setIsGroupInfoOpen(true);
                                        }}
                                    >
                                        <Ionicons name="people-outline" size={22} color="#2563EB" />
                                    </Pressable>
                                )}
                            </View>
                        </View>

                        <ScrollView
                            ref={messagesScrollRef}
                            style={styles.detailMessages}
                            contentContainerStyle={[
                                styles.detailMessagesContent,
                                { paddingBottom: insets.bottom + 24 },
                            ]}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            onContentSizeChange={() => {
                                messagesScrollRef.current?.scrollToEnd({ animated: true });
                            }}
                        >
                            {loadingMessages ? (
                                <ActivityIndicator style={styles.inlineLoader} />
                            ) : messages.length === 0 ? (
                                <Text style={styles.emptyText}>Der er ingen beskeder endnu.</Text>
                            ) : (
                                messages.map((message) => {
                                    const ownMessage = message.userId === user.userId;

                                    return (
                                        <View key={`${message.messageId}-${message.sentAt}`} style={styles.detailMessageBlock}>
                                            <View style={[styles.detailMessageRow, ownMessage ? styles.detailMessageRowOwn : null]}>
                                                {!ownMessage ? <View style={styles.detailAvatar} /> : null}

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

                        <View style={[styles.detailComposerBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
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
                                <Ionicons name="send" size={18} color="#FFFFFF" />
                            </Pressable>
                        </View>
                    </View>
                ) : (
                    <View style={styles.mainLayout}>
                        <View style={styles.header}>
                            <Pressable style={styles.iconButton} onPress={() => setIsSidebarOpen(true)}>
                                <Feather name="menu" size={22} color="#1F2937" />
                            </Pressable>

                            <View style={styles.headerTitleWrap}>
                                <MaterialCommunityIcons name="chat" size={24} color="#2563EB" />
                                <Text style={styles.headerTitle}>Chat</Text>
                            </View>

                            <Pressable style={styles.iconButton} onPress={() => router.push('/new-chat')}>
                                <Ionicons name="add" size={22} color="#2563EB" />
                            </Pressable>
                        </View>

                        <ScrollView
                            style={styles.mainScroll}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                            keyboardShouldPersistTaps="handled"
                        >
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
                                <Feather name="search" size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder={activeTab === 'Samtaler' ? 'Søg efter samtaler' : 'Søg efter grupper'}
                                    placeholderTextColor="#9CA3AF"
                                    value={searchText}
                                    onChangeText={setSearchText}
                                />
                            </View>

                            {activeTab === 'Samtaler' ? (
                                <View style={styles.conversationListCard}>
                                    {filteredConversationOverview.length === 0 ? (
                                        <Text style={styles.emptyStateText}>Du har ingen samtaler eller grupper endnu.</Text>
                                    ) : (
                                        filteredConversationOverview.map((group, index) => (
                                            <Pressable
                                                key={group.groupId}
                                                style={[styles.conversationItem, index === filteredConversationOverview.length - 1 ? styles.conversationItemLast : null]}
                                                onPress={() => handleOpenConversation(group, group.groupType === 'DIRECT' ? 'Samtaler' : 'Grupper')}
                                            >
                                                <View style={styles.conversationAvatar}>
                                                    <Ionicons
                                                        name={group.groupType === 'DIRECT' ? 'person' : 'people'}
                                                        size={20}
                                                        color="#2563EB"
                                                    />
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
                                <View style={styles.groupSectionWrap}>
                                    <View style={styles.sectionBlock}>
                                        <Text style={styles.sectionHeading}>Dine grupper</Text>
                                        {filteredJoinedGroups.length === 0 ? (
                                            <Text style={styles.emptyStateText}>Du er ikke medlem af nogen grupper endnu.</Text>
                                        ) : (
                                            <View style={styles.conversationListCard}>
                                                {filteredJoinedGroups.map((group, index) => (
                                                    <Pressable
                                                        key={group.groupId}
                                                        style={[styles.conversationItem, index === filteredJoinedGroups.length - 1 ? styles.conversationItemLast : null]}
                                                        onPress={() => handleOpenConversation(group, 'Grupper')}
                                                    >
                                                        <View style={styles.conversationAvatar}>
                                                            <Ionicons name="people" size={20} color="#2563EB" />
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
                                                ))}
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.sectionBlock}>
                                        <Text style={styles.sectionHeading}>Find grupper</Text>
                                        {filteredAvailableGroups.length === 0 ? (
                                            <Text style={styles.emptyText}>Der er ingen andre grupper at tilmelde sig lige nu.</Text>
                                        ) : (
                                            <View style={styles.availableList}>
                                                {filteredAvailableGroups.map((group) => (
                                                    <View key={group.groupId} style={styles.availableCard}>
                                                        <View style={styles.availableCardTop}>
                                                            <View style={styles.availableCardHeaderText}>
                                                                <Text style={styles.availableCardTitle}>{group.name}</Text>
                                                                <Text style={styles.availableCardMeta}>{group.memberCount} medlemmer</Text>
                                                            </View>

                                                            <Pressable
                                                                style={[styles.joinButton, joiningGroupId === group.groupId ? styles.submitButtonDisabled : null]}
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
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.bottomNavLayer}>
                            <BottomNav
                                active="chat"
                                onChatPress={() => router.replace('/chat')}
                                onHomePress={() => router.replace('/home')}
                                onWashingPress={() => router.push('/book-washing')}
                                onPartyPress={() => router.push('/book-partyroom')}
                                onProfilePress={() => router.push('/profile')}
                            />
                        </View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingTop: 10,
    },
    mainLayout: { flex: 1 },
    mainScroll: { flex: 1 },
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
    headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
    scrollContent: {
        paddingTop: 14,
        paddingBottom: 24,
    },
    bottomNavLayer: {
        marginHorizontal: -14,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        zIndex: 999,
        elevation: 999,
    },
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
    segmentButtonActive: { backgroundColor: '#2F2F2F' },
    segmentButtonText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
    segmentButtonTextActive: { color: '#FFFFFF' },
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
    searchInput: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: 0 },
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
    conversationItemLast: { borderBottomWidth: 0 },
    conversationAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    conversationContent: { flex: 1 },
    conversationTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    conversationName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
    conversationTime: { fontSize: 12, color: '#6B7280' },
    conversationPreview: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
    groupSectionWrap: { gap: 18 },
    sectionBlock: { gap: 10 },
    sectionHeading: { fontSize: 16, fontWeight: '800', color: '#111827' },
    conversationScreen: { flex: 1, paddingTop: 2 },
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
    detailHeaderContent: { flex: 1 },
    detailHeaderTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
    detailHeaderSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
    infoOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(17, 24, 39, 0.28)',
        paddingHorizontal: 24,
    },
    infoBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    infoCard: {
        width: '100%',
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        padding: 20,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    infoTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
    infoLoader: { marginVertical: 24 },
    infoContent: {
        alignItems: 'center',
    },
    centeredInfoAvatar: {
        alignSelf: 'center',
    },
    infoAvatar: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    infoName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 18,
    },
    infoMetaLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6B7280',
        marginBottom: 6,
    },
    infoMetaValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#2563EB',
    },
    groupDescriptionText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 22,
        marginBottom: 18,
        textAlign: 'center',
        alignSelf: 'stretch',
    },
    detailMessages: { flex: 1 },
    detailMessagesContent: { paddingTop: 10 },
    inlineLoader: { marginVertical: 24 },
    detailMessageBlock: { marginBottom: 12 },
    detailMessageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
    detailMessageRowOwn: { justifyContent: 'flex-end' },
    detailAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#E5E7EB',
    },
    detailBubbleWrap: { maxWidth: '78%' },
    detailBubbleWrapOwn: { alignItems: 'flex-end' },
    detailBubble: {
        borderRadius: 18,
        backgroundColor: '#F5F7FB',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    detailBubbleOwn: { backgroundColor: '#2563EB' },
    detailAuthor: { fontSize: 11, fontWeight: '700', color: '#4B5563', marginBottom: 4 },
    detailAuthorOwn: { color: '#DBEAFE' },
    detailMessageText: { fontSize: 15, lineHeight: 22, color: '#111827' },
    detailMessageTextOwn: { color: '#FFFFFF' },
    detailTime: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
    detailTimeOwn: { textAlign: 'right' },
    detailComposerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingTop: 10,
        backgroundColor: '#FFFFFF',
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
    sendButtonDisabled: { opacity: 0.6 },
    availableList: { gap: 12 },
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
    availableCardHeaderText: { flex: 1 },
    availableCardTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 },
    availableCardMeta: { fontSize: 12, color: '#6B7280' },
    availableCardDescription: { fontSize: 13, lineHeight: 20, color: '#374151', marginBottom: 8 },
    availableCardCreator: { fontSize: 12, color: '#6B7280' },
    joinButton: {
        minHeight: 38,
        borderRadius: 12,
        backgroundColor: '#3F7FC4',
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    joinButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    emptyText: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
    emptyStateText: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        paddingHorizontal: 14,
        paddingVertical: 18,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(17, 24, 39, 0.28)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        maxHeight: '78%',
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 18,
        paddingBottom: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
    modalSearch: {
        minHeight: 48,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        marginBottom: 16,
    },
    modalSearchInput: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: 0 },
    loader: { marginTop: 18 },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
    },
    memberAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#DBEAFE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberAvatarText: { fontSize: 15, fontWeight: '700', color: '#1D4ED8' },
    memberTextWrap: { flex: 1 },
    memberName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
    memberSubtitle: { fontSize: 13, color: '#6B7280' },
    memberHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    groupInfoMemberHeader: {
        alignSelf: 'stretch',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberHint: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
    selectedMembers: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    selectedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    selectedChipText: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
    submitButton: {
        minHeight: 52,
        borderRadius: 14,
        backgroundColor: '#2156C9',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 18,
    },
    submitButtonDisabled: { opacity: 0.7 },
    submitButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    leaveGroupButton: {
        alignSelf: 'stretch',
        minHeight: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    leaveGroupButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#B91C1C',
    },
    deleteGroupButton: {
        alignSelf: 'stretch',
        minHeight: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#F87171',
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    deleteGroupButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#991B1B',
    },
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
    sidebarHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
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
    logoutButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
