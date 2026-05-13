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
  TextInput,
  View,
} from 'react-native';

import { BottomNav } from '@/components/navigation/bottom-nav';
import { useAuth } from '@/context/AuthContext';
import { FaqDto, getFaqs } from '@/lib/api';

const faqCategories = [
  {
    title: 'Akutte problemer',
    description: 'Hvad gør du i tilfælde af akutte eller farlige situationer.',
    icon: 'warning-outline',
    color: '#F43F5E',
  },
  {
    title: 'Booking og app-funktioner',
    description: 'Spørgsmål om booking, faciliteter og brug af appen.',
    icon: 'calendar-outline',
    color: '#22C55E',
  },
  {
    title: 'Tekniske problemer',
    description: 'Få hjælp til tekniske problemer og fejl i appen.',
    icon: 'build-outline',
    color: '#F59E0B',
  },
  {
    title: 'Regler og fællesområder',
    description: 'Information om regler, støj, rengøring og fællesområder.',
    icon: 'megaphone-outline',
    color: '#8B5CF6',
  },
  {
    title: 'Facilitetsproblemer',
    description: 'Rapportér problemer med maskiner, udstyr og faciliteter.',
    icon: 'chatbox-ellipses-outline',
    color: '#2563EB',
  },
  {
    title: 'Støj og adfærd',
    description: 'Spørgsmål om støj, adfærd og nabohensyn.',
    icon: 'people-outline',
    color: '#EF4444',
  },
  {
    title: 'Forslag og feedback',
    description: 'Del dine idéer og forslag til forbedringer.',
    icon: 'bulb-outline',
    color: '#06B6D4',
  },
] as const;

export default function FaqScreen() {
  const router = useRouter();
  const { logout, user, isLoading } = useAuth();

  const [faqs, setFaqs] = useState<FaqDto[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  const loadFaqs = useCallback(async () => {
    setLoadingFaqs(true);

    const result = await getFaqs();

    if (result.error) {
      Alert.alert('Kunne ikke hente FAQ', result.error);
      setLoadingFaqs(false);
      return;
    }

    setFaqs(result.data ?? []);
    setLoadingFaqs(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadFaqs();
    }, [loadFaqs]),
  );

  const filteredFaqs = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    if (!normalizedSearch) {
      return faqs;
    }

    return faqs.filter((faq) => {
      const searchableValues = [faq.question, faq.answer, faq.category];
      return searchableValues.some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [faqs, searchText]);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    if (!normalizedSearch) {
      return faqCategories;
    }

    return faqCategories.filter((category) => {
      const searchableValues = [category.title, category.description];
      return searchableValues.some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [searchText]);

  if (isLoading || loadingFaqs) {
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

                <SidebarLink icon="home-outline" label="Forside" onPress={() => { setIsSidebarOpen(false); router.replace('/home'); }} />
                <SidebarLink icon="add-circle-outline" label="Nyt opslag" onPress={() => { setIsSidebarOpen(false); router.push('/new-post'); }} />
                <SidebarLink icon="chatbubble-ellipses-outline" label="Chat" onPress={() => { setIsSidebarOpen(false); router.push('/chat'); }} />
                <SidebarLink icon="person-outline" label="Profil" onPress={() => { setIsSidebarOpen(false); router.push('/profile'); }} />

                <Pressable style={styles.sidebarLink} onPress={() => { setIsSidebarOpen(false); router.push('/book-washing'); }}>
                  <MaterialCommunityIcons name="washing-machine" size={20} color="#111827" />
                  <Text style={styles.sidebarLinkText}>Vaskeri</Text>
                </Pressable>

                <Pressable style={styles.sidebarLink} onPress={() => { setIsSidebarOpen(false); router.push('/book-partyroom'); }}>
                  <MaterialCommunityIcons name="party-popper" size={20} color="#111827" />
                  <Text style={styles.sidebarLinkText}>Festsal</Text>
                </Pressable>

                <SidebarLink icon="help-circle-outline" label="FAQ" onPress={() => { setIsSidebarOpen(false); router.replace('/faq'); }} />
              </View>

              <Pressable
                style={styles.logoutButton}
                onPress={async () => {
                  setIsSidebarOpen(false);
                  await logout();
                  router.replace('/login');
                }}
              >
                <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
                <Text style={styles.logoutButtonText}>Log ud</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => setIsSidebarOpen(true)}>
            <Feather name="menu" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>FAQ / Hjælp</Text>
          <View style={styles.iconButtonPlaceholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.heroText}>
            Find svar på typiske spørgsmål, eller kontakt os, hvis du har brug for yderligere hjælp.
          </Text>

          <View style={styles.searchField}>
            <Feather name="search" size={18} color="#98A2B3" />
            <TextInput
              style={styles.searchInput}
              placeholder="Søg i spørgsmål og svar..."
              placeholderTextColor="#98A2B3"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          <Text style={styles.sectionTitle}>Kategorier</Text>

          <View style={styles.categoryGrid}>
            {filteredCategories.map((category) => (
              <View key={category.title} style={styles.categoryCard}>
                <View style={[styles.categoryIconWrap, { backgroundColor: `${category.color}14` }]}>
                  <Ionicons name={category.icon} size={20} color={category.color} />
                </View>

                <View style={styles.categoryTextWrap}>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                  <Text style={styles.categoryDescription}>{category.description}</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#667085" />
              </View>
            ))}
          </View>

          {filteredFaqs.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Ofte stillede spørgsmål</Text>
              {filteredFaqs.slice(0, 6).map((faq) => (
                <View key={faq.faqId} style={styles.faqCard}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                  <Text style={styles.faqCategory}>{faq.category}</Text>
                </View>
              ))}
            </>
          ) : null}

          <View style={styles.helpCard}>
            <View style={styles.helpLeft}>
              <View style={styles.helpIconWrap}>
                <Ionicons name="chatbox-outline" size={20} color="#FFFFFF" />
              </View>

              <View style={styles.helpTextWrap}>
                <Text style={styles.helpTitle}>Kan du ikke finde svar på dit spørgsmål?</Text>
                <Text style={styles.helpDescription}>
                  Opret en henvendelse, så hjælper vi dig videre hurtigst muligt.
                </Text>
              </View>
            </View>

            <Pressable style={styles.helpButton} onPress={() => router.push('/faq-request')}>
              <Text style={styles.helpButtonText}>Opret henvendelse</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </ScrollView>

        <BottomNav
          onChatPress={() => router.push('/chat')}
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

function SidebarLink({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.sidebarLink} onPress={onPress}>
      <Ionicons name={icon} size={20} color="#111827" />
      <Text style={styles.sidebarLinkText}>{label}</Text>
    </Pressable>
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
  iconButtonPlaceholder: { width: 34, height: 34 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  heroText: { fontSize: 15, lineHeight: 22, color: '#475467', marginBottom: 18 },
  searchField: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 14 },
  categoryGrid: { gap: 12, marginBottom: 24 },
  categoryCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTextWrap: { flex: 1 },
  categoryTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  categoryDescription: { fontSize: 13, lineHeight: 18, color: '#667085' },
  faqCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 10,
  },
  faqQuestion: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  faqAnswer: { fontSize: 14, lineHeight: 20, color: '#475467', marginBottom: 8 },
  faqCategory: { fontSize: 12, color: '#667085' },
  helpCard: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: '#EEF4FF',
    padding: 16,
    gap: 16,
  },
  helpLeft: { flexDirection: 'row', gap: 12 },
  helpIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpTextWrap: { flex: 1 },
  helpTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  helpDescription: { fontSize: 13, lineHeight: 18, color: '#475467' },
  helpButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  helpButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
