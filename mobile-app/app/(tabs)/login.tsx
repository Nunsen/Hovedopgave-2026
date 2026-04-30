import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { loginUser, LoginUserPayload } from '@/lib/api';

type FieldErrors = Partial<Record<keyof LoginUserPayload, string>>;

export default function LoginScreen() {
  const router = useRouter();
  const [form, setForm] = useState<LoginUserPayload>({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof LoginUserPayload, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setFieldErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  };

  const validateClientSide = () => {
    const nextErrors: FieldErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = 'Email er obligatorisk.';
    }

    if (!form.password.trim()) {
      nextErrors.password = 'Adgangskode er obligatorisk.';
    }

    return nextErrors;
  };

  const handleLogin = async () => {
    console.log('LOGIN START');

    setGeneralError(null);
    const nextErrors = validateClientSide();

    if (Object.keys(nextErrors).length > 0) {
      console.log('VALIDATION FAILED', nextErrors);
      setFieldErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);

    console.log('CALLING API');

    const result = await loginUser(form);

    console.log('API RESULT', result);

    setIsSubmitting(false);

    if (result.error) {
      console.log('ERROR', result.error);
      setGeneralError(result.error.message);
      Alert.alert('Login failed', result.error.message);
      return;
    }

    if (result.data) {
      //Alert.alert(
      //    'Login debug',
      //    `Email: ${result.data.email}\nRole: ${result.data.role ?? 'UNDEFINED'}`
      //);
      const nextRoute = result.data.role === 'ADMIN' ? '/admin' : '/home';
      router.replace(nextRoute);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>Soranernes Hus</Text>
        <Text style={styles.subtitle}>Booking, fællesskab og overblik</Text>

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
          placeholder="Password"
          placeholderTextColor="#8A8A8A"
          secureTextEntry
          style={[styles.input, fieldErrors.password ? styles.inputError : null]}
          value={form.password}
          onChangeText={(value) => updateField('password', value)}
        />
        {fieldErrors.password ? (
          <Text style={styles.fieldError}>{fieldErrors.password}</Text>
        ) : null}

        <TouchableOpacity onPress={() => router.push('/resetPassword')}>
          <Text style={styles.forgot}>Glemt adgangskode?</Text>
        </TouchableOpacity>
        {generalError ? <Text style={styles.generalError}>{generalError}</Text> : null}


        <TouchableOpacity
          style={[styles.loginButton, isSubmitting ? styles.buttonDisabled : null]}
          activeOpacity={0.8}
          onPress={handleLogin}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerButton}
          activeOpacity={0.8}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.registerText}>Opret en konto</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.testButton}
          activeOpacity={0.8}
          onPress={() => router.push('/home')}
        >
          <Text style={styles.testButtonText}>Test forside</Text>
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
    alignItems: 'center',
  },
  inner: {
    width: '82%',
    alignItems: 'center',
  },
  logo: {
    width: 185,
    height: 185,
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 34,
    textAlign: 'center',
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
    width: '100%',
    marginTop: -4,
    marginBottom: 10,
    color: '#b42318',
    fontSize: 13,
  },
  forgot: {
    fontSize: 13,
    color: '#3F7FC4',
    marginBottom: 18,
    marginTop: 2,
  },
  generalError: {
    width: '100%',
    color: '#b42318',
    fontSize: 14,
    marginBottom: 10,
  },
  debugText: {
    width: '100%',
    color: '#666',
    fontSize: 12,
    marginBottom: 16,
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#3F7FC4',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  registerButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#3F7FC4',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
  },
  registerText: {
    color: '#3F7FC4',
    fontSize: 17,
    fontWeight: '700',
  },
  testButton: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  testButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
});
