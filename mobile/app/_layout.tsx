import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { Colors } from '../src/constants/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" backgroundColor={Colors.background} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="climb/[id]" options={{ presentation: 'card', headerShown: false }} />
            <Stack.Screen name="route/[id]" options={{ presentation: 'card', headerShown: false }} />
            <Stack.Screen name="gym/[id]" options={{ presentation: 'card', headerShown: false }} />
            <Stack.Screen name="profile/[id]" options={{ presentation: 'card', headerShown: false }} />
            <Stack.Screen name="notifications" options={{ presentation: 'card', headerShown: false }} />
            <Stack.Screen name="search" options={{ presentation: 'card', headerShown: false }} />
            <Stack.Screen name="settings/index" options={{ presentation: 'card', headerShown: false }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
