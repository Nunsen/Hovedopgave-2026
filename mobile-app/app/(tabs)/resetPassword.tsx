import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ResetPasswordPayload, resetPassword } from '@/lib/api';

type FieldErrors = Partial<Record<keyof ResetPasswordPayload, string>>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [form, setForm] = useState<ResetPasswordPayload>({ email: '', newPassword: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof ResetPasswordPayload, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setFieldErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  };

  const validateClientSide = () => {
    const nextErrors: FieldErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = 'Email er obligatorisk.';
    }

    if (!form.newPassword.trim()) {
      nextErrors.newPassword = 'Nyt kodeord er obligatorisk.';
    } else if (form.newPassword.length < 8) {
      nextErrors.newPassword = 'Det nye kodeord skal mindst vaere 8 tegn.';
    }

    return nextErrors;
  };

  const handleResetPassword = async () => {
    setGeneralError(null);
    const nextErrors = validateClientSide();

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await resetPassword(form);
    setIsSubmitting(false);

    if (error) {
      setFieldErrors(error.fieldErrors ?? {});
      setGeneralError(error.message);
      Alert.alert('Kunne ikke opdatere adgangskode', error.message);
      return;
    }

    if (data) {
      Alert.alert('Adgangskode opdateret', data.message, [
        {
          text: 'Tilbage til login',
          onPress: () => router.replace('/login'),
        },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Tilbage</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Nulstil adgangskode</Text>
        <Text style={styles.subtitle}>
          Indtast din email og et nyt kodeord for at opdatere adgangskoden.
        </Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#8A8A8A"
          style={[styles.input, fieldErrors.email ? styles.inputError : null]}
          value={form.email}
          onChangeText={(value) => updateField('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email}</Text> : null}

        <TextInput
          placeholder="Nyt kodeord"
          placeholderTextColor="#8A8A8A"
          secureTextEntry
          style={[styles.input, fieldErrors.newPassword ? styles.inputError : null]}
          value={form.newPassword}
          onChangeText={(value) => updateField('newPassword', value)}
        />
        {fieldErrors.newPassword ? (
          <Text style={styles.fieldError}>{fieldErrors.newPassword}</Text>
        ) : null}

        {generalError ? <Text style={styles.generalError}>{generalError}</Text> : null}

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting ? styles.buttonDisabled : null]}
          activeOpacity={0.8}
          onPress={handleResetPassword}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>Opdater adgangskode</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#3F7FC4',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  backButton: {
    marginBottom: 18,
  },
  backText: {
    fontSize: 16,
    color: '#3F7FC4',
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 22,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#b42318',
  },
  fieldError: {
    marginTop: -4,
    marginBottom: 10,
    color: '#b42318',
    fontSize: 13,
  },
  generalError: {
    color: '#b42318',
    fontSize: 14,
    marginBottom: 12,
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: '#3F7FC4',
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
