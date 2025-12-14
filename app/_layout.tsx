import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0F0F23' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="select-role" />
        <Stack.Screen name="(customer)" />
        <Stack.Screen name="(merchant)" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="checkout/[storeId]" />
        <Stack.Screen name="order/[id]" />
      </Stack>
    </AuthProvider>
  );
}

