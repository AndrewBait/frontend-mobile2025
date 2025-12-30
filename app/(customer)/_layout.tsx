import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

export default function CustomerLayout() {
    const { session, loading } = useAuth();

    // REMOVIDO: useEffect com router.replace('/')
    // Motivo: O RootLayout vai desmontar este componente quando a sessão for null.
    // Tentar navegar aqui causa conflito e tela branca/azul.

    // Show loading while checking auth
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    // Se a sessão caiu, mostre apenas um loading enquanto o RootLayout processa o unmount.
    if (!session) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F23' }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.backgroundCard,
                    borderTopColor: Colors.glassBorder,
                    borderTopWidth: 1,
                    height: 85,
                    paddingBottom: 25,
                    paddingTop: 10,
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textMuted,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Vitrine',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="storefront" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="favorites"
                options={{
                    title: 'Favoritos',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="heart" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="store-products"
                options={{
                    title: 'Lojas',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="business" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="cart"
                options={{
                    title: 'Carrinho',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="cart" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: 'Pedidos',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="receipt" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Perfil',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
            {/* Tela modal - não aparece na navbar */}
            <Tabs.Screen
                name="setup"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
        </Tabs>
    );
}
