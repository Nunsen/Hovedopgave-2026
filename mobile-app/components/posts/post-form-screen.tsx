import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

import { BottomNav } from '@/components/navigation/bottom-nav';
import { useAuth } from '@/context/AuthContext';

export type CategoryOption = 'Begivenhed' | 'Generelt' | 'Vigtig info';

type IconOption = {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

export type PostForm = {
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  category: CategoryOption;
  content: string;
  icon: string;
  pinned: boolean;
};

export type PostFieldErrors = Partial<Record<keyof PostForm, string>>;

const categoryOptions: CategoryOption[] = ['Generelt', 'Vigtig info', 'Begivenhed'];

const iconOptions: IconOption[] = [
  { label: 'Kalender', value: 'calendar-blank-outline', icon: 'calendar-blank-outline' },
  { label: 'Megafon', value: 'bullhorn-outline', icon: 'bullhorn-outline' },
  { label: 'Pakke', value: 'package-variant-closed', icon: 'package-variant-closed' },
  { label: 'Vaerktoj', value: 'wrench-outline', icon: 'wrench-outline' },
  { label: 'Kost', value: 'broom', icon: 'broom' },
];

export const initialPostForm: PostForm = {
  title: '',
  eventDate: '',
  startTime: '',
  endTime: '',
  location: '',
  category: 'Generelt',
  content: '',
  icon: 'calendar-blank-outline',
  pinned: false,
};

type PostFormScreenProps = {
  title: string;
  submitLabel: string;
  submitIcon: keyof typeof Feather.glyphMap;
  initialValues?: PostForm;
  isSubmitting: boolean;
  generalError?: string | null;
  submitErrorTitle: string;
  submitErrorMessage: string;
  onSubmit: (form: PostForm) => Promise<{ fieldErrors?: PostFieldErrors; message?: string } | void>;
  onBack: () => void;
  onHomePress?: () => void;
  onWashingPress?: () => void;
  onPartyPress?: () => void;
  onProfilePress?: () => void;
};

export function PostFormScreen({
  title,
  submitLabel,
  submitIcon,
  initialValues = initialPostForm,
  isSubmitting,
  generalError,
  submitErrorTitle,
  submitErrorMessage,
  onSubmit,
  onBack,
  onHomePress,
  onWashingPress,
  onPartyPress,
  onProfilePress,
}: PostFormScreenProps) {
  const { user, isLoading } = useAuth();
  const [form, setForm] = useState<PostForm>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<PostFieldErrors>({});

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

  const updateField = <K extends keyof PostForm>(field: K, value: PostForm[K]) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setFieldErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  };

  const validateClientSide = () => {
    const nextErrors: PostFieldErrors = {};

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

      if (!form.startTime.trim()) {
        nextErrors.startTime = 'Starttidspunkt er obligatorisk.';
      } else if (!/^\d{2}:\d{2}$/.test(form.startTime)) {
        nextErrors.startTime = 'Brug formatet TT:MM.';
      }

      if (!form.endTime.trim()) {
        nextErrors.endTime = 'Sluttidspunkt er obligatorisk.';
      } else if (!/^\d{2}:\d{2}$/.test(form.endTime)) {
        nextErrors.endTime = 'Brug formatet TT:MM.';
      }

      if (!form.location.trim()) {
        nextErrors.location = 'Lokation er obligatorisk.';
      }
    }

    return nextErrors;
  };

  const handleSubmit = async () => {
    const nextErrors = validateClientSide();

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    if (!user) {
      Alert.alert('Session mangler', submitErrorMessage);
      return;
    }

    const result = await onSubmit(form);

    if (result?.fieldErrors || result?.message) {
      setFieldErrors(result.fieldErrors ?? {});
      Alert.alert(submitErrorTitle, result.message ?? submitErrorMessage);
    }
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
            <Pressable style={styles.iconButton} onPress={onBack}>
              <Feather name="menu" size={22} color="#1F2937" />
            </Pressable>

            <MaterialCommunityIcons name="home-city-outline" size={26} color="#3F7FC4" />

            <Text style={styles.headerTitle}>{title}</Text>
          </View>

          <Pressable style={styles.iconButton} onPress={onBack}>
            <Ionicons name="close" size={24} color="#1F2937" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            <FormField
              label="Titel"
              placeholder="Skriv en titel paa opslaget..."
              value={form.title}
              onChangeText={(value) => updateField('title', value)}
              error={fieldErrors.title}
              maxLength={100}
            />

            <FormField
              label="Indhold"
              placeholder="Fortael mere om opslaget..."
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

                  <Text style={[styles.iconLabel, form.icon === option.value ? styles.iconLabelActive : null]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {fieldErrors.icon ? <Text style={styles.fieldError}>{fieldErrors.icon}</Text> : null}

            {form.category === 'Begivenhed' ? (
              <>
                <FormField
                  label="Dato for begivenhed"
                  placeholder="AAAA-MM-DD"
                  value={form.eventDate}
                  onChangeText={(value) => updateField('eventDate', value)}
                  error={fieldErrors.eventDate}
                  iconName="calendar-outline"
                />

                <View style={styles.twoColumnRow}>
                  <FormField
                    label="Starttidspunkt"
                    placeholder="TT:MM"
                    value={form.startTime}
                    onChangeText={(value) => updateField('startTime', value)}
                    error={fieldErrors.startTime}
                    iconName="time-outline"
                  />

                  <FormField
                    label="Sluttidspunkt"
                    placeholder="TT:MM"
                    value={form.endTime}
                    onChangeText={(value) => updateField('endTime', value)}
                    error={fieldErrors.endTime}
                    iconName="time-outline"
                  />
                </View>

                <FormField
                  label="Lokation"
                  placeholder="Skriv lokation"
                  value={form.location}
                  onChangeText={(value) => updateField('location', value)}
                  error={fieldErrors.location}
                  iconName="location-outline"
                  maxLength={150}
                />
              </>
            ) : null}

            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View>
                  <Text style={styles.summaryTitle}>Fastgoer opslag</Text>
                  <Text style={styles.summaryText}>Fastgjorte opslag vises oeverst paa opslagstavlen.</Text>
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
                  <Feather name={submitIcon} size={18} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>{submitLabel}</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>

        <BottomNav
          active="chat"
          onHomePress={onHomePress ?? onBack}
          onWashingPress={onWashingPress}
          onPartyPress={onPartyPress}
          onProfilePress={onProfilePress}
        />
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

      {maxLength ? <Text style={styles.counterText}>{value.length}/{maxLength}</Text> : null}
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
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
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
});
