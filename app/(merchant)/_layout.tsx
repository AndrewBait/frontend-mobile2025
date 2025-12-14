import { Ionicons } from '@expo/vector-icons';
import { Tabs, router, usePathname } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';

// Module-level flag to persist across remounts (last resort)
let globalRedirectInProgress = false;

export default function MerchantLayout() {
    const { session, loading, isLoggingOut } = useAuth();
    const pathname = usePathname();
    const hasRedirectedRef = useRef(false);
    const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    // Redirect to login if no session (after logging out)
    useEffect(() => {
        // Check if component is still mounted
        isMountedRef.current = true;

        console.log('[MerchantLayout] useEffect triggered:', {
            hasSession: !!session,
            loading,
            isLoggingOut,
            pathname,
            hasRedirected: hasRedirectedRef.current,
            globalRedirectInProgress
        });

        // Reset redirect flag when session is restored
        if (session) {
            if (hasRedirectedRef.current) {
                console.log('[MerchantLayout] Session restored, resetting redirect flags');
                hasRedirectedRef.current = false;
                globalRedirectInProgress = false;
            }
            // Clear any pending redirect
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
                redirectTimeoutRef.current = null;
            }
            return;
        }

        // Only redirect if we're actually on a merchant route, not on login/auth pages
        const isLoginPage = pathname === '/' || pathname === '/index' || pathname === '/auth/callback' || pathname === '/select-role';
        if (isLoginPage) {
            console.log('[MerchantLayout] Already on login/auth page, skipping redirect. Pathname:', pathname);
            return;
        }

        // Only redirect once to prevent infinite loops
        if (!loading && !session && !isLoggingOut && !hasRedirectedRef.current && !globalRedirectInProgress) {
            console.log('[MerchantLayout] No session detected, preparing redirect to login...');
            hasRedirectedRef.current = true;
            globalRedirectInProgress = true;
            
            // Clear any existing timeout
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
            }
            
            // Use setTimeout to ensure we're not in the middle of a render
            redirectTimeoutRef.current = setTimeout(() => {
                if (isMountedRef.current && !session) {
                    console.log('[MerchantLayout] Executing redirect to login from pathname:', pathname);
                    try {
                        router.replace('/');
                        // Reset flags after a delay to allow navigation
                        setTimeout(() => {
                            globalRedirectInProgress = false;
                        }, 1000);
                    } catch (error) {
                        console.error('[MerchantLayout] Error during redirect:', error);
                        globalRedirectInProgress = false;
                        hasRedirectedRef.current = false;
                    }
                } else {
                    console.log('[MerchantLayout] Component unmounted or session restored, canceling redirect');
                    globalRedirectInProgress = false;
                    hasRedirectedRef.current = false;
                }
                redirectTimeoutRef.current = null;
            }, 100);
        }

        // Cleanup timeout on unmount
        return () => {
            isMountedRef.current = false;
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
                redirectTimeoutRef.current = null;
            }
        };
    }, [session, loading, isLoggingOut, pathname]);

    // Show loading while checking auth
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
                <ActivityIndicator size="large" color={Colors.secondary} />
            </View>
        );
    }

    // Don't render tabs if logging out (show loading instead)
    if (isLoggingOut) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
                <ActivityIndicator size="large" color={Colors.secondary} />
            </View>
        );
    }

    // 🔍 DEBUG: Log render decision
    const isLoginPage = pathname === '/' || pathname === '/index' || pathname === '/auth/callback' || pathname === '/select-role';
    console.log('🎨 [MerchantLayout] Render decision:', {
        hasSession: !!session,
        pathname,
        isLoginPage,
        loading,
        isLoggingOut,
        shouldRender: session && !isLoginPage
    });

    // Only block rendering if we have NO session AND we're on login/auth pages
    // If we have a session, always allow rendering (even if pathname is temporarily '/')
    if (!session && isLoginPage) {
        // No session and on login page - return null so Expo Router can render LoginScreen
        console.log('✅ [MerchantLayout] No session + login page = returning null (Expo Router should render LoginScreen)');
        // Return null to allow Stack to render the index.tsx (LoginScreen)
        return null;
    }
    
    // If no session but not on login page, show loading (will redirect)
    if (!session) {
        console.log('⏳ [MerchantLayout] No session but not on login page = showing loading');
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
                <ActivityIndicator size="large" color={Colors.secondary} />
            </View>
        );
    }
    
    console.log('✅ [MerchantLayout] Rendering tabs - has session and should show dashboard');

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
                tabBarActiveTintColor: Colors.secondary,
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
