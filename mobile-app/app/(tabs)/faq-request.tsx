import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { useAuth } from '@/context/AuthContext';
import { createFaqInquiry } from '@/lib/api';

const categories = [
  'Akutte problemer',
  'Facilitetsproblemer',
  'Støj og adfærd',
  'Rengøring',
  'Teknisk/app',
  'Forslag og feedback',
  'Andet',
] as const;

export default function FaqRequestScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<(typeof categories)[number] | ''>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  const canSubmit = useMemo(
    () => Boolean(user && selectedCategory && title.trim() && description.trim()),
    [description, selectedCategory, title, user],
  );

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

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    const result = await createFaqInquiry({
      userId: user.userId,
      category: selectedCategory,
      title: title.trim(),
      description: description.trim(),
    });
    setSubmitting(false);

    if (result.error) {
      Alert.alert('Kunne ikke sende henvendelse', result.error.message);
      return;
    }

    Alert.alert('Henvendelse sendt', 'Din henvendelse er sendt til administrator.', [
      {
        text: 'OK',
        onPress: () => {
          router.replace('/faq');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>Opret henvendelse</Text>
          <View style={styles.iconButtonPlaceholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="chatbox-outline" size={22} color="#1D4ED8" />
            </View>
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoTitle}>Har du brug for hjælp?</Text>
              <Text style={styles.infoDescription}>
                Udfyld formularen nedenfor, så vender vi tilbage hurtigst muligt.
              </Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Vælg kategori *</Text>
          <Pressable style={styles.selectField} onPress={() => setShowCategories((current) => !current)}>
            <Text style={[styles.selectFieldText, !selectedCategory ? styles.placeholderText : null]}>
              {selectedCategory || 'Vælg kategori'}
            </Text>
            <Ionicons name={showCategories ? 'chevron-up' : 'chevron-down'} size={18} color="#667085" />
          </Pressable>

          {showCategories ? (
            <View style={styles.selectOptions}>
              {categories.map((category) => (
                <Pressable
                  key={category}
                  style={styles.selectOption}
                  onPress={() => {
                    setSelectedCategory(category);
                    setShowCategories(false);
                  }}
                >
                  <Text style={styles.selectOptionText}>{category}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Overskrift *</Text>
          <TextInput
            style={styles.input}
            placeholder="Kort beskrivelse af dit spørgsmål eller problem"
            placeholderTextColor="#98A2B3"
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />

          <Text style={styles.fieldLabel}>Beskrivelse *</Text>
          <TextInput
            style={styles.textarea}
            placeholder="Beskriv dit spørgsmål eller problem så detaljeret som muligt..."
            placeholderTextColor="#98A2B3"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.counterText}>{description.length}/500</Text>

          <Text style={styles.fieldLabel}>Kontaktoplysninger</Text>
          <View style={styles.contactField}>
            <Ionicons name="mail-outline" size={18} color="#667085" />
            <Text style={styles.contactText}>{user.email}</Text>
          </View>
          <Text style={styles.contactHelpText}>
            Vi kontakter dig via den e-mail, du er registreret med.
          </Text>

          <Pressable
            style={[styles.submitButton, !canSubmit || submitting ? styles.submitButtonDisabled : null]}
            disabled={!canSubmit || submitting}
            onPress={() => {
              void handleSubmit();
            }}
          >
            <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>{submitting ? 'Sender...' : 'Send henvendelse'}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
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
  scrollContent: { padding: 16, paddingBottom: 32 },
  infoCard: {
    borderRadius: 18,
    backgroundColor: '#EEF4FF',
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  infoIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextWrap: { flex: 1 },
  infoTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  infoDescription: { fontSize: 14, lineHeight: 20, color: '#475467' },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8, marginTop: 10 },
  selectField: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectFieldText: { flex: 1, fontSize: 15, color: '#111827' },
  placeholderText: { color: '#98A2B3' },
  selectOptions: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  selectOption: {
    minHeight: 46,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7',
  },
  selectOptionText: { fontSize: 14, color: '#111827' },
  input: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
  },
  textarea: {
    minHeight: 180,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  counterText: { alignSelf: 'flex-end', fontSize: 12, color: '#667085', marginTop: 8 },
  contactField: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactText: { fontSize: 15, color: '#111827' },
  contactHelpText: { fontSize: 12, color: '#667085', marginTop: 8 },
  submitButton: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: '#1D4ED8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  submitButtonDisabled: { backgroundColor: '#98A2B3' },
  submitButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
