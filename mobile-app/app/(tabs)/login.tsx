import { useRouter } from 'expo-router';

// React Native UI komponenter
import {
  SafeAreaView,     // Undgår notch/statusbar overlap
  StyleSheet,       // Styling (som CSS)
  Text,             // Tekst
  TextInput,        // Input felter
  TouchableOpacity, // Knapper
  View,             // Container (div)
  Image,            // Billede/logo
} from 'react-native';

// Login screen komponent
export default function LoginScreen() {

  // Hook til navigation (skifte mellem screens)
  const router = useRouter();

  return (
      <SafeAreaView style={styles.container}>
        <View style={styles.inner}>

          {/* Logo */}
          <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
          />

          {/* App navn */}
          <Text style={styles.title}>Soranernes Hus</Text>

          {/* Kort beskrivelse (giver identitet til appen) */}
          <Text style={styles.subtitle}>
            Booking, fællesskab og overblik
          </Text>

          {/* Email input */}
          <TextInput
              placeholder="Email"
              placeholderTextColor="#8A8A8A"
              style={styles.input}
          />

          {/* Password input */}
          <TextInput
              placeholder="Password"
              placeholderTextColor="#8A8A8A"
              secureTextEntry // Skjuler tekst (••••)
              style={styles.input}
          />

          {/* Glemt kode link (kun tekst lige nu) */}
          <Text style={styles.forgot}>
            Glemt adgangskode?
          </Text>

          {/* Login knap */}
          <TouchableOpacity
              style={styles.loginButton}
              activeOpacity={0.8} // Giver "tryk" effekt
          >
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>

          {/* Opret konto knap */}
          <TouchableOpacity
              style={styles.registerButton}
              activeOpacity={0.8}
              onPress={() => router.push('/register')} // Navigerer til register screen
          >
            <Text style={styles.registerText}>
              Opret en konto
            </Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
  );
}

// Styling (CSS-lignende)
const styles = StyleSheet.create({

  // Hele skærmen
  container: {
    flex: 1, // Fylder hele skærmen
    backgroundColor: '#fff', // Lys grå baggrund (mere moderne end helt hvid)
    justifyContent: 'center', // Centrer vertikalt
    alignItems: 'center', // Centrer horisontalt
  },

  // Wrapper til indhold
  inner: {
    width: '82%', // Begrænser bredden (bedre UX)
    alignItems: 'center',
  },

  // Logo styling
  logo: {
    width: 185,
    height: 185,
    marginBottom: 14,
  },

  // Titel (Soranernes Hus)
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },

  // Undertitel
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 34,
    textAlign: 'center',
  },

  // Input felter
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#D1D5DB', // Lysere border = mere moderne
    borderRadius: 30, // Runde hjørner
    paddingVertical: 14,
    paddingHorizontal: 22,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#111827',
  },

  // "Glemt adgangskode"
  forgot: {
    fontSize: 13,
    color: '#3F7FC4', // Klikbar farve
    marginBottom: 24,
    marginTop: 2,
  },

  // Login knap (primary)
  loginButton: {
    width: '100%',
    backgroundColor: '#3F7FC4',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 14,
  },

  // Login tekst
  loginText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  // Register knap (secondary / outline)
  registerButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#3F7FC4',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
  },

  // Register tekst
  registerText: {
    color: '#3F7FC4',
    fontSize: 17,
    fontWeight: '700',
  },
});