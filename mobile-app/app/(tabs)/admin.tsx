import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';

export default function AdminScreen() {
    const router = useRouter();
    const { isLoading, logout, user } = useAuth();

    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/login');
        }
    }, [isLoading, router, user]);

    if (!user) {
        return null;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>

                {/* BIG ADMIN LABEL */}
                <Text style={styles.adminBadge}>ADMIN PANEL</Text>

                <Text style={styles.title}>Admin Forside</Text>

                <Text style={styles.subtitle}>
                    Du er logget ind som administrator
                </Text>

                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={async () => {
                        await logout();
                        router.replace('/login');
                    }}
                >
                    <Text style={styles.logoutText}>Log ud</Text>
                </TouchableOpacity>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#2f2f2f', // 👈 DARK background so it's obvious
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    adminBadge: {
        fontSize: 18,
        fontWeight: '800',
        color: '#ff4d4d',
        marginBottom: 10,
    },

    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#ffffff', // 👈 white text
        marginBottom: 10,
    },

    subtitle: {
        fontSize: 16,
        color: '#cccccc',
        marginBottom: 30,
    },

    logoutButton: {
        backgroundColor: '#ff4d4d', // 👈 red button
        borderRadius: 18,
        paddingHorizontal: 22,
        paddingVertical: 12,
    },

    logoutText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
});
