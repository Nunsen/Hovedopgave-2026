import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack initialRouteName="login">
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="resetPassword" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen
        name="activation-code"
        options={{ title: 'Aktiveringskode', headerBackTitle: 'Tilbage' }}
      />
      <Stack.Screen name="home" options={{ headerShown: false }} />
      <Stack.Screen name="book-washing" options={{ headerShown: false }} />
      <Stack.Screen name="book-partyroom" options={{ headerShown: false }} />
      <Stack.Screen name="chat" options={{ headerShown: false }} />
      <Stack.Screen name="my-bookings" options={{ headerShown: false }} />
      <Stack.Screen name="new-post" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="post/[postId]" options={{ headerShown: false }} />
    </Stack>
  );
}
