import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { createPost } from '@/lib/api';

type CategoryOption = 'Begivenhed' | 'Generelt' | 'Vigtig info';

type IconOption = {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

type PostForm = {
  title: string;
  eventDate: string;
  category: CategoryOption;
  content: string;
  icon: string;
  pinned: boolean;
};

type FieldErrors = Partial<Record<keyof PostForm, string>>;

const categoryOptions: CategoryOption[] = ['Generelt', 'Vigtig info', 'Begivenhed'];

const iconOptions: IconOption[] = [
  { label: 'Kalender', value: 'calendar-blank-outline', icon: 'calendar-blank-outline' },
  { label: 'Megafon', value: 'bullhorn-outline', icon: 'bullhorn-outline' },
  { label: 'Pakke', value: 'package-variant-closed', icon: 'package-variant-closed' },
  { label: 'Vaerktoj', value: 'wrench-outline', icon: 'wrench-outline' },
  { label: 'Kost', value: 'broom', icon: 'broom' },
];

const initialForm: PostForm = {
  title: '',
  eventDate: '',
  category: 'Generelt',
  content: '',
  icon: 'calendar-blank-outline',
  pinned: false,
};

export default function NewPostScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [form, setForm] = useState<PostForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  const updateField = <K extends keyof PostForm>(field: K, value: PostForm[K]) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setFieldErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  };

  const validateClientSide = () => {
    const nextErrors: FieldErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = 'Titel er obligatorisk.';
    }

    if (!form.content.trim()) {
      nextErrors.content = 'Indhold er obligatorisk.';
    }

    if (form.category === 'Begivenhed') {
      if (!form.eventDate.trim()) {
        nextErrors.eventDate = 'Dato for begivenhed er obligatorisk.';
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.eventDate)) {
        nextErrors.eventDate = 'Brug formatet AAAA-MM-DD.';
      }
    }

    return nextErrors;
  };

  const handleSubmit = async () => {
    setGeneralError(null);

    const nextErrors = validateClientSide();

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    if (!user) {
      Alert.alert('Session mangler', 'Log ind igen for at oprette et opslag.');
      return;
    }

    setIsSubmitting(true);

    const result = await createPost({
      userId: user.userId,
      title: form.title,
      eventDate: form.category === 'Begivenhed' ? form.eventDate : '',
      category: form.category,
      content: form.content,
      icon: form.icon,
      pinned: form.pinned,
    });

    setIsSubmitting(false);

    if (result.error) {
      setFieldErrors(result.error.fieldErrors ?? {});
      setGeneralError(result.error.message);
      Alert.alert('Kunne ikke oprette opslag', result.error.message);
      return;
    }

    router.replace('/home');
  };

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

  return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pressable style={styles.iconButton} onPress={() => router.back()}>
                <Feather name="menu" size={22} color="#1F2937" />
              </Pressable>

              <MaterialCommunityIcons name="home-city-outline" size={26} color="#3F7FC4" />

              <Text style={styles.headerTitle}>Nyt opslag</Text>
            </View>

            <Pressable style={styles.iconButton} onPress={() => router.back()}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formCard}>
              <FormField
                  label="Titel"
                  placeholder="Skriv en titel på opslaget..."
                  value={form.title}
                  onChangeText={(value) => updateField('title', value)}
                  error={fieldErrors.title}
                  maxLength={100}
              />

              <FormField
                  label="Indhold"
                  placeholder="Fortæl mere om opslaget..."
                  value={form.content}
                  onChangeText={(value) => updateField('content', value)}
                  error={fieldErrors.content}
                  maxLength={1000}
                  multiline
              />

              <Text style={styles.sectionLabel}>Kategori</Text>

              <View style={styles.segmentRow}>
                {categoryOptions.map((option) => (
                    <Pressable
                        key={option}
                        style={[styles.segmentButton, form.category === option ? styles.segmentActive : null]}
                        onPress={() => updateField('category', option)}
                    >
                      <Text
                          style={[
                            styles.segmentText,
                            form.category === option ? styles.segmentTextActive : null,
                          ]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                ))}
              </View>

              {fieldErrors.category ? <Text style={styles.fieldError}>{fieldErrors.category}</Text> : null}

              <Text style={styles.sectionLabel}>Ikon</Text>

              <View style={styles.iconGrid}>
                {iconOptions.map((option) => (
                    <Pressable
                        key={option.value}
                        style={[styles.iconCard, form.icon === option.value ? styles.iconCardActive : null]}
                        onPress={() => updateField('icon', option.value)}
                    >
                      <MaterialCommunityIcons
                          name={option.icon}
                          size={22}
                          color={form.icon === option.value ? '#FFFFFF' : '#4B5563'}
                      />

                      <Text
                          style={[styles.iconLabel, form.icon === option.value ? styles.iconLabelActive : null]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                ))}
              </View>

              {fieldErrors.icon ? <Text style={styles.fieldError}>{fieldErrors.icon}</Text> : null}

              {form.category === 'Begivenhed' ? (
                  <FormField
                      label="Dato for begivenhed"
                      placeholder="AAAA-MM-DD"
                      value={form.eventDate}
                      onChangeText={(value) => updateField('eventDate', value)}
                      error={fieldErrors.eventDate}
                      iconName="calendar-outline"
                  />
              ) : null}

              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View>
                    <Text style={styles.summaryTitle}>Fastgør opslag</Text>
                    <Text style={styles.summaryText}>
                      Fastgjorte opslag vises øverst på opslagstavlen.
                    </Text>
                  </View>

                  <Switch
                      value={form.pinned}
                      onValueChange={(value) => updateField('pinned', value)}
                      trackColor={{ false: '#D1D5DB', true: '#60A5FA' }}
                      thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {generalError ? <Text style={styles.generalError}>{generalError}</Text> : null}

              <Pressable
                  style={[styles.submitButton, isSubmitting ? styles.submitButtonDisabled : null]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
              >
                {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <>
                      <Feather name="plus-square" size={18} color="#FFFFFF" />
                      <Text style={styles.submitButtonText}>
                        {form.category === 'Begivenhed' ? 'Opret begivenhed' : 'Opret opslag'}
                      </Text>
                    </>
                )}
              </Pressable>
            </View>
          </ScrollView>

          <View style={styles.bottomBar}>
            <Pressable style={styles.bottomItem}>
              <Ionicons name="chatbubble-ellipses-outline" size={26} color="#111827" />
            </Pressable>

            <Pressable style={styles.bottomItem} onPress={() => router.replace('/home')}>
              <Ionicons name="home-outline" size={30} color="#111827" />
            </Pressable>

            <Pressable style={styles.bottomItem} onPress={() => router.push('/profile')}>
              <Ionicons name="person" size={28} color="#9CA3AF" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
  );
}

type FormFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  maxLength?: number;
  multiline?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
};

function FormField({
                     label,
                     placeholder,
                     value,
                     onChangeText,
                     error,
                     maxLength,
                     multiline = false,
                     iconName,
                   }: FormFieldProps) {
  return (
      <View style={styles.fieldWrapper}>
        <Text style={styles.fieldLabel}>{label}</Text>

        <View
            style={[
              styles.inputShell,
              error ? styles.inputShellError : null,
              multiline ? styles.inputShellMultiline : null,
            ]}
        >
          {iconName ? (
              <Ionicons name={iconName} size={18} color="#9CA3AF" style={styles.inputIcon} />
          ) : null}

          <TextInput
              style={[styles.input, multiline ? styles.inputMultiline : null]}
              placeholder={placeholder}
              placeholderTextColor="#9CA3AF"
              value={value}
              onChangeText={onChangeText}
              maxLength={maxLength}
              multiline={multiline}
              textAlignVertical={multiline ? 'top' : 'center'}
          />
        </View>

        {maxLength ? (
            <Text style={styles.counterText}>
              {value.length}/{maxLength}
            </Text>
        ) : null}

        {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 110,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
  },
  fieldWrapper: {
    marginBottom: 14,
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  inputShell: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputShellError: {
    borderColor: '#B42318',
  },
  inputShellMultiline: {
    minHeight: 124,
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  inputIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 10,
  },
  inputMultiline: {
    minHeight: 92,
  },
  counterText: {
    marginTop: 4,
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    marginTop: 2,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
  },
  segmentActive: {
    backgroundColor: '#3F7FC4',
    borderColor: '#3F7FC4',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  iconCard: {
    width: '31%',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  iconCardActive: {
    backgroundColor: '#3F7FC4',
    borderColor: '#3F7FC4',
  },
  iconLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  iconLabelActive: {
    color: '#FFFFFF',
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  summaryText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },
  fieldError: {
    marginTop: 4,
    color: '#B42318',
    fontSize: 12,
  },
  generalError: {
    marginBottom: 12,
    color: '#B42318',
    fontSize: 14,
  },
  submitButton: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#4B5563',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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