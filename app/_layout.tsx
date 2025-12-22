import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { SessionExpiredModalHost } from '@/components/feedback/SessionExpiredModalHost';
import { ToastHost } from '@/components/feedback/ToastHost';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Sentry from 'sentry-expo';

// Observabilidade (Sentry) - opcional
// Configure `EXPO_PUBLIC_SENTRY_DSN` via `.env`/EAS Secrets.
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    enableInExpoDevelopment: false,
    debug: __DEV__,
    environment:
      process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ||
      process.env.NODE_ENV ||
      'development',
    tracesSampleRate: Number.parseFloat(
      process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0',
    ),
  });
}

// Segurança: evita vazamento de dados sensíveis em logs de produção.
if (!__DEV__) {
  console.log = () => undefined;
  console.debug = () => undefined;
  console.info = () => undefined;
}

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
            <Stack.Screen name="onboarding" />
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
