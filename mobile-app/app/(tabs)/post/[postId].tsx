import {Feather, Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {useFocusEffect} from '@react-navigation/native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {useAuth} from '@/context/AuthContext';
import {createPostComment, deletePost, getPost, PostDto, updatePostParticipation} from '@/lib/api';

function getPostCategoryTheme(category: string | null | undefined) {
    const normalizedCategory = category?.trim().toLowerCase() ?? '';

    if (normalizedCategory === 'begivenhed') {
        return {
            iconColor: '#15803D',
            iconBackgroundColor: '#DCFCE7',
            iconBorderColor: '#86EFAC',
            categoryTextColor: '#166534',
        };
    }

    if (normalizedCategory === 'vigtig info') {
        return {
            iconColor: '#ef6682',
            iconBackgroundColor: '#FFE4E6',
            iconBorderColor: '#FECDD3',
            categoryTextColor: '#c6526a',
        };
    }

    return {
        iconColor: '#2563EB',
        iconBackgroundColor: '#DBEAFE',
        iconBorderColor: '#BFDBFE',
        categoryTextColor: '#1D4ED8',
    };
}

export default function PostDetailsScreen() {
    const router = useRouter();
    const {postId} = useLocalSearchParams<{ postId?: string }>();
    const {user, isLoading} = useAuth();
    const [post, setPost] = useState<PostDto | null>(null);
    const [loadingPost, setLoadingPost] = useState(true);
    const [isUpdatingParticipation, setIsUpdatingParticipation] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/login');
        }
    }, [isLoading, router, user]);

    const loadPost = useCallback(async () => {
        const resolvedPostId = Number(postId);

        if (!user || Number.isNaN(resolvedPostId)) {
            setLoadingPost(false);
            return;
        }

        setLoadingPost(true);

        const result = await getPost(resolvedPostId, user.userId);

        if (result.error) {
            Alert.alert('Kunne ikke hente opslag', result.error);
            setLoadingPost(false);
            return;
        }

        setPost(result.data ?? null);
        setLoadingPost(false);
    }, [postId, user]);

    useFocusEffect(
        useCallback(() => {
            loadPost();
        }, [loadPost]),
    );

    const formattedCreatedAt = useMemo(() => {
        if (!post?.createdAt) {
            return '';
        }

        return new Date(post.createdAt).toLocaleDateString('da-DK');
    }, [post?.createdAt]);

    const formattedEventDate = useMemo(() => {
        if (!post?.eventDate) {
            return '';
        }

        return new Date(post.eventDate).toLocaleDateString('da-DK');
    }, [post?.eventDate]);

    const canEditPost = Boolean(user && post && post.userId === user.userId);

    const handleDeletePost = () => {
        if (!user || !post) {
            return;
        }

        Alert.alert(
            'Slet opslag',
            'Er du sikker paa, at du vil slette opslaget? Denne handling kan ikke fortrydes.',
            [
                {text: 'Annuller', style: 'cancel'},
                {
                    text: 'Slet',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await deletePost(post.postId, user.userId);

                        if (result.error) {
                            Alert.alert('Kunne ikke slette opslag', result.error);
                            return;
                        }

                        router.replace('/home');
                    },
                },
            ],
        );
    };

    const handleParticipationToggle = async () => {
        if (!user || !post) {
            return;
        }

        setIsUpdatingParticipation(true);

        const result = await updatePostParticipation(post.postId, {
            userId: user.userId,
            attending: !post.attending,
        });

        setIsUpdatingParticipation(false);

        if (result.error) {
            Alert.alert('Kunne ikke opdatere deltagelse', result.error);
            return;
        }

        if (result.data) {
            setPost(result.data);
        }
    };

    const handleCommentSubmit = async () => {
        if (!user || !post) {
            return;
        }

        if (!commentText.trim()) {
            Alert.alert('Kommentar mangler', 'Skriv en kommentar foerst.');
            return;
        }

        setIsSubmittingComment(true);

        const result = await createPostComment(post.postId, {
            userId: user.userId,
            content: commentText,
        });

        setIsSubmittingComment(false);

        if (result.error) {
            Alert.alert('Kunne ikke oprette kommentar', result.error);
            return;
        }

        if (result.data) {
            setPost(result.data);
            setCommentText('');
        }
    };

    if (isLoading || loadingPost) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator/>
            </SafeAreaView>
        );
    }

    if (!user || !post) {
        return null;
    }

    const iconName = post.icon?.trim() ? post.icon : 'bullhorn-outline';
    const isEvent = post.category === 'Begivenhed';
    const categoryTheme = getPostCategoryTheme(post.category);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Pressable style={styles.headerButton} onPress={() => router.back()}>
                        <Feather name="arrow-left" size={22} color="#111827"/>
                    </Pressable>

                    <Text style={styles.headerTitle}>Opslag</Text>

                    {canEditPost ? (
                        <View style={styles.headerActions}>
                            <Pressable
                                style={styles.headerButton}
                                onPress={() =>
                                    router.push({
                                        pathname: '/edit-post/[postId]',
                                        params: {postId: String(post.postId)},
                                    })
                                }
                            >
                                <Feather name="edit-2" size={20} color="#111827"/>
                            </Pressable>

                            <Pressable style={styles.headerButton} onPress={handleDeletePost}>
                                <Feather name="trash-2" size={20} color="#B42318"/>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.headerButton}/>
                    )}
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.postCard}>
                        <View style={styles.topRow}>
                            <View
                                style={[
                                    styles.iconContainer,
                                    {
                                        backgroundColor: categoryTheme.iconBackgroundColor,
                                        borderColor: categoryTheme.iconBorderColor,
                                    },
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name={iconName as keyof typeof MaterialCommunityIcons.glyphMap}
                                    size={34}
                                    color={categoryTheme.iconColor}
                                />
                            </View>

                            <View style={styles.metaContent}>
                                <View style={styles.metaRow}>
                                    <Text
                                        style={[styles.categoryText, {color: categoryTheme.categoryTextColor}]}>{post.category}</Text>
                                    <Text style={styles.dateText}>{formattedCreatedAt}</Text>
                                </View>

                                <Text style={styles.title}>{post.title}</Text>
                            </View>
                        </View>

                        <Text style={styles.contentText}>{post.content}</Text>

                        {isEvent ? (
                            <View style={styles.eventCard}>
                                <View style={styles.infoRow}>
                                    <Ionicons name="calendar-outline" size={18} color="#6B7280"/>
                                    <Text style={styles.infoText}>Dato: {formattedEventDate || 'Ikke angivet'}</Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <Ionicons name="time-outline" size={18} color="#6B7280"/>
                                    <Text style={styles.infoText}>
                                        Tid: {post.startTime ?? 'Ikke angivet'} - {post.endTime ?? 'Ikke angivet'}
                                    </Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <Ionicons name="location-outline" size={18} color="#6B7280"/>
                                    <Text style={styles.infoText}>Lokation: {post.location ?? 'Ikke angivet'}</Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <Ionicons name="people-outline" size={18} color="#6B7280"/>
                                    <Text style={styles.infoText}>{post.participantCount} deltagere</Text>
                                </View>

                                <Pressable
                                    style={[
                                        styles.participationButton,
                                        post.attending ? styles.participationButtonActive : null,
                                        isUpdatingParticipation ? styles.disabledButton : null,
                                    ]}
                                    onPress={handleParticipationToggle}
                                    disabled={isUpdatingParticipation}
                                >
                                    {isUpdatingParticipation ? (
                                        <ActivityIndicator color={post.attending ? '#166534' : '#FFFFFF'}/>
                                    ) : (
                                        <>
                                            <Ionicons
                                                name={post.attending ? 'checkmark-circle-outline' : 'add-circle-outline'}
                                                size={18}
                                                color={post.attending ? '#166534' : '#FFFFFF'}
                                            />
                                            <Text
                                                style={[
                                                    styles.participationButtonText,
                                                    post.attending ? styles.participationButtonTextActive : null,
                                                ]}
                                            >
                                                {post.attending ? 'Ikke deltager' : 'Deltager'}
                                            </Text>
                                        </>
                                    )}
                                </Pressable>
                            </View>
                        ) : null}

                        <View style={styles.commentSection}>
                            <Text style={styles.commentSectionTitle}>Kommentarer</Text>

                            <View style={styles.commentComposer}>
                                <Text style={styles.commentAuthorLabel}>{user.fullName}</Text>

                                <TextInput
                                    style={styles.commentInput}
                                    placeholder="Skriv en kommentar..."
                                    placeholderTextColor="#9CA3AF"
                                    value={commentText}
                                    onChangeText={setCommentText}
                                    multiline
                                    textAlignVertical="top"
                                    maxLength={500}
                                />

                                <Pressable
                                    style={[
                                        styles.commentSubmitButton,
                                        isSubmittingComment ? styles.disabledButton : null,
                                    ]}
                                    onPress={handleCommentSubmit}
                                    disabled={isSubmittingComment}
                                >
                                    {isSubmittingComment ? (
                                        <ActivityIndicator color="#FFFFFF"/>
                                    ) : (
                                        <>
                                            <Ionicons name="send-outline" size={16} color="#FFFFFF"/>
                                            <Text style={styles.commentSubmitButtonText}>Tilføj kommentar</Text>
                                        </>
                                    )}
                                </Pressable>
                            </View>

                            {post.comments.length === 0 ? (
                                <Text style={styles.emptyCommentsText}>Ingen kommentarer endnu.</Text>
                            ) : (
                                post.comments.map((comment) => {
                                    const createdAt = comment.createdAt
                                        ? new Date(comment.createdAt).toLocaleString('da-DK')
                                        : '';

                                    return (
                                        <View key={comment.commentId} style={styles.commentCard}>
                                            <View style={styles.commentHeader}>
                                                <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                                                <Text style={styles.commentDate}>{createdAt}</Text>
                                            </View>

                                            <Text style={styles.commentBody}>{comment.content}</Text>
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    </View>
                </ScrollView>
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
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    content: {
        paddingTop: 16,
        paddingBottom: 32,
    },
    postCard: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        padding: 16,
        shadowColor: '#111827',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: {width: 0, height: 3},
        elevation: 2,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FAFAFA',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    metaContent: {
        flex: 1,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
        gap: 12,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    dateText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        lineHeight: 30,
    },
    contentText: {
        fontSize: 15,
        lineHeight: 23,
        color: '#374151',
        marginBottom: 16,
    },
    eventCard: {
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 16,
        backgroundColor: '#F0FDF4',
        padding: 14,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    infoText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '600',
    },
    participationButton: {
        marginTop: 6,
        minHeight: 46,
        borderRadius: 12,
        backgroundColor: '#166534',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    participationButtonActive: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#166534',
    },
    participationButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    participationButtonTextActive: {
        color: '#166534',
    },
    disabledButton: {
        opacity: 0.7,
    },
    commentSection: {
        marginTop: 18,
        paddingTop: 18,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    commentSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
    },
    commentComposer: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        backgroundColor: '#F9FAFB',
        padding: 12,
        marginBottom: 14,
    },
    commentAuthorLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
    },
    commentInput: {
        minHeight: 92,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: '#111827',
        marginBottom: 10,
    },
    commentSubmitButton: {
        minHeight: 42,
        borderRadius: 10,
        backgroundColor: '#4B5563',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    commentSubmitButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    emptyCommentsText: {
        fontSize: 14,
        color: '#6B7280',
    },
    commentCard: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        padding: 12,
        marginBottom: 10,
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        marginBottom: 6,
    },
    commentAuthor: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    commentDate: {
        fontSize: 11,
        color: '#6B7280',
    },
    commentBody: {
        fontSize: 14,
        lineHeight: 20,
        color: '#374151',
    },
});
