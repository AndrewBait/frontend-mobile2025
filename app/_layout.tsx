import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { CartProvider } from '../contexts/CartContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="light" />
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
            // Ensure index screen can be rendered when navigating from groups
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
  );
}

