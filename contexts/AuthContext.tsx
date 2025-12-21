import { api, User } from '@/services/api';
import { getCurrentUser, getSession, supabase, signOut as supabaseSignOut } from '@/services/supabase';
import { registerNotificationTokenWithBackend } from '@/utils/notifications';
import { router } from 'expo-router';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

interface AuthContextType {
    user: User | null;
    session: any;
    loading: boolean;
    isLoggingOut: boolean;
    isProfileComplete: boolean;
    refreshUser: () => Promise<void>;
    signOut: () => Promise<void>;
    checkProfileComplete: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const isLoggingOutRef = useRef(false);
    const isFetchingProfileRef = useRef(false);
    const lastErrorTimeRef = useRef<number>(0);
    const errorCountRef = useRef<number>(0);

    useEffect(() => {
        // Check for existing session
        checkSession();

        // Listen for auth changes
        // IMPORTANT: Don't use async directly in the callback to avoid deadlocks
        // Use setTimeout to defer async operations
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                console.log('[AuthContext] Auth state changed:', { event, hasSession: !!session });
                
                // Ignore auth changes during logout
                if (isLoggingOutRef.current) {
                    console.log('[AuthContext] Ignorando mudança de auth durante logout');
                    return;
                }

                // Update session synchronously
                setSession(session);
                
                // Defer async operations to avoid deadlocks
                setTimeout(() => {
                    if (session) {
                        console.log('[AuthContext] Sessão encontrada, buscando perfil...');
                        fetchUserProfile().catch(error => {
                            console.error('[AuthContext] Erro ao buscar perfil:', error);
                        });
                    } else {
                        console.log('[AuthContext] Nenhuma sessão, limpando usuário');
                        setUser(null);
                    }
                }, 0);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const checkSession = async () => {
        try {
            const session = await getSession();
            setSession(session);
            if (session) {
                await fetchUserProfile();
            }
        } catch (error) {
            console.error('Error checking session:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserProfile = async () => {
        // Don't fetch if logging out
        if (isLoggingOutRef.current) {
            console.log('[AuthContext] fetchUserProfile: Ignorando durante logout');
            return;
        }

        // Prevent multiple simultaneous calls
        if (isFetchingProfileRef.current) {
            console.log('[AuthContext] fetchUserProfile: Já está buscando perfil, ignorando chamada duplicada');
            return;
        }

        isFetchingProfileRef.current = true;
        const now = Date.now();

        try {
            // Exponential backoff for network errors (max 10s)
            const timeSinceLastError = now - lastErrorTimeRef.current;
            const backoffDelay = Math.min(1000 * Math.pow(2, errorCountRef.current), 10000);
            
            if (timeSinceLastError < backoffDelay && errorCountRef.current > 0) {
                // Skip request due to backoff
                console.log(`[AuthContext] fetchUserProfile: Aguardando backoff (${Math.round((backoffDelay - timeSinceLastError) / 1000)}s restantes)`);
                isFetchingProfileRef.current = false;
                return;
            }

            console.log('[AuthContext] fetchUserProfile: Iniciando busca do perfil...');
            try {
                const profile = await api.getProfile();
                console.log('[AuthContext] fetchUserProfile: Perfil obtido do backend:', {
                    id: profile?.id,
                    email: profile?.email,
                    role: profile?.role
                });
                setUser(profile);
                errorCountRef.current = 0; // Reset error count on success

                // Registrar token de notificação após login bem-sucedido
                // Não bloqueia o fluxo principal - executa em background
                registerNotificationTokenWithBackend().catch(error => {
                    console.log('[AuthContext] Aviso: Não foi possível registrar token de notificação:', error?.message);
                    // Falha no registro de notificações não deve impedir o login
                });
            } catch (error: any) {
                // Track errors for exponential backoff
                const isNetworkError = error?.message?.includes('Network request failed') || 
                                     error?.message?.includes('Failed to fetch');
                
                if (isNetworkError) {
                    errorCountRef.current += 1;
                    lastErrorTimeRef.current = Date.now();
                    
                    // Only log first few errors to avoid spam
                    if (errorCountRef.current <= 3) {
                        console.error('[AuthContext] fetchUserProfile: Erro de rede ao buscar perfil do backend:', error?.message);
                    }
                } else {
                    // Non-network errors should be logged
                    console.error('[AuthContext] fetchUserProfile: Erro ao buscar perfil do backend:', error?.message);
                }

                // If API fails, get basic info from Supabase
                try {
                    console.log('[AuthContext] fetchUserProfile: Tentando obter usuário do Supabase como fallback...');
                    const supabaseUser = await getCurrentUser();
                    if (supabaseUser) {
                        console.log('[AuthContext] fetchUserProfile: Usuário obtido do Supabase:', { 
                            id: supabaseUser.id, 
                            email: supabaseUser.email 
                        });
                        setUser({
                            id: supabaseUser.id,
                            email: supabaseUser.email || '',
                            name: supabaseUser.user_metadata?.name,
                            photo_url: supabaseUser.user_metadata?.avatar_url,
                        });
                    }
                } catch (supabaseError: any) {
                    // Only log Supabase errors if they're not network-related or if it's the first error
                    if (errorCountRef.current <= 1) {
                        console.error('[AuthContext] fetchUserProfile: Erro ao obter usuário do Supabase:', supabaseError?.message);
                    }
                }
            }
        } finally {
            isFetchingProfileRef.current = false;
        }
    };

    const refreshUser = async () => {
        if (isLoggingOutRef.current) return;
        await fetchUserProfile();
    };

    const signOut = async () => {
        try {
            console.log('[AuthContext] ========== INICIANDO LOGOUT ==========');
            // Set logging out flag immediately (before any async operations)
            isLoggingOutRef.current = true;
            setIsLoggingOut(true);

            // Clear state FIRST (before Supabase signOut to avoid race conditions)
            console.log('[AuthContext] Limpando estado local...');
            setUser(null);
            setSession(null);

            // Sign out from Supabase (this will clear storage automatically)
            console.log('[AuthContext] Fazendo signOut do Supabase...');
            await supabaseSignOut();
            console.log('[AuthContext] SignOut do Supabase concluído');

            // Wait a bit longer to ensure state is fully cleared (especially on iOS)
            await new Promise(resolve => setTimeout(resolve, 300));

            // Navigate to login screen - use replace to clear navigation stack
            // On iOS, we need to ensure the navigation happens after state is cleared
            console.log('[AuthContext] Navegando para /...');
            
            // Use setTimeout to ensure navigation happens after React state updates
            setTimeout(() => {
                try {
                    router.replace('/');
                    console.log('[AuthContext] ✅ Navegação para login concluída');
                } catch (navError) {
                    console.error('[AuthContext] Erro ao navegar para login:', navError);
                    // Fallback: try push if replace fails
                    try {
                        router.push('/');
                    } catch (pushError) {
                        console.error('[AuthContext] Erro ao fazer push para login:', pushError);
                    }
                }
            }, 100);
            
            console.log('[AuthContext] ✅ Logout concluído - LoginScreen deve estar visível agora');
        } catch (error: any) {
            console.error('[AuthContext] Erro durante logout:', error);
            // Still clear state even if signOut fails
            setUser(null);
            setSession(null);
            // Still redirect to login even on error
            try {
                router.replace('/');
            } catch (navError) {
                console.error('[AuthContext] Erro ao redirecionar:', navError);
            }
        } finally {
            // Reset flag after a delay
            setTimeout(() => {
                console.log('[AuthContext] Resetando flag de logout');
                isLoggingOutRef.current = false;
                setIsLoggingOut(false);
            }, 500);
        }
    };

    // Check if profile is complete (has phone at minimum)
    const checkProfileComplete = (): boolean => {
        if (!user) return false;
        return !!(user.phone && user.phone.length >= 10);
    };

    const isProfileComplete = checkProfileComplete();

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                isLoggingOut,
                isProfileComplete,
                refreshUser,
                signOut,
                checkProfileComplete,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
