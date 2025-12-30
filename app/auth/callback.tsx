import { useURL } from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GradientBackground } from '@/components/GradientBackground';
import { Colors } from '@/constants/Colors';
import { API_BASE_URL } from '@/constants/config';
import { api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { normalizeRole } from '@/utils/roles';
import {
    getGlobalRedirectInProgress,
    isAuthSessionLockActive,
    releaseAuthSessionLock,
    setGlobalRedirectInProgress,
    tryAcquireAuthSessionLock,
} from '@/utils/redirectLock';

const safeUrlForLog = (rawUrl: string | null | undefined) => {
    if (!rawUrl) return rawUrl ?? null;
    // OAuth implicit flow returns tokens in the URL fragment (#...). Never log it.
    const withoutHash = String(rawUrl).split('#')[0];
    // Also strip query params to avoid leaking codes in other flows.
    return withoutHash.split('?')[0];
};

export default function AuthCallbackScreen() {
    const params = useLocalSearchParams();
    const url = useURL();
    const isHandlingCallback = useRef(false);
    const isRedirecting = useRef(false);
    const lastProcessedUrl = useRef<string | null>(null);
    const handleCallbackRef = useRef<(callbackUrl: string) => Promise<void>>(async () => {});
    const [redirectError, setRedirectError] = useState<string | null>(null);

    useEffect(() => {
        // This callback screen is mainly for deep links
        // For OAuth flow, tokens are processed in index.tsx
        // Prevent infinite loops by checking if we already processed
        if (isHandlingCallback.current) {
            console.log('[AuthCallback] Já processado ou em processamento, ignorando...');
            return;
        }

        isHandlingCallback.current = true;
        if (url && lastProcessedUrl.current === url) {
            console.log('[AuthCallback] URL já processada, ignorando...');
            isHandlingCallback.current = false;
            return;
        }
        if (url) {
            lastProcessedUrl.current = url;
        }

        const waitForSession = async (timeoutMs: number) => {
            const startedAt = Date.now();
            while (Date.now() - startedAt < timeoutMs) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) return session;
                await new Promise((resolve) => setTimeout(resolve, 250));
            }
            return null;
        };

        const run = async () => {
            try {
                console.log('[AuthCallback] Callback screen montado');
                console.log('[AuthCallback] URL:', safeUrlForLog(url));
                console.log('[AuthCallback] Params:', Object.keys(params));

                // If LoginScreen is processing the OAuth flow, do not attempt to consume the refresh token here.
                // Just wait briefly for a session to appear (token rotation makes refresh tokens single-use).
                if (isAuthSessionLockActive()) {
                    console.log('[AuthCallback] Auth lock ativo - aguardando sessão criada pela LoginScreen...');
                    const session = await waitForSession(5000);
                    if (session) {
                        console.log('[AuthCallback] Sessão encontrada após aguardar lock, redirecionando...');
                        await redirectToApp();
                        return;
                    }
                }

                // If we already have a session, just redirect.
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    console.log('[AuthCallback] Sessão encontrada, redirecionando para app...');
                    await redirectToApp();
                    return;
                }

                // No session: attempt to process tokens from deep link URL.
                if (!url) {
                    console.log('[AuthCallback] Nenhuma URL encontrada ainda, aguardando...');
                    return;
                }

                const lockOwner = 'auth-callback';
                const acquired = tryAcquireAuthSessionLock(lockOwner);
                if (!acquired) {
                    console.log('[AuthCallback] Não foi possível adquirir auth lock, aguardando sessão...');
                    const sessionAfterWait = await waitForSession(5000);
                    if (sessionAfterWait) {
                        await redirectToApp();
                        return;
                    }
                    router.replace('/');
                    return;
                }

                try {
                    await handleCallbackRef.current(url);
                } finally {
                    releaseAuthSessionLock(lockOwner);
                }
            } catch (error) {
                console.error('[AuthCallback] Erro:', error);
                router.replace('/');
            } finally {
                isHandlingCallback.current = false;
            }
        };

        run();
    }, [url, params, handleCallbackRef]);

    async function handleCallback(callbackUrl: string) {
        try {
            console.log('[AuthCallback] ========== INICIANDO PROCESSAMENTO ==========');
            console.log('[AuthCallback] URL recebida:', safeUrlForLog(callbackUrl));
            
            if (callbackUrl) {
                const safe = safeUrlForLog(callbackUrl) || '';
                console.log('[AuthCallback] URL (redigida):', String(safe).substring(0, 200));
            }

            if (callbackUrl) {
                // Extract hash part (after #)
                const hashIndex = callbackUrl.indexOf('#');
                console.log('[AuthCallback] Hash encontrado na posição:', hashIndex);
                
                if (hashIndex !== -1) {
                    const hashPart = callbackUrl.substring(hashIndex + 1);
                    console.log('[AuthCallback] Hash length:', hashPart.length);
                    const hashParams = new URLSearchParams(hashPart);

                    const accessToken = hashParams.get('access_token');
                    const refreshToken = hashParams.get('refresh_token');

                    console.log('[AuthCallback] Tokens extraídos:', { 
                        accessToken: !!accessToken, 
                        refreshToken: !!refreshToken,
                        accessTokenLength: accessToken?.length || 0,
                        refreshTokenLength: refreshToken?.length || 0
                    });

                    if (accessToken && refreshToken) {
                        console.log('[AuthCallback] Tokens válidos encontrados!');
                        console.log('[AuthCallback] Configurando sessão no Supabase...');
                        
                        // Set session in Supabase
                        const { data, error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });

                        console.log('[AuthCallback] Resultado do setSession:', {
                            hasSession: !!data.session,
                            hasError: !!error,
                            errorMessage: error?.message
                        });

                        if (error) {
                            const message = error?.message || '';
                            const isInvalidRefreshToken =
                                message.includes('Invalid Refresh Token') ||
                                message.includes('Refresh Token Not Found');

                            if (isInvalidRefreshToken) {
                                console.warn('[AuthCallback] Refresh token já foi consumido, verificando sessão...');
                                const { data: { session: recoveredSession } } = await supabase.auth.getSession();
                                if (recoveredSession) {
                                    console.log('[AuthCallback] Sessão encontrada após erro - redirecionando...');
                                    await redirectToApp();
                                    return;
                                }
                            }

                            console.error('[AuthCallback] ERRO ao configurar sessão:', error);
                            throw error;
                        }

                        if (!data.session) {
                            console.error('[AuthCallback] Sessão não foi criada!');
                            throw new Error('Sessão não foi criada');
                        }

                        console.log('[AuthCallback] Sessão configurada com sucesso!');
                        console.log('[AuthCallback] User ID da sessão:', data.session.user?.id);
                        
                        // Wait a bit for session to be fully set
                        console.log('[AuthCallback] Aguardando 1 segundo para sessão estabilizar...');
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        // Verify session
                        const { data: { session: verifySession } } = await supabase.auth.getSession();
                        console.log('[AuthCallback] Verificação de sessão:', {
                            hasSession: !!verifySession,
                            userId: verifySession?.user?.id
                        });

                        if (!verifySession) {
                            console.error('[AuthCallback] Sessão não encontrada após verificação!');
                            router.replace('/');
                            return;
                        }

                        // Redirect after successful session
                        console.log('[AuthCallback] Redirecionando para app...');
                        await redirectToApp();
                        return;
                    } else {
                        console.log('[AuthCallback] Tokens não encontrados ou inválidos');
                    }
                } else {
                    console.log('[AuthCallback] Hash não encontrado na URL');
                }
            } else {
                console.log('[AuthCallback] Nenhuma URL encontrada');
            }

            // If no tokens in URL, check for existing session
            console.log('[AuthCallback] Verificando sessão existente...');
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                console.log('[AuthCallback] Sessão existente encontrada:', session.user?.id);
                await redirectToApp();
            } else {
                // No session, go back to login
                console.log('[AuthCallback] Nenhuma sessão encontrada, redirecionando para login');
                router.replace('/');
            }
        } catch (error: any) {
            console.error('[AuthCallback] ========== ERRO NO CALLBACK ==========');
            console.error('[AuthCallback] Tipo do erro:', error?.constructor?.name);
            console.error('[AuthCallback] Mensagem:', error?.message);
            console.error('[AuthCallback] Stack:', error?.stack);
            router.replace('/');
        }
    }
    handleCallbackRef.current = handleCallback;

    async function redirectToApp() {
        // Prevent multiple simultaneous calls (check both local and global flags)
        const globalLock = getGlobalRedirectInProgress();
        if (isRedirecting.current || globalLock) {
            console.log('[AuthCallback] redirectToApp já em execução (local:', isRedirecting.current, 'global:', globalLock, '), ignorando...');
            return;
        }

        try {
            setRedirectError(null);
            isRedirecting.current = true;
            setGlobalRedirectInProgress(true);
            console.log('[AuthCallback] ========== REDIRECIONANDO PARA APP ==========');
            console.log('[AuthCallback] Verificando perfil do usuário...');
            
            // Use getMe instead of getProfile - getMe doesn't require role
            console.log('[AuthCallback] Chamando api.getMe()...');
            const startTime = Date.now();
            
            const userPromise = api.getMe();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(
                    () => reject(new Error('Timeout: Backend não respondeu em 15 segundos')),
                    15000,
                ),
            );

            let user: any;
            try {
                user = await Promise.race([userPromise, timeoutPromise]);
            } catch (error: any) {
                const status = error?.status ?? error?.statusCode;

                // Backend can briefly return 409 in a race where two requests try to create the same user.
                // Treat as non-fatal and recover by fetching the profile.
                if (status === 409) {
                    console.warn(
                        '[AuthCallback] /me retornou 409 (race de criação). Recuperando via /me/profile...',
                    );
                    const profile = await api.getProfile();
                    user = profile;
                } else {
                    throw error;
                }
            }
            const duration = Date.now() - startTime;
            
            console.log('[AuthCallback] Resposta recebida em', duration, 'ms');
            console.log('[AuthCallback] Usuário recebido:', { 
                id: user?.id, 
                email: user?.email, 
                role: user?.role,
                name: user?.name,
                phone: user?.phone ? 'informado' : 'não informado'
            });

            // Check if user object is valid
            if (!user || !user.id) {
                console.error('[AuthCallback] ⚠️ Usuário inválido ou não encontrado');
                console.log('[AuthCallback] Redirecionando para seleção de role (usuário não encontrado)');
                router.replace('/select-role');
                return;
            }

            const role = user?.role;
            const phoneValue = user?.phone;
            const hasPhone = phoneValue && typeof phoneValue === 'string' && phoneValue.length >= 10;
            const isProfileComplete = user?.profile_complete === true;

            console.log('[AuthCallback] Análise detalhada do usuário:', {
                role,
                roleType: typeof role,
                phoneValue: phoneValue || '(vazio/null/undefined)',
                phoneType: typeof phoneValue,
                phoneLength: phoneValue ? phoneValue.length : 0,
                hasPhone,
                isProfileComplete,
                roleIsNull: role === null,
                roleIsUndefined: role === undefined,
                roleIsEmpty: role === '',
                roleIsFalsy: !role,
                userKeys: Object.keys(user || {}),
                fullUserObject: JSON.stringify(user, null, 2)
            });

            // Check if role is empty/null/undefined - user needs to select role
            // IMPORTANTE: Só redireciona para /select-role se REALMENTE não tiver role
            // Se o usuário já tem role cadastrado, não deve ir para seleção de role
            const normalizedRole = normalizeRole(role);
            const roleIsEmpty = !normalizedRole;
            if (roleIsEmpty) {
                console.log('[AuthCallback] ⚠️ NENHUM ROLE ENCONTRADO - Redirecionando para seleção de role');
                console.log('[AuthCallback] Dados do usuário para debug:', { 
                    id: user?.id, 
                    email: user?.email, 
                    role: user?.role,
                    roleValue: String(user?.role),
                    hasRole: !!user?.role
                });
                isRedirecting.current = false;
                setGlobalRedirectInProgress(false);
                router.replace('/select-role');
                return; // Important: return early to prevent further execution
            } else if (normalizedRole === 'customer') {
                // IMPORTANTE: Se o backend atribuiu role "customer" automaticamente (usuário novo sem dados),
                // detectamos isso e redirecionamos para seleção de role para que o usuário possa escolher
                // Verificamos se NÃO tem telefone E NÃO tem profile_complete E parece ser um usuário recém-criado
                const seemsLikeAutoAssigned = !hasPhone && !isProfileComplete && !user?.name;
                
                if (seemsLikeAutoAssigned) {
                    console.log('[AuthCallback] ⚠️ Role "customer" parece ter sido atribuído automaticamente pelo backend');
                    console.log('[AuthCallback] Usuário novo sem dados - Redirecionando para seleção de role');
                    isRedirecting.current = false;
                    setGlobalRedirectInProgress(false);
                    router.replace('/select-role');
                    return;
                } else if (isProfileComplete || hasPhone) {
                    // Se o usuário TEM role "customer" E tem perfil completo → vai direto para dashboard
                    console.log('[AuthCallback] ✅ Consumidor com cadastro completo - Redirecionando para dashboard (ofertas)');
                    console.log('[AuthCallback] Motivo: profile_complete=' + isProfileComplete + ', hasPhone=' + hasPhone);
                    isRedirecting.current = false;
                    setGlobalRedirectInProgress(false);
                    router.replace('/(customer)');
                    return;
                } else {
                    // Tem role mas não tem dados completos (ex: cadastro parcial)
                    console.log('[AuthCallback] ⚠️ Consumidor com role mas sem dados completos - Redirecionando para setup');
                    console.log('[AuthCallback] Faltando: profile_complete=' + isProfileComplete + ', phone=' + (phoneValue || '(vazio)'));
                    isRedirecting.current = false;
                    setGlobalRedirectInProgress(false);
                    router.replace('/(customer)/setup');
                    return;
                }
            } else if (normalizedRole === 'store_owner') {
                // Para lojista, se tem role já vai direto (assumindo que lojista já tem cadastro se tem role)
                console.log('[AuthCallback] ✅ Lojista - Redirecionando para dashboard');
                // Reset flags before redirecting to ensure navigation works
                isRedirecting.current = false;
                setGlobalRedirectInProgress(false);
                router.replace('/(merchant)');
                return; // Return early after redirect
            } else {
                console.log('[AuthCallback] ⚠️ Role desconhecido:', role, '- Redirecionando para seleção');
                isRedirecting.current = false;
                setGlobalRedirectInProgress(false);
                router.replace('/select-role');
                return;
            }
        } catch (error: any) {
            console.error('[AuthCallback] ========== ERRO AO REDIRECIONAR ==========');
            console.error('[AuthCallback] Tipo do erro:', error?.constructor?.name);
            console.error('[AuthCallback] Mensagem:', error?.message);
            console.error('[AuthCallback] Stack:', error?.stack);

            const message = String(error?.message || '');
            const status = error?.status ?? error?.statusCode;
            const isNetworkError =
                message.includes('Network request failed') ||
                message.includes('Failed to fetch') ||
                error?.constructor?.name === 'TypeError';
            const isTimeout = message.includes('Timeout') || message.includes('timeout');

            // Se o backend estiver indisponível, não faz sentido mandar para seleção de role (que também depende do backend).
            if (isNetworkError || isTimeout) {
                setRedirectError(
                    `Não foi possível conectar no backend (${API_BASE_URL}). Verifique se o servidor está rodando e se o dispositivo está na mesma rede.`,
                );
                return;
            }

            // Erros de auth: manda para login
            if (status === 401) {
                setRedirectError('Sua sessão expirou. Faça login novamente.');
                router.replace('/');
                return;
            }

            // Outros erros: manter na tela com mensagem amigável
            setRedirectError(
                message ? `Não foi possível finalizar o login: ${message}` : 'Não foi possível finalizar o login.',
            );
        } finally {
            isRedirecting.current = false;
            setGlobalRedirectInProgress(false);
        }
    }

    if (redirectError) {
        return (
            <GradientBackground>
                <View style={styles.container}>
                    <Text style={styles.text}>Falha ao finalizar o login</Text>
                    <Text style={styles.errorText}>{redirectError}</Text>
                    <TouchableOpacity
                        onPress={() => void redirectToApp()}
                        activeOpacity={0.8}
                        style={styles.retryButton}
                    >
                        <Text style={styles.retryText}>Tentar novamente</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.replace('/')}
                        activeOpacity={0.8}
                        style={styles.backButton}
                    >
                        <Text style={styles.backText}>Voltar</Text>
                    </TouchableOpacity>
                </View>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <View style={styles.container}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.text}>Autenticando...</Text>
            </View>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    text: {
        color: Colors.textSecondary,
        fontSize: 16,
    },
    errorText: {
        color: Colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 24,
        lineHeight: 20,
    },
    retryButton: {
        marginTop: 12,
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 12,
    },
    retryText: {
        color: Colors.text,
        fontWeight: '700',
    },
    backButton: {
        marginTop: 10,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 12,
    },
    backText: {
        color: Colors.text,
        fontWeight: '600',
    },
});
