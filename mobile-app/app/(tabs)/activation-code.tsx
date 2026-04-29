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
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartScan = async () => {
    setFeedbackMessage(null);
    setErrorMessage(null);

    if (Platform.OS === 'web') {
      setErrorMessage('QR-scanning virker i Expo Go paa mobil, ikke i web-preview.');
      return;
    }

    const currentPermission = permission?.granted ? permission : await requestPermission();
    if (!currentPermission.granted) {
      setErrorMessage('Giv kameraadgang for at scanne QR-koden.');
      return;
    }

    setIsScannerVisible(true);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (!data || scannedCode) {
      return;
    }

    setScannedCode(data);
    setIsScannerVisible(false);
    setFeedbackMessage('QR-koden er scannet. Tryk paa Opret konto for at afslutte.');
    setErrorMessage(null);
  };

  const handleActivate = async () => {
    setErrorMessage(null);
    setFeedbackMessage(null);

    if (!userId) {
      setErrorMessage('Bruger-id mangler. Start oprettelsen forfra.');
      return;
    }

    if (!scannedCode) {
      setErrorMessage('Scan QR-koden foerst.');
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await activateUser({
      userId: Number(userId),
      code: scannedCode,
    });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.fieldErrors?.code ?? error.message);
      return;
    }

    if (data?.activated) {
      setFeedbackMessage(data.message);
      setTimeout(() => {
        router.replace('/login');
      }, 900);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Scan Aktiveringskode</Text>

        <View style={styles.previewArea}>
          {isScannerVisible ? (
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarCodeScanned}
            />
          ) : (
            <View style={styles.placeholder}>
              <MaterialIcons name="qr-code-2" size={118} color="#1f1f1f" />
            </View>
          )}

          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
          <View style={styles.scanLine} />
        </View>

        <TouchableOpacity style={styles.scanButton} activeOpacity={0.85} onPress={handleStartScan}>
          <MaterialIcons name="qr-code-scanner" size={18} color="#4f4f4f" />
          <Text style={styles.scanButtonText}>
            {scannedCode ? 'QR-kode scannet' : 'Scan QR Code'}
          </Text>
        </TouchableOpacity>

        {feedbackMessage ? <Text style={styles.feedbackSuccess}>{feedbackMessage}</Text> : null}
        {errorMessage ? <Text style={styles.feedbackError}>{errorMessage}</Text> : null}

        <TouchableOpacity
          style={[
            styles.createButton,
            !scannedCode || isSubmitting ? styles.createButtonDisabled : null,
          ]}
          activeOpacity={0.85}
          onPress={handleActivate}
          disabled={!scannedCode || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.createButtonText}>Opret konto</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 110,
  },
  title: {
    alignSelf: 'flex-start',
    fontSize: 22,
    fontWeight: '500',
    color: '#111111',
    marginBottom: 48,
  },
  previewArea: {
    width: 208,
    height: 208,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    position: 'relative',
  },
  camera: {
    width: 144,
    height: 144,
    borderRadius: 8,
    overflow: 'hidden',
  },
  placeholder: {
    width: 144,
    height: 144,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#49a9d9',
  },
  cornerTopLeft: {
    top: 22,
    left: 22,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTopRight: {
    top: 22,
    right: 22,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBottomLeft: {
    bottom: 22,
    left: 22,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBottomRight: {
    bottom: 22,
    right: 22,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLine: {
    position: 'absolute',
    bottom: 38,
    width: 118,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#e16d6d',
  },
  scanButton: {
    width: '100%',
    maxWidth: 290,
    height: 38,
    borderRadius: 4,
    backgroundColor: '#d8d8d8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
  },
  scanButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4f4f4f',
  },
  feedbackSuccess: {
    marginBottom: 10,
    color: '#1f4d3b',
    fontSize: 13,
    textAlign: 'center',
  },
  feedbackError: {
    marginBottom: 10,
    color: '#b42318',
    fontSize: 13,
    textAlign: 'center',
  },
  createButton: {
    marginTop: 6,
    width: '100%',
    maxWidth: 290,
    height: 38,
    borderRadius: 4,
    backgroundColor: '#083d89',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    opacity: 0.55,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
