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
import {
  getUserProfile,
  deleteUserProfile,
  updateUserProfile,
  UpdateUserProfilePayload,
  UserProfileDto,
} from '@/lib/api';

type ProfileRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

function ProfileRow({ icon, label, value }: ProfileRowProps) {
  return (
      <View style={styles.infoRow}>
        <View style={styles.infoIcon}>
          <Ionicons name={icon} size={18} color="#3F7FC4" />
        </View>

        <View style={styles.infoTextBlock}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      </View>
  );
}

type FieldErrors = Partial<Record<keyof UpdateUserProfilePayload, string>>;

type ProfileFormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
};

function ProfileFormField({
                            label,
                            value,
                            onChangeText,
                            placeholder,
                            error,
                            keyboardType = 'default',
                            autoCapitalize = 'sentences',
                            secureTextEntry = false,
                          }: ProfileFormFieldProps) {
  return (
      <View style={styles.formField}>
        <Text style={styles.formLabel}>{label}</Text>
        <TextInput
            style={[styles.formInput, error ? styles.formInputError : null]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            secureTextEntry={secureTextEntry}
        />
        {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      </View>
  );
}

const emptyForm: UpdateUserProfilePayload = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  birthDate: '',
  apartmentNumber: '',
  password: '',
  confirmPassword: '',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { isLoading, logout, updateUser, user } = useAuth();
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [form, setForm] = useState<UpdateUserProfilePayload>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  const loadProfile = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoadingProfile(true);
    const result = await getUserProfile(user.userId);

    if (result.error) {
      Alert.alert('Kunne ikke hente profil', result.error);
      setLoadingProfile(false);
      return;
    }

    setProfile(result.data ?? null);
    setLoadingProfile(false);
  }, [user]);

  useFocusEffect(
      useCallback(() => {
        loadProfile();
      }, [loadProfile]),
  );

  const detailRows = useMemo(() => {
    if (!profile) {
      return [];
    }

    return [
      { icon: 'person-outline' as const, label: 'Fornavn', value: profile.firstName || '-' },
      { icon: 'person-outline' as const, label: 'Efternavn', value: profile.lastName || '-' },
      { icon: 'mail-outline' as const, label: 'Email', value: profile.email || '-' },
      { icon: 'call-outline' as const, label: 'Telefonnummer', value: profile.phoneNumber || '-' },
      {
        icon: 'calendar-outline' as const,
        label: 'Fødselsdato',
        value: profile.birthDate ? new Date(profile.birthDate).toLocaleDateString('da-DK') : '-',
      },
      {
        icon: 'business-outline' as const,
        label: 'Lejlighedsnummer',
        value: profile.apartmentNumber || '-',
      },
    ];
  }, [profile]);

  const updateField = (field: keyof UpdateUserProfilePayload, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setFieldErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  };

  const openEditModal = () => {
    if (!profile) {
      return;
    }

    setForm({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      email: profile.email ?? '',
      phoneNumber: profile.phoneNumber ?? '',
      birthDate: profile.birthDate ?? '',
      apartmentNumber: profile.apartmentNumber ?? '',
      password: '',
      confirmPassword: '',
    });

    setFieldErrors({});
    setGeneralError(null);
    setIsEditModalOpen(true);
  };

  const validateClientSide = () => {
    const nextErrors: FieldErrors = {};

    if (!form.firstName.trim()) {
      nextErrors.firstName = 'Fornavn er obligatorisk.';
    }

    if (!form.lastName.trim()) {
      nextErrors.lastName = 'Efternavn er obligatorisk.';
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email er obligatorisk.';
    } else if (!/^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(form.email.trim())) {
      nextErrors.email = 'Indtast en gyldig email.';
    }

    if (!form.phoneNumber.trim()) {
      nextErrors.phoneNumber = 'Telefonnummer er obligatorisk.';
    }

    if (!form.birthDate.trim()) {
      nextErrors.birthDate = 'Fødselsdato er obligatorisk.';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate.trim())) {
      nextErrors.birthDate = 'Brug formatet AAAA-MM-DD.';
    }

    if (!form.apartmentNumber.trim()) {
      nextErrors.apartmentNumber = 'Lejlighedsnummer er obligatorisk.';
    }

    if (form.password.trim() || form.confirmPassword.trim()) {
      if (!form.password.trim()) {
        nextErrors.password = 'Indtast nyt kodeord.';
      } else if (form.password.trim().length < 8) {
        nextErrors.password = 'Adgangskoden skal mindst være 8 tegn.';
      }

      if (!form.confirmPassword.trim()) {
        nextErrors.confirmPassword = 'Bekræft adgangskoden.';
      } else if (form.password !== form.confirmPassword) {
        nextErrors.confirmPassword = 'Adgangskoderne matcher ikke.';
      }
    }

    return nextErrors;
  };

  const handleSubmit = async () => {
    if (!user) {
      return;
    }

    setGeneralError(null);
    const nextErrors = validateClientSide();

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);

    const result = await updateUserProfile(user.userId, {
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim(),
      birthDate: form.birthDate.trim(),
      apartmentNumber: form.apartmentNumber.trim(),
      password: form.password.trim(),
      confirmPassword: form.confirmPassword.trim(),
    });

    setIsSubmitting(false);

    if (result.error) {
      setFieldErrors(result.error.fieldErrors ?? {});
      setGeneralError(result.error.message);
      Alert.alert('Kunne ikke opdatere profil', result.error.message);
      return;
    }

    if (result.data) {
      setProfile(result.data);

      await updateUser({
        ...user,
        fullName: result.data.fullName,
        email: result.data.email,
      });

      setIsEditModalOpen(false);
      Alert.alert('Profil opdateret', 'Dine oplysninger er gemt.');
    }
  };

  if (isLoading || loadingProfile) {
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

  const confirmDeleteProfile = () => {
    if (!user) {
      return;
    }

    Alert.alert(
        'Slet profil',
        'Er du sikker på, at du vil slette din profil? Denne handling kan ikke fortrydes.',
        [
          {
            text: 'Annuller',
            style: 'cancel',
          },
          {
            text: 'Slet profil',
            style: 'destructive',
            onPress: async () => {
              const result = await deleteUserProfile(user.userId);

              if (result.error) {
                Alert.alert('Kunne ikke slette profil', result.error);
                return;
              }

              await logout();
              router.replace('/login');
            },
          },
        ],
    );
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
                        router.replace('/profile');
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

          <Modal
              transparent
              visible={isEditModalOpen}
              animationType="slide"
              onRequestClose={() => setIsEditModalOpen(false)}
          >
            <View style={styles.editOverlay}>
              <View style={styles.editModalCard}>
                <View style={styles.editHeader}>
                  <Text style={styles.editTitle}>Rediger profil</Text>

                  <Pressable
                      style={styles.editCloseButton}
                      onPress={() => setIsEditModalOpen(false)}
                  >
                    <Ionicons name="close" size={22} color="#111827" />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <ProfileFormField
                      label="Fornavn"
                      placeholder="Indtast fornavn"
                      value={form.firstName}
                      onChangeText={(value) => updateField('firstName', value)}
                      error={fieldErrors.firstName}
                  />

                  <ProfileFormField
                      label="Efternavn"
                      placeholder="Indtast efternavn"
                      value={form.lastName}
                      onChangeText={(value) => updateField('lastName', value)}
                      error={fieldErrors.lastName}
                  />

                  <ProfileFormField
                      label="Email"
                      placeholder="anna@eksempel.dk"
                      value={form.email}
                      onChangeText={(value) => updateField('email', value)}
                      error={fieldErrors.email}
                      keyboardType="email-address"
                      autoCapitalize="none"
                  />

                  <ProfileFormField
                      label="Telefonnummer"
                      placeholder="12345678"
                      value={form.phoneNumber}
                      onChangeText={(value) => updateField('phoneNumber', value)}
                      error={fieldErrors.phoneNumber}
                      keyboardType="phone-pad"
                  />

                  <ProfileFormField
                      label="Fødselsdato"
                      placeholder="AAAA-MM-DD"
                      value={form.birthDate}
                      onChangeText={(value) => updateField('birthDate', value)}
                      error={fieldErrors.birthDate}
                      autoCapitalize="none"
                  />

                  <ProfileFormField
                      label="Lejlighedsnummer"
                      placeholder="Fx 2A"
                      value={form.apartmentNumber}
                      onChangeText={(value) => updateField('apartmentNumber', value)}
                      error={fieldErrors.apartmentNumber}
                  />

                  <ProfileFormField
                      label="Nyt kodeord"
                      placeholder="Tomt felt bevarer nuværende kodeord"
                      value={form.password}
                      onChangeText={(value) => updateField('password', value)}
                      error={fieldErrors.password}
                      secureTextEntry
                      autoCapitalize="none"
                  />

                  <ProfileFormField
                      label="Bekræft kodeord"
                      placeholder="Gentag nyt kodeord"
                      value={form.confirmPassword}
                      onChangeText={(value) => updateField('confirmPassword', value)}
                      error={fieldErrors.confirmPassword}
                      secureTextEntry
                      autoCapitalize="none"
                  />

                  {generalError ? <Text style={styles.generalError}>{generalError}</Text> : null}

                  <Pressable
                      style={[styles.saveButton, isSubmitting ? styles.saveButtonDisabled : null]}
                      onPress={handleSubmit}
                      disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>Gem ændringer</Text>
                    )}
                  </Pressable>
                </ScrollView>
              </View>
            </View>
          </Modal>

          <View style={styles.header}>
            <Pressable style={styles.iconButton} onPress={() => setIsSidebarOpen(true)}>
              <Feather name="menu" size={22} color="#1F2937" />
            </Pressable>

            <Text style={styles.headerTitle}>Min profil</Text>

            <View style={styles.headerSpacer} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.heroCard}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={42} color="#3F7FC4" />
              </View>

              <Text style={styles.heroName}>{profile?.fullName ?? user.fullName}</Text>
              <Text style={styles.heroEmail}>{profile?.email ?? user.email}</Text>

              <View style={styles.heroMetaPill}>
                <Ionicons name="home-outline" size={14} color="#3F7FC4" />
                <Text style={styles.heroMetaText}>Lejlighed {profile?.apartmentNumber ?? '-'}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mine oplysninger</Text>

              <View style={styles.sectionCard}>
                {detailRows.map((row) => (
                    <ProfileRow key={row.label} icon={row.icon} label={row.label} value={row.value} />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sikkerhed</Text>

              <View style={styles.sectionCard}>
                <ProfileRow
                    icon="lock-closed-outline"
                    label="Kodeord"
                    value={profile?.password ?? '********'}
                />
              </View>
            </View>

            <Pressable style={styles.editProfileButton} onPress={openEditModal}>
              <Ionicons name="create-outline" size={18} color="#FFFFFF" />
              <Text style={styles.editProfileButtonText}>Rediger profil</Text>
            </Pressable>

            <Pressable style={styles.deleteProfileButton} onPress={confirmDeleteProfile}>
              <Ionicons name="trash-outline" size={18} color="#B42318" />
              <Text style={styles.deleteProfileButtonText}>Slet profil</Text>
            </Pressable>
          </ScrollView>

          <BottomNav
              active="profile"
              onHomePress={() => router.replace('/home')}
              onWashingPress={() => router.push('/book-washing')}
              onPartyPress={() => router.push('/book-partyroom')}
              onProfilePress={() => router.replace('/profile')}
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
  headerSpacer: {
    width: 34,
    height: 34,
  },
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 104,
  },
  editOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'flex-end',
  },
  editModalCard: {
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  editCloseButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  heroCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginBottom: 22,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  heroEmail: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  heroMetaPill: {
    marginTop: 14,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3F7FC4',
  },
  editProfileButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#3F7FC4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  editProfileButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  infoTextBlock: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  formField: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 7,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  formInputError: {
    borderColor: '#B42318',
  },
  fieldError: {
    marginTop: 6,
    color: '#B42318',
    fontSize: 13,
  },
  generalError: {
    marginBottom: 14,
    color: '#B42318',
    fontSize: 14,
    lineHeight: 20,
  },
  saveButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#3F7FC4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteProfileButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  deleteProfileButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B42318',
  },
});