import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GradientBackground } from '../components/GradientBackground';
import { Colors } from '../constants/Colors';
import { API_BASE_URL } from '../constants/config';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { getSession, supabase } from '../services/supabase';
import { getGlobalRedirectInProgress, setGlobalRedirectInProgress } from '../utils/redirectLock';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const isProcessingLoginRef = React.useRef(false);
    const { session } = useAuth();

    // Monitor auth context changes - this ensures LoginScreen responds to logout
    useEffect(() => {
        console.log('🔵 [LoginScreen] Auth context session changed:', !!session);
        
        // If we're on login screen and there's no session, ensure we show the login UI
        if (!session) {
            console.log('🔵 [LoginScreen] ✅ No session in context - ensuring login screen is shown');
            if (checking) {
                console.log('🔵 [LoginScreen] Stopping check, showing login UI');
                setChecking(false);
            }
        } else if (session && !isProcessingLoginRef.current && !loading) {
            // Only redirect if we're not currently processing a login and not loading
            // This prevents race conditions with AuthCallback
            console.log('🔵 [LoginScreen] Session detected in context, but waiting for login process to complete...');
            // Don't auto-redirect here - let the login process handle it
        }
    }, [session]);

    useEffect(() => {
        console.log('🔵 [LoginScreen] Component mounted - checking session...');
        checkExistingSession();
    }, []);

    // Log every render
    console.log('🔵 [LoginScreen] RENDER - checking:', checking, 'loading:', loading, 'hasSession:', !!session);

    const checkExistingSession = async () => {
        try {
            console.log('🔵 [LoginScreen] Verificando sessão existente...');
            const currentSession = await getSession();
            console.log('🔵 [LoginScreen] Sessão encontrada:', !!currentSession);
            
            // Only redirect if we have a session and we're not currently processing a login
            // This prevents race conditions where both checkExistingSession and the login flow
            // try to redirect at the same time
            if (currentSession && !isProcessingLoginRef.current && !loading) {
                console.log('🔵 [LoginScreen] Sessão válida encontrada, mas aguardando processo de login...');
                // Don't redirect here - let the login process handle it to avoid race conditions
                setChecking(false);
            } else if (isProcessingLoginRef.current || loading) {
                console.log('🔵 [LoginScreen] Login em processamento, ignorando verificação de sessão');
            } else {
                console.log('🔵 [LoginScreen] ✅ Nenhuma sessão - LoginScreen deve ser exibido');
                setChecking(false);
            }
        } catch (error) {
            console.error('🔵 [LoginScreen] Erro ao verificar sessão:', error);
            setChecking(false);
        } finally {
            // Only set checking to false if we didn't redirect
            if (!checking) {
                console.log('🔵 [LoginScreen] Verificação de sessão concluída, checking = false');
            }
        }
    };

    const redirectToApp = async () => {
        // Prevent multiple simultaneous calls (check both local and global flags)
        const globalLock = getGlobalRedirectInProgress();
        if (isProcessingLoginRef.current || globalLock) {
            console.log('[LoginScreen] redirectToApp já em execução (local:', isProcessingLoginRef.current, 'global:', globalLock, '), ignorando...');
            console.log('[LoginScreen] Aguardando que outro processo complete o redirect...');
            // Don't return immediately - wait a bit to see if the other process completes
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Check again if we're still processing (another redirect may have happened)
            if (getGlobalRedirectInProgress()) {
                console.log('[LoginScreen] Outro processo ainda está em execução, retornando...');
                return;
            }
            // If the other process completed, try again
            console.log('[LoginScreen] Outro processo concluído, tentando novamente...');
        }

        try {
            isProcessingLoginRef.current = true;
            setGlobalRedirectInProgress(true);
            console.log('[LoginScreen] ========== REDIRECIONANDO PARA APP ==========');
            console.log('[LoginScreen] Verificando role do usuário no backend...');
            
            const startTime = Date.now();
            const user = await api.getMe();
            const duration = Date.now() - startTime;
            
            console.log('[LoginScreen] Usuário recebido em', duration, 'ms');
            console.log('[LoginScreen] Dados do usuário:', { 
                id: user?.id, 
                email: user?.email, 
                role: user?.role,
                name: user?.name,
                phone: user?.phone ? 'informado' : 'não informado'
            });

            // Validate user object
            if (!user || !user.id) {
                console.error('[LoginScreen] ⚠️ Usuário inválido ou não encontrado');
                console.log('[LoginScreen] Redirecionando para seleção de role (usuário inválido)');
                router.replace('/select-role');
                return;
            }

            const role = user?.role;
            const phoneValue = user?.phone;
            const hasPhone = phoneValue && typeof phoneValue === 'string' && phoneValue.length >= 10;
            const isProfileComplete = user?.profile_complete === true;

            console.log('[LoginScreen] Análise detalhada:', {
                role,
                roleType: typeof role,
                phoneValue: phoneValue || '(vazio/null/undefined)',
                phoneType: typeof phoneValue,
                phoneLength: phoneValue ? phoneValue.length : 0,
                hasPhone,
                isProfileComplete,
                roleIsNull: role === null,
                roleIsUndefined: role === undefined,
                roleIsFalsy: !role,
                userKeys: Object.keys(user || {})
            });

            // Check if role is empty/null/undefined - user needs to select role
            // IMPORTANTE: Só redireciona para /select-role se REALMENTE não tiver role
            // Se o usuário já tem role cadastrado, não deve ir para seleção de role
            // role é do tipo 'customer' | 'merchant' | 'store_owner' | undefined
            // Não pode ser string vazia ou 'undefined' (string), então só verificamos undefined e falsy
            const roleIsEmpty = !role || role === undefined;
            if (roleIsEmpty) {
                console.log('[LoginScreen] ⚠️ NENHUM ROLE - Redirecionando para seleção de role');
                isProcessingLoginRef.current = false;
                setGlobalRedirectInProgress(false);
                router.replace('/select-role');
                return;
            } else if (role === 'customer') {
                // IMPORTANTE: Se o backend atribuiu role "customer" automaticamente (usuário novo sem dados),
                // detectamos isso e redirecionamos para seleção de role para que o usuário possa escolher
                // Verificamos se NÃO tem telefone E NÃO tem profile_complete E parece ser um usuário recém-criado
                const seemsLikeAutoAssigned = !hasPhone && !isProfileComplete && !user?.name;
                
                if (seemsLikeAutoAssigned) {
                    console.log('[LoginScreen] ⚠️ Role "customer" parece ter sido atribuído automaticamente pelo backend');
                    console.log('[LoginScreen] Usuário novo sem dados - Redirecionando para seleção de role');
                    isProcessingLoginRef.current = false;
                    setGlobalRedirectInProgress(false);
                    router.replace('/select-role');
                    return;
                } else if (isProfileComplete || hasPhone) {
                    // Se o usuário TEM role "customer" E tem perfil completo → vai direto para dashboard
                    console.log('[LoginScreen] ✅ Consumidor com cadastro completo - Redirecionando para dashboard (ofertas)');
                    console.log('[LoginScreen] Motivo: profile_complete=' + isProfileComplete + ', hasPhone=' + hasPhone);
                    isProcessingLoginRef.current = false;
                    setGlobalRedirectInProgress(false);
                    router.replace('/(customer)');
                    return;
                } else {
                    // Tem role mas não tem dados completos (ex: cadastro parcial)
                    console.log('[LoginScreen] ⚠️ Consumidor com role mas sem dados completos - Redirecionando para setup');
                    console.log('[LoginScreen] Faltando: profile_complete=' + isProfileComplete + ', phone=' + (phoneValue || '(vazio)'));
                    isProcessingLoginRef.current = false;
                    setGlobalRedirectInProgress(false);
                    router.replace('/(customer)/setup');
                    return;
                }
            } else if (role === 'store_owner' || role === 'merchant') {
                // Para lojista, se tem role já vai direto (assumindo que lojista já tem cadastro se tem role)
                console.log('[LoginScreen] ✅ Lojista - Redirecionando para dashboard');
                // Reset flags before redirecting to ensure navigation works
                isProcessingLoginRef.current = false;
                setGlobalRedirectInProgress(false);
                router.replace('/(merchant)');
                return; // Return early after redirect
            } else {
                console.log('[LoginScreen] ⚠️ Role desconhecido:', role);
                isProcessingLoginRef.current = false;
                setGlobalRedirectInProgress(false);
                router.replace('/select-role');
                return;
            }
        } catch (error: any) {
            console.error('[LoginScreen] ========== ERRO AO REDIRECIONAR ==========');
            console.error('[LoginScreen] Tipo:', error?.constructor?.name);
            console.error('[LoginScreen] Mensagem:', error?.message);
            console.error('[LoginScreen] Stack:', error?.stack);
            
            // Check if it's a 500 error which usually means user doesn't exist in backend
            const isInternalServerError = error?.message?.includes('Internal server error') || 
                                         error?.message?.includes('API Error: 500');
            const isTimeout = error?.message?.includes('Timeout') || error?.message?.includes('Failed to fetch');
            
            if (isTimeout) {
                console.error('[LoginScreen] ⚠️ Backend não está respondendo!');
                console.error('[LoginScreen] Verifique se está rodando em:', API_BASE_URL);
                console.log('[LoginScreen] Redirecionando para seleção de role devido ao timeout');
                router.replace('/select-role');
            } else if (isInternalServerError) {
                // 500 error usually means user doesn't exist in backend (no role yet)
                console.log('[LoginScreen] ⚠️ Usuário não existe no backend (provavelmente sem role)');
                console.log('[LoginScreen] Redirecionando para seleção de role');
                router.replace('/select-role');
            } else {
                // Other errors - redirect to role selection
                console.log('[LoginScreen] Redirecionando para seleção de role devido ao erro');
                router.replace('/select-role');
            }
            // Reset flags in error cases too
            isProcessingLoginRef.current = false;
            setGlobalRedirectInProgress(false);
        } finally {
            isProcessingLoginRef.current = false;
            setGlobalRedirectInProgress(false);
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

                        console.log('[LoginScreen] Tokens encontrados:', { 
                            accessToken: !!accessToken, 
                            refreshToken: !!refreshToken 
                        });

                        if (accessToken && refreshToken) {
                            // Prevent multiple simultaneous logins
                            if (isProcessingLoginRef.current) {
                                console.log('[LoginScreen] Login já em processamento, ignorando...');
                                return;
                            }
                            
                            isProcessingLoginRef.current = true;
                            console.log('[LoginScreen] ========== TOKENS ENCONTRADOS ==========');
                            console.log('[LoginScreen] Processando tokens diretamente...');

                            try {
                                // Set session first
                                console.log('[LoginScreen] Chamando supabase.auth.setSession()...');
                                console.log('[LoginScreen] Tokens preparados - accessToken length:', accessToken.length, 'refreshToken length:', refreshToken.length);
                                
                                // Call setSession directly - it should respond quickly
                                console.log('[LoginScreen] Iniciando setSession (sem timeout)...');
                                const setSessionStartTime = Date.now();
                                
                                const setSessionResult = await supabase.auth.setSession({
                                    access_token: accessToken,
                                    refresh_token: refreshToken,
                                });
                                
                                const setSessionDuration = Date.now() - setSessionStartTime;
                                console.log('[LoginScreen] setSession completou em', setSessionDuration, 'ms');
                                console.log('[LoginScreen] setSession retornou:', {
                                    hasData: !!setSessionResult?.data,
                                    hasError: !!setSessionResult?.error,
                                    hasSession: !!setSessionResult?.data?.session,
                                    errorMessage: setSessionResult?.error?.message
                                });
                                
                                const { data: sessionData, error: sessionError } = setSessionResult;
                                
                                if (sessionError) {
                                    console.error('[LoginScreen] ERRO ao configurar sessão:', sessionError);
                                    Alert.alert('Erro', `Não foi possível configurar a sessão: ${sessionError.message}`);
                                    isProcessingLoginRef.current = false;
                                    setLoading(false);
                                    return;
                                }
                                
                                if (!sessionData?.session) {
                                    console.error('[LoginScreen] Sessão não foi criada!');
                                    Alert.alert('Erro', 'Sessão não configurada. Tente novamente.');
                                    isProcessingLoginRef.current = false;
                                    setLoading(false);
                                    return;
                                }
                                
                                console.log('[LoginScreen] ✅ Sessão configurada com sucesso:', {
                                    hasSession: !!sessionData.session,
                                    userId: sessionData.session?.user?.id
                                });
                                
                                // Small delay to ensure session is persisted
                                console.log('[LoginScreen] Aguardando 500ms para sessão persistir...');
                                await new Promise(resolve => setTimeout(resolve, 500));
                                
                                // Verify session was persisted
                                console.log('[LoginScreen] Verificando sessão persistida...');
                                const { data: { session: verifySession }, error: verifyError } = await supabase.auth.getSession();
                                
                                if (verifyError) {
                                    console.error('[LoginScreen] ⚠️ Erro ao verificar sessão:', verifyError);
                                    // Continue anyway if session was set successfully
                                }
                                
                                console.log('[LoginScreen] Verificação de sessão:', {
                                    hasSession: !!verifySession,
                                    userId: verifySession?.user?.id,
                                    sessionMatch: verifySession?.user?.id === sessionData.session?.user?.id
                                });
                                
                                if (!verifySession) {
                                    console.error('[LoginScreen] ⚠️ Sessão não encontrada após verificação, mas continuando...');
                                    // Try to use the session we just set anyway
                                }
                                
                                console.log('[LoginScreen] Verificando role e redirecionando...');
                                
                                // Always check role and redirect appropriately
                                // redirectToApp will manage isProcessingLoginRef and globalRedirectInProgress internally
                                await redirectToApp();
                                
                                // Reset loading flag after redirect attempt
                                setLoading(false);
                            } catch (e: any) {
                                console.error('[LoginScreen] ========== EXCEÇÃO ==========');
                                console.error('[LoginScreen] Tipo:', e?.constructor?.name);
                                console.error('[LoginScreen] Mensagem:', e?.message);
                                console.error('[LoginScreen] Stack:', e?.stack);
                                Alert.alert('Erro', e?.message || 'Erro ao fazer login. Tente novamente.');
                                isProcessingLoginRef.current = false;
                                setLoading(false);
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
        console.log('🔵 [LoginScreen] Still checking session, showing loading...');
        return (
            <GradientBackground>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Verificando sessão...</Text>
                </View>
            </GradientBackground>
        );
    }

    console.log('🔵 [LoginScreen] ✅ Rendering login screen UI (checking=false, loading=' + loading + ')');
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
