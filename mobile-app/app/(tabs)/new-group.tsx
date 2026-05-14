import {Ionicons} from '@expo/vector-icons';
import {useFocusEffect} from '@react-navigation/native';
import {useRouter} from 'expo-router';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useAuth} from '@/context/AuthContext';
import {ChatUserSearchDto, createChatGroup, searchChatUsers} from '@/lib/api';

type GroupFieldErrors = {
    name?: string;
    description?: string;
    memberUserIds?: string;
};

export default function NewGroupScreen() {
    const router = useRouter();
    const {user} = useAuth();
    const [groupName, setGroupName] = useState('');
    const [description, setDescription] = useState('');
    const [fieldErrors, setFieldErrors] = useState<GroupFieldErrors>({});
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
    const [memberSearchText, setMemberSearchText] = useState('');
    const [users, setUsers] = useState<ChatUserSearchDto[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [selectedMembers, setSelectedMembers] = useState<ChatUserSearchDto[]>([]);
    const [creatingGroup, setCreatingGroup] = useState(false);

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
            void loadUsers(memberSearchText);
        }, [loadUsers, memberSearchText]),
    );

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (isMemberModalOpen) {
                void loadUsers(memberSearchText);
            }
        }, 250);

        return () => clearTimeout(timeout);
    }, [isMemberModalOpen, loadUsers, memberSearchText]);

    const selectedMemberIds = useMemo(
        () => new Set(selectedMembers.map((member) => member.userId)),
        [selectedMembers],
    );

    const toggleMember = (chatUser: ChatUserSearchDto) => {
        setSelectedMembers((currentMembers) => {
            const alreadySelected = currentMembers.some((member) => member.userId === chatUser.userId);
            if (alreadySelected) {
                return currentMembers.filter((member) => member.userId !== chatUser.userId);
            }

            setFieldErrors((currentErrors) => ({...currentErrors, memberUserIds: undefined}));
            return [...currentMembers, chatUser];
        });
    };

    const removeMember = (userId: number) => {
        setSelectedMembers((currentMembers) => currentMembers.filter((member) => member.userId !== userId));
    };

    const handleCreateGroup = async () => {
        if (!user) return;

        const nextErrors: GroupFieldErrors = {};
        if (!groupName.trim()) {
            nextErrors.name = 'Gruppenavn er obligatorisk.';
        }

        if (!description.trim()) {
            nextErrors.description = 'Beskrivelse er obligatorisk.';
        }

        if (selectedMembers.length === 0) {
            nextErrors.memberUserIds = 'Vælg mindst ét medlem.';
        }

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
            return;
        }

        setCreatingGroup(true);
        const result = await createChatGroup({
            userId: user.userId,
            name: groupName.trim(),
            description: description.trim(),
            memberUserIds: selectedMembers.map((member) => member.userId),
        });
        setCreatingGroup(false);

        if (result.error || !result.data) {
            setFieldErrors(result.error?.fieldErrors ?? {});
            Alert.alert('Kunne ikke oprette gruppe', result.error?.message ?? 'Ukendt fejl.');
            return;
        }

        router.replace({
            pathname: '/chat',
            params: {
                tab: 'Grupper',
                groupId: String(result.data.groupId),
                conversation: '1',
            },
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <Modal
                visible={isMemberModalOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setIsMemberModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Tilføj medlemmer</Text>
                            <Pressable onPress={() => setIsMemberModalOpen(false)}>
                                <Ionicons name="close" size={22} color="#111827"/>
                            </Pressable>
                        </View>

                        <View style={styles.modalSearch}>
                            <Ionicons name="search" size={18} color="#9CA3AF"/>
                            <TextInput
                                style={styles.modalSearchInput}
                                placeholder="Søg efter en person"
                                placeholderTextColor="#9CA3AF"
                                value={memberSearchText}
                                onChangeText={setMemberSearchText}
                            />
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {loadingUsers ? (
                                <ActivityIndicator style={styles.loader}/>
                            ) : users.length === 0 ? (
                                <Text style={styles.emptyText}>Ingen brugere matcher din søgning.</Text>
                            ) : (
                                users.map((chatUser) => {
                                    const isSelected = selectedMemberIds.has(chatUser.userId);

                                    return (
                                        <Pressable
                                            key={chatUser.userId}
                                            style={styles.memberRow}
                                            onPress={() => toggleMember(chatUser)}
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
                    </View>
                </View>
            </Modal>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color="#2563EB"/>
                    </Pressable>
                    <Text style={styles.title}>Ny gruppe</Text>
                    <View style={styles.headerSpacer}/>
                </View>

                <View style={styles.iconCircle}>
                    <Ionicons name="people" size={34} color="#1E3A8A"/>
                </View>

                <Text style={styles.label}>Gruppenavn</Text>
                <TextInput
                    style={[styles.input, fieldErrors.name ? styles.inputError : null]}
                    placeholder="Fx. Gang 3"
                    placeholderTextColor="#9CA3AF"
                    value={groupName}
                    onChangeText={(value) => {
                        setGroupName(value);
                        setFieldErrors((currentErrors) => ({...currentErrors, name: undefined}));
                    }}
                />
                {fieldErrors.name ? <Text style={styles.fieldError}>{fieldErrors.name}</Text> : null}

                <Text style={styles.label}>Beskrivelse</Text>
                <TextInput
                    style={[styles.input, styles.textArea, fieldErrors.description ? styles.inputError : null]}
                    placeholder="Hvad handler gruppen om?"
                    placeholderTextColor="#9CA3AF"
                    value={description}
                    onChangeText={(value) => {
                        setDescription(value);
                        setFieldErrors((currentErrors) => ({...currentErrors, description: undefined}));
                    }}
                    multiline
                />
                {fieldErrors.description ? <Text style={styles.fieldError}>{fieldErrors.description}</Text> : null}

                <View style={styles.memberHeader}>
                    <Text style={styles.label}>Tilføj medlemmer</Text>
                    <Pressable style={styles.addButton} onPress={() => setIsMemberModalOpen(true)}>
                        <Ionicons name="add" size={22} color="#2563EB"/>
                    </Pressable>
                </View>

                {selectedMembers.length === 0 ? (
                    <Text style={styles.memberHint}>Ingen medlemmer valgt endnu.</Text>
                ) : (
                    <View style={styles.selectedMembers}>
                        {selectedMembers.map((member) => (
                            <View key={member.userId} style={styles.selectedChip}>
                                <Text style={styles.selectedChipText}>{member.fullName}</Text>
                                <Pressable onPress={() => removeMember(member.userId)}>
                                    <Ionicons name="close" size={16} color="#374151"/>
                                </Pressable>
                            </View>
                        ))}
                    </View>
                )}
                {fieldErrors.memberUserIds ? <Text style={styles.fieldError}>{fieldErrors.memberUserIds}</Text> : null}

                <Pressable
                    style={[styles.submitButton, creatingGroup ? styles.submitButtonDisabled : null]}
                    onPress={handleCreateGroup}
                    disabled={creatingGroup}
                >
                    {creatingGroup ? (
                        <ActivityIndicator color="#FFFFFF"/>
                    ) : (
                        <Text style={styles.submitButtonText}>Opret gruppe</Text>
                    )}
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: '#FFFFFF'},
    container: {flex: 1, backgroundColor: '#FFFFFF'},
    content: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32},
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    backButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerSpacer: {width: 36, height: 36},
    title: {fontSize: 24, fontWeight: '700', color: '#111827'},
    iconCircle: {
        alignSelf: 'center',
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 26,
    },
    label: {fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10},
    input: {
        minHeight: 52,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 16,
        fontSize: 15,
        color: '#111827',
        marginBottom: 8,
        backgroundColor: '#FFFFFF',
    },
    textArea: {
        minHeight: 110,
        textAlignVertical: 'top',
        paddingTop: 14,
    },
    inputError: {borderColor: '#DC2626'},
    fieldError: {fontSize: 12, color: '#DC2626', marginBottom: 12},
    memberHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
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
    memberHint: {fontSize: 14, color: '#6B7280', marginBottom: 12},
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
    selectedChipText: {fontSize: 13, fontWeight: '600', color: '#1F2937'},
    submitButton: {
        minHeight: 52,
        borderRadius: 14,
        backgroundColor: '#2156C9',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 18,
    },
    submitButtonDisabled: {opacity: 0.7},
    submitButtonText: {fontSize: 16, fontWeight: '700', color: '#FFFFFF'},
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
    modalTitle: {fontSize: 20, fontWeight: '700', color: '#111827'},
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
    modalSearchInput: {flex: 1, fontSize: 15, color: '#111827', paddingVertical: 0},
    loader: {marginTop: 18},
    emptyText: {fontSize: 14, color: '#6B7280', lineHeight: 20},
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
    memberAvatarText: {fontSize: 15, fontWeight: '700', color: '#1D4ED8'},
    memberTextWrap: {flex: 1},
    memberName: {fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2},
    memberSubtitle: {fontSize: 13, color: '#6B7280'},
});
