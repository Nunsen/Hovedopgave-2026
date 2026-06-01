import {MaterialIcons} from '@expo/vector-icons';
import {CameraView, useCameraPermissions} from 'expo-camera';
import {useRouter} from 'expo-router';
import {useState} from 'react';

import {ActivityIndicator, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View,} from 'react-native';

import {useAuth} from '@/context/AuthContext';
import {activateUser} from '@/lib/api';

export default function ActivationCodeScreen() {
    const router = useRouter();
    const {clearPendingActivationUser, login, pendingActivationUser} = useAuth();

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
            setErrorMessage('QR virker kun på mobil (Expo Go)');
            return;
        }

        const currentPermission = permission?.granted ? permission : await requestPermission();

        if (!currentPermission.granted) {
            setErrorMessage('Giv adgang til kamera');
            return;
        }

        setIsScannerVisible(true);
    };

    const handleBarCodeScanned = ({data}: { data: string }) => {
        if (!data || scannedCode) {
            return;
        }

        setScannedCode(data);
        setIsScannerVisible(false);
        setFeedbackMessage('QR-kode scannet');
        setErrorMessage(null);
    };

    const handleActivate = async () => {
        setErrorMessage(null);
        setFeedbackMessage(null);

        if (!pendingActivationUser) {
            setErrorMessage('Bruger mangler');
            return;
        }

        if (!scannedCode) {
            setErrorMessage('Scan QR foerst');
            return;
        }

        setIsSubmitting(true);

        const {data, error} = await activateUser({
            userId: pendingActivationUser.userId,
            code: scannedCode,
        });

        setIsSubmitting(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        if (data?.activated) {
            setFeedbackMessage('Konto oprettet');

            setTimeout(async () => {
                await login({
                    userId: data.userId,
                    fullName: data.fullName,
                    email: data.email,
                    role: data.role,
                    message: data.message,
                });
                await clearPendingActivationUser();
                router.replace(data.role === 'ADMIN' ? '/admin' : '/home');
            }, 800);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Text style={styles.appTitle}>Scan QR-koden</Text>
                <Text style={styles.subtitle}>
                    Scan din aktiveringskode for at aktivere din konto
                </Text>

                <View style={styles.previewArea}>
                    {isScannerVisible ? (
                        <CameraView
                            style={styles.camera}
                            barcodeScannerSettings={{barcodeTypes: ['qr']}}
                            onBarcodeScanned={handleBarCodeScanned}
                        />
                    ) : (
                        <View style={styles.placeholder}>
                            <MaterialIcons name="qr-code-2" size={100} color="#9CA3AF"/>
                        </View>
                    )}
                </View>

                <TouchableOpacity style={styles.scanButton} onPress={handleStartScan}>
                    <MaterialIcons name="qr-code-scanner" size={18} color="#3F7FC4"/>
                    <Text style={styles.scanText}>{scannedCode ? 'Scannet' : 'Scan QR-kode'}</Text>
                </TouchableOpacity>

                {feedbackMessage ? <Text style={styles.success}>{feedbackMessage}</Text> : null}
                {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

                <TouchableOpacity
                    style={[styles.createButton, (!scannedCode || isSubmitting) && styles.disabled]}
                    onPress={handleActivate}
                    disabled={!scannedCode || isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#fff"/>
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
