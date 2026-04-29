import { Link } from 'expo-router';
import { useRouter } from 'expo-router';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter(); // ✅ THIS LINE FIXES IT

  return (
      <SafeAreaView style={styles.container}>
        <View style={styles.inner}>
          <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
          />

          <TextInput placeholder="Username" placeholderTextColor="#777" style={styles.input} />

          <TextInput
              placeholder="Password"
              placeholderTextColor="#777"
              secureTextEntry
              style={styles.input}
          />

          <Text style={styles.forgot}>Forgot Password?</Text>

          <TouchableOpacity style={styles.loginButton} activeOpacity={0.8}>
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
              style={styles.registerButton}
              activeOpacity={0.8}
              onPress={() => router.push('/register')}
          >
            <Text style={styles.registerText}>Opret en konto</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
  );
}

//LOGIN STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  inner: {
    width: '80%',
    alignItems: 'center',
  },

  logo: {
    width: 150,
    height: 150,
    marginBottom: 40,
  },

  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#555',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 14,
    backgroundColor: '#fff',
    fontSize: 16,
  },

  forgot: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
  },

  loginButton: {
    width: '100%',
    backgroundColor: '#3aa6c1',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 16,
  },

  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  registerButton: {
    width: '100%',
    backgroundColor: '#3aa6c1',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },

  registerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});