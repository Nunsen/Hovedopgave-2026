import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { RegisterUserPayload, registerUser } from '@/lib/api';

type FieldErrors = Partial<Record<keyof RegisterUserPayload, string>>;

const initialForm: RegisterUserPayload = {
  fullName: '',
  email: '',
  phoneNumber: '',
  birthDate: '',
  apartmentNumber: '',
  password: '',
  confirmPassword: '',
};

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterUserPayload>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof RegisterUserPayload, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setFieldErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  };

  const validateClientSide = () => {
    const nextErrors: FieldErrors = {};

    (Object.keys(form) as (keyof RegisterUserPayload)[]).forEach((field) => {
      if (!form[field].trim()) {
        nextErrors[field] = 'Dette felt er obligatorisk.';
      }
    });

    if (form.email && !/^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(form.email)) {
      nextErrors.email = 'Indtast en gyldig email.';
    }

    if (form.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate)) {
      nextErrors.birthDate = 'Brug formatet AAAA-MM-DD.';
    }

    if (form.password && form.password.length < 8) {
      nextErrors.password = 'Adgangskoden skal mindst vaere 8 tegn.';
    }

    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Adgangskoderne matcher ikke.';
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

    setIsSubmitting(true);
    const { data, error } = await registerUser(form);
    setIsSubmitting(false);

    if (error) {
      setFieldErrors(error.fieldErrors ?? {});
      setGeneralError(error.message);
      return;
    }

    if (data) {
      router.push({
        pathname: '/activation-code',
        params: {
          fullName: data.fullName,
          email: data.email,
        },
      });
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/login');
    }
  };

  return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>

          {/* 🔙 Back Button */}
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>← Tilbage</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.kicker}>A1 Opret bruger</Text>
            <Text style={styles.title}>Personlig info</Text>
            <Text style={styles.description}>
              Udfyld dine oplysninger for at komme videre til scanning af aktiveringskode.
            </Text>
          </View>

          <View style={styles.card}>
            <FormField
                label="Fulde navn"
                placeholder="Fx Anna Jensen"
                value={form.fullName}
                onChangeText={(value) => updateField('fullName', value)}
                error={fieldErrors.fullName}
            />
            <FormField
                label="Email"
                placeholder="anna@eksempel.dk"
                value={form.email}
                onChangeText={(value) => updateField('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                error={fieldErrors.email}
            />
            <FormField
                label="Telefonnummer"
                placeholder="12345678"
                value={form.phoneNumber}
                onChangeText={(value) => updateField('phoneNumber', value)}
                keyboardType="phone-pad"
                error={fieldErrors.phoneNumber}
            />
            <FormField
                label="Foedselsdato"
                placeholder="AAAA-MM-DD"
                value={form.birthDate}
                onChangeText={(value) => updateField('birthDate', value)}
                error={fieldErrors.birthDate}
            />
            <FormField
                label="Lejlighedsnummer"
                placeholder="Fx 2A"
                value={form.apartmentNumber}
                onChangeText={(value) => updateField('apartmentNumber', value)}
                error={fieldErrors.apartmentNumber}
            />
            <FormField
                label="Adgangskode"
                placeholder="Minimum 8 tegn"
                value={form.password}
                onChangeText={(value) => updateField('password', value)}
                secureTextEntry
                error={fieldErrors.password}
            />
            <FormField
                label="Bekraeft adgangskode"
                placeholder="Gentag adgangskoden"
                value={form.confirmPassword}
                onChangeText={(value) => updateField('confirmPassword', value)}
                secureTextEntry
                error={fieldErrors.confirmPassword}
            />

            {generalError ? <Text style={styles.generalError}>{generalError}</Text> : null}

            <TouchableOpacity
                style={[styles.submitButton, isSubmitting ? styles.submitButtonDisabled : null]}
                activeOpacity={0.9}
                onPress={handleSubmit}
                disabled={isSubmitting}
            >
              {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
              ) : (
                  <Text style={styles.submitButtonText}>Naeste: Scan aktiveringskode</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
  );
}

type FormFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
};

function FormField({
                     label,
                     placeholder,
                     value,
                     onChangeText,
                     error,
                     keyboardType = 'default',
                     autoCapitalize = 'sentences',
                     secureTextEntry = false,
                   }: FormFieldProps) {
  return (
      <View style={styles.fieldWrapper}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            secureTextEntry={secureTextEntry}
        />
        {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f0e8',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#f4f0e8',
  },

  backButton: {
    marginBottom: 10,
  },
  backText: {
    fontSize: 16,
    color: '#1f4d3b',
    fontWeight: '600',
  },

  header: {
    marginBottom: 20,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#9a6b39',
    marginBottom: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4b5563',
  },
  card: {
    backgroundColor: '#fffdf8',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#8d6e63',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  fieldWrapper: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d7cab7',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#b42318',
  },
  fieldError: {
    marginTop: 6,
    color: '#b42318',
    fontSize: 13,
  },
  generalError: {
    marginBottom: 14,
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: '#1f4d3b',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});