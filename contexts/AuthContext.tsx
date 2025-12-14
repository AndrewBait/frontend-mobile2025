import { router } from 'expo-router';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { api, User } from '../services/api';
import { getCurrentUser, getSession, supabase, signOut as supabaseSignOut } from '../services/supabase';

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

        console.log('[AuthContext] fetchUserProfile: Iniciando busca do perfil...');
        try {
            const profile = await api.getProfile();
            console.log('[AuthContext] fetchUserProfile: Perfil obtido do backend:', { 
                id: profile?.id, 
                email: profile?.email,
                role: profile?.role 
            });
            setUser(profile);
        } catch (error: any) {
            console.error('[AuthContext] fetchUserProfile: Erro ao buscar perfil do backend:', error?.message);
            // If API fails, get basic info from Supabase
            try {
                console.log('[AuthContext] fetchUserProfile: Tentando obter usuário do Supabase...');
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
                console.error('[AuthContext] fetchUserProfile: Erro ao obter usuário do Supabase:', supabaseError?.message);
            }
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

            // Sign out from Supabase first (this will clear storage automatically)
            console.log('[AuthContext] Fazendo signOut do Supabase...');
            await supabaseSignOut();
            console.log('[AuthContext] SignOut do Supabase concluído');

            // Clear state after Supabase signOut
            console.log('[AuthContext] Limpando estado local...');
            setUser(null);
            setSession(null);

            // Wait a tiny bit to ensure state is cleared
            await new Promise(resolve => setTimeout(resolve, 100));

            // Immediately redirect to login screen
            console.log('🔴 [AuthContext] Redirecionando para tela de login (/)...');
            console.log('🔴 [AuthContext] Estado atual após limpeza:', {
                user: 'null',
                session: 'null',
                isLoggingOut
            });
            
            // Use router.dismissAll() first to clear navigation stack, then navigate to login
            console.log('🔴 [AuthContext] Limpando pilha de navegação...');
            try {
                router.dismissAll();
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (e) {
                console.log('🔴 [AuthContext] dismissAll não disponível ou erro:', e);
            }
            
            console.log('🔴 [AuthContext] Navegando para /...');
            router.replace('/');
            console.log('🔴 [AuthContext] router.replace("/") concluído');
            
            // Force a delay to ensure navigation completes and UI updates
            await new Promise(resolve => setTimeout(resolve, 300));
            
            console.log('🔴 [AuthContext] ✅ Logout concluído - LoginScreen deve estar visível agora');
        } catch (error: any) {
            console.error('[AuthContext] Erro durante logout:', error);
            // Still clear state even if signOut fails
            setUser(null);
            setSession(null);
            // Still redirect to login even on error
            console.log('[AuthContext] Tentando redirecionar mesmo com erro...');
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
            }, 1500);
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
