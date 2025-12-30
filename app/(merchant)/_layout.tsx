import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function MerchantLayout() {
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
                tabBarActiveTintColor: Colors.primary, // Verde para consistência
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
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="analytics" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="products"
                options={{
                    title: 'Produtos',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="cube" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="sales"
                options={{
                    title: 'Vendas',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="receipt" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="sale-order/[id]"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="stores"
                options={{
                    title: 'Lojas',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="storefront" size={size} color={color} />
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
            {/* Telas modais - não aparecem na navbar */}
            <Tabs.Screen
                name="create-store"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="create-product"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}
