import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function ActivationCodeScreen() {
  const { fullName, email } = useLocalSearchParams<{ fullName?: string; email?: string }>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.kicker}>Naeste trin</Text>
        <Text style={styles.title}>Scan aktiveringskode</Text>
        <Text style={styles.description}>
          Brugeren er oprettet for {fullName ?? 'beboeren'} ({email ?? 'ukendt email'}). Herfra kan
          scanning eller manuel indtastning af aktiveringskode implementeres i næste user story.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f0e8',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#9a6b39',
    marginBottom: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  description: {
    fontSize: 17,
    lineHeight: 26,
    color: '#4b5563',
  },
});
