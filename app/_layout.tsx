import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { SessionExpiredModalHost } from '@/components/feedback/SessionExpiredModalHost';
import { ToastHost } from '@/components/feedback/ToastHost';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { AppState } from 'react-native';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
    },
  },
});

export default function RootLayout() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });

    return () => subscription.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <StatusBar style="light" />
          <SessionExpiredModalHost />
          <ToastHost />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0F0F23' },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                presentation: 'card',
              }}
            />
            <Stack.Screen name="select-role" />
            <Stack.Screen name="(customer)" />
            <Stack.Screen name="(merchant)" />
            <Stack.Screen name="product/[id]" />
            <Stack.Screen name="checkout/[storeId]" />
            <Stack.Screen name="order/[id]" />
          </Stack>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
