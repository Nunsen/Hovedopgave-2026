import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAuth } from '@/context/AuthContext';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return <Redirect href={user.role === 'ADMIN' ? '/admin' : '/home'} />;
}
