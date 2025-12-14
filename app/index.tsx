import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Image, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { GradientBackground } from '../components/GradientBackground';
import { Colors } from '../constants/Colors';
import { supabase, getSession } from '../services/supabase';
import { api } from '../services/api';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        checkExistingSession();
    }, []);

    const checkExistingSession = async () => {
        try {
            const session = await getSession();
            if (session) {
                await redirectToApp();
            }
        } catch (error) {
            console.error('Error checking session:', error);
        } finally {
            setChecking(false);
        }
    };

    const redirectToApp = async () => {
        try {
            console.log('Checking user role from backend...');
            const user = await api.getMe();
            console.log('User role:', user?.role);

            const role = user?.role;

            if (role === 'customer') {
                console.log('Redirecting to customer dashboard');
                router.replace('/(customer)');
            } else if (role === 'store_owner' || role === 'merchant') {
                console.log('Redirecting to merchant dashboard');
                router.replace('/(merchant)');
            } else {
                console.log('No role found, going to select-role');
                router.replace('/select-role');
            }
        } catch (error) {
            console.error('Error getting user, going to select-role:', error);
            router.replace('/select-role');
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const redirectUrl = Linking.createURL('auth/callback');
            console.log('Redirect URL:', redirectUrl);

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });

            if (error) throw error;

            if (data.url) {
                const result = await WebBrowser.openAuthSessionAsync(
                    data.url,
                    redirectUrl
                );

                console.log('Browser result type:', result.type);

                if (result.type === 'success' && result.url) {
                    console.log('Result URL:', result.url);

                    const hashIndex = result.url.indexOf('#');
                    if (hashIndex !== -1) {
                        const hashPart = result.url.substring(hashIndex + 1);
                        const params = new URLSearchParams(hashPart);

                        const accessToken = params.get('access_token');
                        const refreshToken = params.get('refresh_token');

                        console.log('Tokens found:', !!accessToken, !!refreshToken);

                        if (accessToken && refreshToken) {
                            console.log('Setting session...');

                            try {
                                // Set session first
                                const { error: sessionError } = await supabase.auth.setSession({
                                    access_token: accessToken,
                                    refresh_token: refreshToken,
                                });

                                if (sessionError) {
                                    console.error('Session error:', sessionError);
                                }

                                console.log('Session set, checking user role...');

                                // Always check role and redirect appropriately
                                await redirectToApp();
                            } catch (e) {
                                console.error('Session exception:', e);
                                // Even on error, try to redirect
                                await redirectToApp();
                            }
                            return;
                        }
                    }
                }

                if (result.type !== 'cancel') {
                    Alert.alert('Erro', 'Não foi possível completar o login. Tente novamente.');
                }
            }
        } catch (error: any) {
            console.error('Login error:', error);
            Alert.alert('Erro', error.message || 'Não foi possível fazer login. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <GradientBackground>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Verificando sessão...</Text>
                </View>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoGlow} />
                        <Ionicons name="leaf" size={56} color={Colors.success} />
                    </View>
                    <Text style={styles.appName}>VenceJá</Text>
                    <Text style={styles.title}>Economize até 95%</Text>
                    <Text style={styles.subtitle}>
                        Compre produtos perto do vencimento{'\n'}com descontos incríveis
                    </Text>
                </View>

                <View style={styles.features}>
                    <View style={styles.featureItem}>
                        <View style={[styles.featureIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                            <Ionicons name="pricetag" size={24} color={Colors.success} />
                        </View>
                        <View style={styles.featureText}>
                            <Text style={styles.featureTitle}>Até 95% de desconto</Text>
                            <Text style={styles.featureDesc}>Produtos próximos do vencimento</Text>
                        </View>
                    </View>

                    <View style={styles.featureItem}>
                        <View style={[styles.featureIcon, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                            <Ionicons name="location" size={24} color={Colors.primary} />
                        </View>
                        <View style={styles.featureText}>
                            <Text style={styles.featureTitle}>Retire na loja</Text>
                            <Text style={styles.featureDesc}>Pague via PIX e retire em até 2h</Text>
                        </View>
                    </View>

                    <View style={styles.featureItem}>
                        <View style={[styles.featureIcon, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                            <Ionicons name="earth" size={24} color={Colors.secondary} />
                        </View>
                        <View style={styles.featureText}>
                            <Text style={styles.featureTitle}>Ajude o planeta</Text>
                            <Text style={styles.featureDesc}>Evite o desperdício de alimentos</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                        style={[styles.googleButton, loading && styles.buttonDisabled]}
                        onPress={handleGoogleLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#1F1F1F" size="small" />
                        ) : (
                            <>
                                <Image
                                    source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                                    style={styles.googleIcon}
                                />
                                <Text style={styles.googleButtonText}>Continuar com Google</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.demoButton}
                        onPress={() => router.replace('/select-role')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="flask" size={20} color={Colors.primary} />
                        <Text style={styles.demoButtonText}>Entrar em Modo Demo</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Ao continuar, você concorda com nossos{' '}
                        <Text style={styles.footerLink}>Termos de Uso</Text>
                        {' '}e{' '}
                        <Text style={styles.footerLink}>Política de Privacidade</Text>
                    </Text>
                </View>
            </View>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: height * 0.06,
        paddingBottom: 32,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    loadingText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoContainer: {
        width: 110,
        height: 110,
        borderRadius: 36,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    logoGlow: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: Colors.success,
        opacity: 0.15,
    },
    appName: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.success,
        marginBottom: 8,
        letterSpacing: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    features: {
        marginBottom: 32,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.glass,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        padding: 16,
        marginBottom: 12,
    },
    featureIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    featureDesc: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    buttonsContainer: {
        marginTop: 'auto',
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    googleIcon: {
        width: 24,
        height: 24,
        marginRight: 12,
    },
    googleButtonText: {
        color: '#1F1F1F',
        fontSize: 16,
        fontWeight: '600',
    },
    demoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: 16,
        paddingVertical: 14,
        marginTop: 12,
        gap: 8,
    },
    demoButtonText: {
        color: Colors.primary,
        fontSize: 15,
        fontWeight: '600',
    },
    footer: {
        marginTop: 20,
    },
    footerText: {
        color: Colors.textMuted,
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
    footerLink: {
        color: Colors.primary,
    },
});
