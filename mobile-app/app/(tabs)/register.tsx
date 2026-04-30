// Importerer router, så vi kan navigere mellem sider
import { useRouter } from 'expo-router';

// Importerer useState, som bruges til at gemme og ændre data i komponenten
import { useState } from 'react';

// Import af UI-komponenter fra React Native
import {
  ActivityIndicator, // Loader/spinner mens brugeren oprettes
  Alert,             // Viser en popup-besked ved fejl
  SafeAreaView,      // Sikrer at indhold ikke rammer statusbar/notch
  ScrollView,        // Gør siden scroll-bar, hvis der er meget indhold
  StyleSheet,        // Bruges til styling
  Text,              // Viser tekst
  TextInput,         // Inputfelter
  TouchableOpacity,  // Klikbare knapper
  View,              // Container/indpakning
} from 'react-native';

// Importerer typen for brugerdata og funktionen til at oprette bruger
import { useAuth } from '@/context/AuthContext';
import { RegisterUserPayload, registerUser } from '@/lib/api';

// Type til fejlbeskeder på de enkelte felter
type FieldErrors = Partial<Record<keyof RegisterUserPayload, string>>;

// Startværdi for formularen
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
  const { setPendingActivationUser } = useAuth();

  // State til alle formularfelter
  const [form, setForm] = useState<RegisterUserPayload>(initialForm);

  // State til fejlbeskeder på specifikke felter
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // State til en generel fejlbesked
  const [generalError, setGeneralError] = useState<string | null>(null);

  // State der viser om formularen er ved at blive sendt
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Opdaterer et bestemt felt i formularen
  const updateField = (field: keyof RegisterUserPayload, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));

    // Fjerner fejlbeskeden fra feltet, når brugeren retter i det
    setFieldErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  };

  // Validerer formularen lokalt inden data sendes til backend
  const validateClientSide = () => {
    const nextErrors: FieldErrors = {};

    // Tjekker om alle felter er udfyldt
    (Object.keys(form) as (keyof RegisterUserPayload)[]).forEach((field) => {
      if (!form[field].trim()) {
        nextErrors[field] = 'Dette felt er obligatorisk.';
      }
    });

    // Tjekker om email har korrekt format
    if (form.email && !/^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(form.email)) {
      nextErrors.email = 'Indtast en gyldig email.';
    }

    // Tjekker om fødselsdato har formatet YYYY-MM-DD
    if (form.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate)) {
      nextErrors.birthDate = 'Brug formatet AAAA-MM-DD.';
    }

    // Tjekker at password er mindst 8 tegn
    if (form.password && form.password.length < 8) {
      nextErrors.password = 'Adgangskoden skal mindst være 8 tegn.';
    }

    // Tjekker at password og gentaget password matcher
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Adgangskoderne matcher ikke.';
    }

    // Returnerer alle fejl
    return nextErrors;
  };

  // Kører når brugeren trykker på knappen
  const handleSubmit = async () => {
    setGeneralError(null);

    // Validerer formularen før API-kald
    const nextErrors = validateClientSide();

    // Hvis der er fejl, vises de og funktionen stopper
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    // Starter loading-state
    setIsSubmitting(true);

    // Sender brugerdata til backend
    const { data, error } = await registerUser(form);

    // Stopper loading-state
    setIsSubmitting(false);

    // Hvis backend returnerer fejl, vises de
    if (error) {
      setFieldErrors(error.fieldErrors ?? {});
      setGeneralError(error.message);
      Alert.alert('Kunne ikke oprette bruger', error.message);
      return;
    }

    // Hvis brugeren oprettes korrekt, navigeres der videre til aktiveringssiden
    if (data) {
      await setPendingActivationUser({
        userId: data.userId,
        fullName: data.fullName,
        email: data.email,
      });
      router.push('/activation-code');
    }
  };

  // Funktion til tilbage-knappen
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

          {/* Tilbage-knap */}
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>Tilbage</Text>
          </TouchableOpacity>


          {/* Formular-container */}
          <View style={styles.card}>

            <Text style={styles.cardTitle}>Opret konto</Text>
            <Text style={styles.cardDescription}>
              Udfyld dine oplysninger for at fortsætte til aktivering.
            </Text>

            {/* Genbrugelige inputfelter */}
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
                label="Fødselsdato"
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
                label="Bekræft adgangskode"
                placeholder="Gentag adgangskoden"
                value={form.confirmPassword}
                onChangeText={(value) => updateField('confirmPassword', value)}
                secureTextEntry
                error={fieldErrors.confirmPassword}
            />

            {/* Viser generel fejlbesked */}
            {generalError ? <Text style={styles.generalError}>{generalError}</Text> : null}

            {/* Submit-knap */}
            <TouchableOpacity
                style={[styles.submitButton, isSubmitting ? styles.submitButtonDisabled : null]}
                activeOpacity={0.9}
                onPress={handleSubmit}
                disabled={isSubmitting}
            >
              {isSubmitting ? (
                  // Viser spinner mens data sendes
                  <ActivityIndicator color="#ffffff" />
              ) : (
                  <Text style={styles.submitButtonText}>Næste: Scan aktiveringskode</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
  );
}

// Type for props til FormField-komponenten
type FormFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void; // Funktion der kaldes når brugeren skriver
  error?: string; // Valgfri fejlbesked
  keyboardType?: 'default' | 'email-address' | 'phone-pad'; // Type tastatur
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'; // Automatisk stort bogstav
  secureTextEntry?: boolean; // Skjuler tekst, bruges til password
};

// Genbrugelig input-komponent
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
            placeholderTextColor="#8A8A8A"
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            secureTextEntry={secureTextEntry}
        />

        {/* Viser fejl under feltet, hvis der findes en fejl */}
        {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#F5F7FA',
  },

  backButton: {
    marginBottom: 18,
  },

  backText: {
    fontSize: 16,
    color: '#3F7FC4',
    fontWeight: '700',
  },

  header: {
    alignItems: 'center',
    marginBottom: 22,
  },

  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'center',
  },

  appSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 310,
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

  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },

  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },

  fieldWrapper: {
    marginBottom: 16,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 7,
  },

  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },

  inputError: {
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

  debugText: {
    marginBottom: 12,
    color: '#6B7280',
    fontSize: 12,
  },

  submitButton: {
    marginTop: 8,
    backgroundColor: '#3F7FC4',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
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
