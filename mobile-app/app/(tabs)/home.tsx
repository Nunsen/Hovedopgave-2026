import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { getPosts, PostDto } from '@/lib/api';

const filterChips = ['Alle', 'Generelt', 'Begivenheder', 'Vigtig info'] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { logout, user, isLoading } = useAuth();

  const [posts, setPosts] = useState<PostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<(typeof filterChips)[number]>('Alle');
  const [searchText, setSearchText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  const loadPosts = useCallback(async () => {
    setLoading(true);

    const result = await getPosts();

    if (result.error) {
      Alert.alert('Kunne ikke hente opslag', result.error);
      setLoading(false);
      return;
    }

    setPosts(result.data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
      useCallback(() => {
        loadPosts();
      }, [loadPosts]),
  );

  const filteredPosts = useMemo(() => {
    const sortedPosts = [...posts].sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return Number(b.pinned) - Number(a.pinned);
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const mappedCategory = activeFilter === 'Begivenheder' ? 'Begivenhed' : activeFilter;
    const searchValue = searchText.toLowerCase().trim();

    return sortedPosts.filter((post) => {
      const matchesFilter = activeFilter === 'Alle' || post.category === mappedCategory;

      const matchesSearch =
          searchValue.length === 0 ||
          post.title?.toLowerCase().includes(searchValue) ||
          post.content?.toLowerCase().includes(searchValue) ||
          post.category?.toLowerCase().includes(searchValue);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, posts, searchText]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    setIsSidebarOpen(false);
    await logout();
    router.replace('/login');
  };

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
                    <Pressable
                        style={styles.sidebarCloseButton}
                        onPress={() => setIsSidebarOpen(false)}
                    >
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
                        router.push('/book-washing');
                      }}
                  >
                    <MaterialCommunityIcons name="washing-machine" size={20} color="#111827" />
                    <Text style={styles.sidebarLinkText}>Vaskeri</Text>
                  </Pressable>

                  <Pressable
                      style={styles.sidebarLink}
                      onPress={() => {
                        setIsSidebarOpen(false);
                        router.push('/book-partyroom');
                      }}
                  >
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


            </View>

            <Text style={styles.headerTitle}>Opslagstavlen</Text>

            <Pressable style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={22} color="#1F2937" />
            </Pressable>
          </View>

          <View style={styles.searchFilterBox}>
            <View style={styles.searchField}>
              <Feather name="search" size={18} color="#9CA3AF" />

              <TextInput
                  style={styles.searchInput}
                  placeholder="Søg i opslag..."
                  placeholderTextColor="#9CA3AF"
                  value={searchText}
                  onChangeText={setSearchText}
              />
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRowInside}
            >
              {filterChips.map((chip) => (
                  <Pressable
                      key={chip}
                      style={[styles.chip, activeFilter === chip ? styles.chipActive : null]}
                      onPress={() => setActiveFilter(chip)}
                  >
                    <Text style={[styles.chipText, activeFilter === chip ? styles.chipTextActive : null]}>
                      {chip}
                    </Text>
                  </Pressable>
              ))}
            </ScrollView>
          </View>

          <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
          >
            {loading ? (
                <Text style={styles.statusText}>Indlæser opslag...</Text>
            ) : filteredPosts.length === 0 ? (
                <Text style={styles.statusText}>Ingen opslag matcher din søgning.</Text>
            ) : (
                filteredPosts.map((post) => {
                  const date = post.createdAt
                      ? new Date(post.createdAt).toLocaleDateString('da-DK')
                      : '';

                  const iconName = post.icon?.trim() ? post.icon : 'bullhorn-outline';
                  const category = post.category?.trim() ? post.category : 'Generelt';

                  return (
                      <Pressable
                          key={post.postId}
                          style={styles.postCard}
                          onPress={() =>
                              router.push({
                                pathname: '/post/[postId]',
                                params: { postId: String(post.postId) },
                              })
                          }
                      >
                        <View style={styles.postIcon}>
                          <MaterialCommunityIcons
                              name={iconName as keyof typeof MaterialCommunityIcons.glyphMap}
                              size={28}
                              color="#4B5563"
                          />
                        </View>

                        <View style={styles.postContent}>
                          <View style={styles.postMetaRow}>
                            <Text style={styles.postCategory}>{category}</Text>
                            <Text style={styles.postDate}>{date}</Text>
                          </View>

                          <Text style={styles.postTitle}>{post.title}</Text>
                          <Text style={styles.postBody}>{post.content}</Text>

                          {post.category === 'Begivenhed' ? (
                              <View style={styles.participantRow}>
                                <Ionicons name="people-outline" size={14} color="#6B7280" />
                                <Text style={styles.participantText}>
                                  {post.participantCount} deltagere
                                </Text>
                              </View>
                          ) : null}
                        </View>

                        {post.pinned ? (
                            <MaterialCommunityIcons
                                name="pin-outline"
                                size={18}
                                color="#6B7280"
                                style={styles.pinIcon}
                            />
                        ) : null}
                      </Pressable>
                  );
                })
            )}
          </ScrollView>

          <Pressable
              style={styles.fab}
              onPress={() => router.push('/new-post')}
          >
            <Ionicons name="add" size={26} color="#FFFFFF" />
            <Text style={styles.fabText}>Nyt opslag</Text>
          </Pressable>

          <BottomNav
              active="home"
              onHomePress={() => router.replace('/home')}
              onWashingPress={() => router.push('/book-washing')}
              onPartyPress={() => router.push('/book-partyroom')}
              onProfilePress={() => router.push('/profile')}
          />
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
    paddingHorizontal: 14,
    paddingTop: 10,
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

  searchFilterBox: {
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: '#F9FAFB', // mindre blå
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB', // subtle border i stedet
  },
  searchField: {
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  chipRowInside: {
    paddingTop: 12,
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipActive: {
    backgroundColor: '#3F7FC4',
    borderColor: '#3F7FC4',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3F7FC4',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  scrollContent: {
    paddingTop: 14,
    paddingBottom: 132,
  },
  statusText: {
    paddingHorizontal: 8,
    paddingVertical: 20,
    fontSize: 15,
    color: '#6B7280',
  },

  postCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#1F2937',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  postIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#EFF6FF',
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
    fontWeight: '700',
    color: '#3F7FC4',
  },
  postDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  postBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#374151',
  },
  participantRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participantText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  pinIcon: {
    marginTop: 4,
  },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 88,
    backgroundColor: '#3F7FC4',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#1D4ED8',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

});
