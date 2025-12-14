import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/config';

// Custom storage that works on both web and native
const createStorage = () => {
    if (Platform.OS === 'web') {
        return {
            getItem: (key: string) => {
                try {
                    return Promise.resolve(localStorage.getItem(key));
                } catch {
                    return Promise.resolve(null);
                }
            },
            setItem: (key: string, value: string) => {
                try {
                    localStorage.setItem(key, value);
                    return Promise.resolve();
                } catch {
                    return Promise.resolve();
                }
            },
            removeItem: (key: string) => {
                try {
                    localStorage.removeItem(key);
                    return Promise.resolve();
                } catch {
                    return Promise.resolve();
                }
            },
        };
    }

    // For native, use AsyncStorage
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage;
};

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: createStorage(),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
    },
});

// Auth functions
export const signInWithGoogle = async (idToken: string) => {
    const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
    });

    if (error) throw error;
    return data;
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

export const getAccessToken = async (): Promise<string | null> => {
    const session = await getSession();
    return session?.access_token || null;
};

export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

// Subscribe to auth changes
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
};
