import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { activateUser } from '@/lib/api';

export default function ActivationCodeScreen() {

  const router = useRouter(); // navigation
  const { userId } = useLocalSearchParams<{ userId?: string }>();

  // Kamera permission
  const [permission, requestPermission] = useCameraPermissions();

  // States
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Starter scanning
  const handleStartScan = async () => {
    setFeedbackMessage(null);
    setErrorMessage(null);

    // QR virker ikke i web
    if (Platform.OS === 'web') {
      setErrorMessage('QR virker kun på mobil (Expo Go)');
      return;
    }

    // Spørger om kameraadgang
    const currentPermission = permission?.granted ? permission : await requestPermission();

    if (!currentPermission.granted) {
      setErrorMessage('Giv adgang til kamera');
      return;
    }

    setIsScannerVisible(true);
  };

  // Når QR kode bliver scannet
  const handleBarCodeScanned = ({ data }: { data: string }) => {

    // Stopper hvis allerede scannet
    if (!data || scannedCode) return;

    setScannedCode(data);
    setIsScannerVisible(false);

    setFeedbackMessage('QR-kode scannet');
    setErrorMessage(null);
  };

  // Sender til backend (aktivering)
  const handleActivate = async () => {

    setErrorMessage(null);
    setFeedbackMessage(null);

    if (!userId) {
      setErrorMessage('Bruger mangler');
      return;
    }

    if (!scannedCode) {
      setErrorMessage('Scan QR først');
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await activateUser({
      userId: Number(userId),
      code: scannedCode,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    // Success → videre til login
    if (data?.activated) {
      setFeedbackMessage('Konto oprettet ✔');

      setTimeout(() => {
        router.replace('/login');
      }, 800);
    }
  };

  return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>

          {/* 🔹 HEADER */}
          <Text style={styles.appTitle}>Scan QR-koden</Text>
          <Text style={styles.subtitle}>
            Scan din aktiveringskode for at aktivere din konto
          </Text>

          {/* 🔹 SCANNER BOX */}
          <View style={styles.previewArea}>

            {isScannerVisible ? (
                <CameraView
                    style={styles.camera}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={handleBarCodeScanned}
                />
            ) : (
                <View style={styles.placeholder}>
                  <MaterialIcons name="qr-code-2" size={100} color="#9CA3AF" />
                </View>
            )}

          </View>

          {/* 🔹 SCAN BUTTON */}
          <TouchableOpacity
              style={styles.scanButton}
              onPress={handleStartScan}
          >
            <MaterialIcons name="qr-code-scanner" size={18} color="#3F7FC4" />
            <Text style={styles.scanText}>
              {scannedCode ? 'Scannet' : 'Scan QR-kode'}
            </Text>
          </TouchableOpacity>

          {/* 🔹 FEEDBACK */}
          {feedbackMessage && (
              <Text style={styles.success}>{feedbackMessage}</Text>
          )}

          {errorMessage && (
              <Text style={styles.error}>{errorMessage}</Text>
          )}

          {/* 🔹 CREATE BUTTON */}
          <TouchableOpacity
              style={[
                styles.createButton,
                (!scannedCode || isSubmitting) && styles.disabled,
              ]}
              onPress={handleActivate}
              disabled={!scannedCode || isSubmitting}
          >
            {isSubmitting ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.createText}>Opret konto</Text>
            )}
          </TouchableOpacity>

        </View>
      </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  container: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    justifyContent: 'center',
  },

  appTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },

  subtitle: {
    color: '#6B7280',
    marginBottom: 30,
  },

  previewArea: {
    width: 300,
    height: 300,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    elevation: 4,
  },

  camera: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },

  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },

  scanText: {
    color: '#3F7FC4',
    fontWeight: '600',
  },

  success: {
    color: '#16A34A',
    marginBottom: 10,
  },

  error: {
    color: '#B42318',
    marginBottom: 10,
  },

  createButton: {
    width: '100%',
    backgroundColor: '#3F7FC4',
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
  },

  disabled: {
    opacity: 0.6,
  },

  createText: {
    color: '#fff',
    fontWeight: '700',
  },
});
