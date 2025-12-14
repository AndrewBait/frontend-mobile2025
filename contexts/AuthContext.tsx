import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { router } from 'expo-router';
import { supabase, getSession, signOut as supabaseSignOut, getCurrentUser } from '../services/supabase';
import { api, User } from '../services/api';

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
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // Ignore auth changes during logout
                if (isLoggingOutRef.current) {
                    return;
                }

                setSession(session);
                if (session) {
                    await fetchUserProfile();
                } else {
                    setUser(null);
                }
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
            return;
        }

        try {
            const profile = await api.getProfile();
            setUser(profile);
        } catch (error) {
            console.error('Error fetching profile:', error);
            // If API fails, get basic info from Supabase
            const supabaseUser = await getCurrentUser();
            if (supabaseUser) {
                setUser({
                    id: supabaseUser.id,
                    email: supabaseUser.email || '',
                    name: supabaseUser.user_metadata?.name,
                    photo_url: supabaseUser.user_metadata?.avatar_url,
                });
            }
        }
    };

    const refreshUser = async () => {
        if (isLoggingOutRef.current) return;
        await fetchUserProfile();
    };

    const signOut = async () => {
        try {
            // Set logging out flag immediately (before any async operations)
            isLoggingOutRef.current = true;
            setIsLoggingOut(true);

            // Sign out from Supabase first
            await supabaseSignOut();

            // Clear state after Supabase signOut
            setUser(null);
            setSession(null);

            console.log('Sign out completed successfully');

            // Navigation will be handled by the layout components
            // They will detect session is null and redirect
        } catch (error) {
            console.error('Error signing out:', error);
            // Still clear state even if signOut fails
            setUser(null);
            setSession(null);
        } finally {
            // Reset flag after a delay to let layouts handle redirect
            setTimeout(() => {
                isLoggingOutRef.current = false;
                setIsLoggingOut(false);
            }, 2000);
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
