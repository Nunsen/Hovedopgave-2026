import {Feather, Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, Alert} from 'react-native';
import {useEffect, useState} from 'react';
import {getPosts, PostDto} from '@/lib/api';

const filterChips = ['Alle', 'Generelt', 'Begivenheder', 'Vigtig info'];

export default function HomeScreen() {
    const router = useRouter();

    const [posts, setPosts] = useState<PostDto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPosts = async () => {
            const result = await getPosts();

            if (result.error) {
                Alert.alert('ERROR', result.error);
                setLoading(false);
                return;
            }

            if (result.data) {
                Alert.alert('FETCHED POSTS', JSON.stringify(result.data));
                setPosts(result.data);
            } else {
                Alert.alert('NO DATA', 'result.data was undefined');
            }

            setLoading(false);
        };

        loadPosts();
    }, []);

    // Debug render state
    useEffect(() => {
        Alert.alert('RENDER POSTS', JSON.stringify(posts));
    }, [posts]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Pressable style={styles.iconButton}>
                            <Feather name="menu" size={22} color="#1F2937"/>
                        </Pressable>
                        <Image
                            source={require('@/assets/images/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={styles.headerTitle}>Opslagstavlen</Text>

                    <Pressable style={styles.iconButton}>
                        <Ionicons name="notifications-outline" size={22} color="#1F2937"/>
                    </Pressable>
                </View>

                <View style={styles.searchRow}>
                    <View style={styles.searchField}>
                        <Feather name="search" size={18} color="#9CA3AF"/>
                        <Text style={styles.searchPlaceholder}>Sog i opslag...</Text>
                    </View>

                    <Pressable style={styles.filterButton}>
                        <Feather name="filter" size={16} color="#374151"/>
                        <Text style={styles.filterText}>Filter</Text>
                    </Pressable>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.chipRow}
                    >
                        {filterChips.map((chip, index) => (
                            <Pressable
                                key={chip}
                                style={[styles.chip, index === 0 ? styles.chipActive : null]}
                            >
                                <Text style={[styles.chipText, index === 0 ? styles.chipTextActive : null]}>
                                    {chip}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    {loading ? (
                        <Text style={{padding: 20}}>Indlaeser opslag...</Text>
                    ) : (
                        [...posts]
                            .sort((a, b) => Number(b.pinned) - Number(a.pinned))
                            .map((post) => {
                                const safeDate = post.createdAt ? post.createdAt.split('.')[0] : '';
                                const date = safeDate ? new Date(safeDate).toLocaleDateString('da-DK') : '';

                                const iconName = post.icon && post.icon.trim() !== '' ? post.icon : 'bullhorn-outline';
                                const category = post.category && post.category.trim() !== '' ? post.category : 'Generelt';

                                return (
                                    <View key={post.postId} style={styles.postCard}>
                                        <View style={styles.postIcon}>
                                            <MaterialCommunityIcons name={iconName as any} size={28} color="#4B5563"/>
                                        </View>

                                        <View style={styles.postContent}>
                                            <View style={styles.postMetaRow}>
                                                <Text style={styles.postCategory}>{category}</Text>
                                                <Text style={styles.postDate}>{date}</Text>
                                            </View>

                                            <Text style={styles.postTitle}>{post.title}</Text>
                                            <Text style={styles.postBody}>{post.content}</Text>
                                        </View>

                                        {post.pinned ? (
                                            <MaterialCommunityIcons
                                                name="pin-outline"
                                                size={18}
                                                color="#6B7280"
                                                style={styles.pinIcon}
                                            />
                                        ) : null}
                                    </View>
                                );
                            })
                    )}
                </ScrollView>

                <Pressable style={styles.fab}>
                    <Ionicons name="add" size={26} color="#FFFFFF"/>
                    <Text style={styles.fabText}>Nyt opslag</Text>
                </Pressable>

                <View style={styles.bottomBar}>
                    <Pressable style={styles.bottomItem}>
                        <Ionicons name="chatbubble-ellipses-outline" size={26} color="#111827"/>
                    </Pressable>

                    <Pressable style={styles.bottomItem}>
                        <Ionicons name="home-outline" size={30} color="#111827"/>
                    </Pressable>

                    <Pressable style={styles.bottomItem} onPress={() => router.push('/profile')}>
                        <Ionicons name="person" size={28} color="#9CA3AF"/>
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
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
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
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 30,
        height: 30,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    searchRow: {
        paddingTop: 14,
    },
    searchField: {
        height: 44,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 10,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFFFFF',
    },
    searchPlaceholder: {
        fontSize: 15,
        color: '#9CA3AF',
    },
    filterButton: {
        alignSelf: 'flex-end',
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#9CA3AF',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    scrollContent: {
        paddingTop: 10,
        paddingBottom: 132,
    },
    chipRow: {
        paddingBottom: 14,
        gap: 8,
    },
    chip: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    chipActive: {
        backgroundColor: '#4B5563',
        borderColor: '#4B5563',
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    chipTextActive: {
        color: '#FFFFFF',
    },
    postCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        padding: 12,
        marginBottom: 12,
        shadowColor: '#111827',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: 2},
        elevation: 2,
    },
    postIcon: {
        width: 46,
        height: 46,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        backgroundColor: '#FAFAFA',
    },
    postContent: {
        flex: 1,
        paddingRight: 8,
    },
    postMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
        gap: 12,
    },
    postCategory: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    postDate: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    postTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    postBody: {
        fontSize: 13,
        lineHeight: 19,
        color: '#374151',
    },
    pinIcon: {
        marginTop: 4,
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 88,
        backgroundColor: '#5B5B5B',
        borderRadius: 24,
        paddingVertical: 10,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: 4},
        elevation: 6,
    },
    fabText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    bottomBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 72,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingBottom: 8,
    },
    bottomItem: {
        width: 64,
        alignItems: 'center',
        justifyContent: 'center',
    },
});