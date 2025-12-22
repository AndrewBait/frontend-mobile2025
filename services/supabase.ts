import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/config';

const WebStorageAdapter = {
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

// 🛡️ Secure storage adapter (iOS Keychain / Android Keystore when available)
const createNativeStorage = () => {
    let secureAvailable: Promise<boolean> | null = null;
    const isSecureAvailable = async () => {
        if (!secureAvailable) {
            secureAvailable = SecureStore.isAvailableAsync().catch(() => false);
        }
        return secureAvailable;
    };

    // SecureStore pode ter limite de ~2KB por item (especialmente no Android).
    // Para evitar falhas de persistência da sessão do Supabase, usamos "chunking".
    const CHUNK_SIZE = 1800; // margem de segurança abaixo de 2048 bytes
    const MAX_CHUNKS = 200;
    const chunksCountKey = (key: string) => `${key}__chunks`;
    const chunkKey = (key: string, index: number) => `${key}__chunk__${index}`;

    const removeLargeItem = async (key: string) => {
        const countStr = await SecureStore.getItemAsync(chunksCountKey(key));
        if (countStr) {
            const count = Number.parseInt(countStr, 10);
            const safeCount = Number.isFinite(count) ? Math.min(Math.max(count, 0), MAX_CHUNKS) : 0;
            for (let i = 0; i < safeCount; i++) {
                await SecureStore.deleteItemAsync(chunkKey(key, i));
            }
            await SecureStore.deleteItemAsync(chunksCountKey(key));
        }

        // Remove legado (quando não estava em chunks)
        await SecureStore.deleteItemAsync(key);
    };

    const setLargeItem = async (key: string, value: string) => {
        // Limpa o valor anterior (chunks/legado) antes de gravar
        await removeLargeItem(key);

        const chunks: string[] = [];
        for (let i = 0; i < value.length; i += CHUNK_SIZE) {
            chunks.push(value.slice(i, i + CHUNK_SIZE));
        }
        if (chunks.length > MAX_CHUNKS) {
            throw new Error('SecureStore chunk limit exceeded');
        }

        await SecureStore.setItemAsync(chunksCountKey(key), String(chunks.length));
        for (let i = 0; i < chunks.length; i++) {
            await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]);
        }
    };

    const getLargeItem = async (key: string): Promise<string | null> => {
        const countStr = await SecureStore.getItemAsync(chunksCountKey(key));
        if (!countStr) {
            // Legado (sem chunks)
            return SecureStore.getItemAsync(key);
        }

        const count = Number.parseInt(countStr, 10);
        if (!Number.isFinite(count) || count <= 0 || count > MAX_CHUNKS) {
            // Metadado corrompido: tenta legado
            return SecureStore.getItemAsync(key);
        }

        let full = '';
        for (let i = 0; i < count; i++) {
            const chunk = await SecureStore.getItemAsync(chunkKey(key, i));
            if (chunk == null) {
                // Incompleto: tenta legado
                return SecureStore.getItemAsync(key);
            }
            full += chunk;
        }
        return full || null;
    };

    return {
        getItem: async (key: string) => {
            const secure = await isSecureAvailable();
            if (secure) {
                try {
                    const value = await getLargeItem(key);
                    if (value != null) {
                        // Se uma sessão antiga ficou truncada (limite do SecureStore),
                        // isso pode causar JSON.parse error dentro do Supabase. Limpamos e forçamos relogin.
                        const trimmed = value.trim();
                        const looksLikeJson =
                            trimmed.startsWith('{') || trimmed.startsWith('[');
                        if (looksLikeJson) {
                            try {
                                JSON.parse(trimmed);
                            } catch {
                                await removeLargeItem(key);
                                await AsyncStorage.removeItem(key);
                                return null;
                            }
                        }
                        return value;
                    }
                } catch {
                    // fallback abaixo
                }
            }
            return AsyncStorage.getItem(key);
        },
        setItem: async (key: string, value: string) => {
            const secure = await isSecureAvailable();
            if (secure) {
                try {
                    await setLargeItem(key, value);
                    // Segurança: evita deixar token/sessão em plaintext no AsyncStorage
                    await AsyncStorage.removeItem(key);
                    return;
                } catch (error) {
                    console.warn('SecureStore falhou, fallback para AsyncStorage', error);
                }
            }
            await AsyncStorage.setItem(key, value);
        },
        removeItem: async (key: string) => {
            const secure = await isSecureAvailable();
            if (secure) {
                try {
                    await removeLargeItem(key);
                } catch {
                    // ignore e tenta limpar o AsyncStorage também
                }
            }
            await AsyncStorage.removeItem(key);
        },
    };
};

const storage = Platform.OS === 'web' ? WebStorageAdapter : createNativeStorage();

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage,
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

export const refreshAccessToken = async (): Promise<string | null> => {
    try {
        const session: any = await getSession();
        if (!session?.refresh_token) return null;

        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
            if (
                typeof error.message === 'string' &&
                error.message.includes('Refresh Token Not Found')
            ) {
                await supabase.auth.signOut({ scope: 'local' });
            }
            return null;
        }
        return data.session?.access_token || null;
    } catch {
        return null;
    }
};

export const getAccessToken = async (): Promise<string | null> => {
    const session: any = await getSession();
    if (!session) return null;
    const accessToken = session?.access_token || null;

    // Evita tokens inválidos vindos de cache/cópia (ex: valores com "…")
    const hasNonAscii = typeof accessToken === 'string' && /[^\x00-\x7F]/.test(accessToken);
    const hasEllipsis = typeof accessToken === 'string' && accessToken.includes('…');

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = typeof session?.expires_at === 'number' ? session.expires_at : null;
    const isExpiredOrNear = typeof expiresAt === 'number' ? expiresAt <= now + 30 : false;

    if (!accessToken || hasNonAscii || hasEllipsis || isExpiredOrNear) {
        const refreshed = await refreshAccessToken();
        return refreshed || accessToken;
    }

    return accessToken;
};

export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

// Subscribe to auth changes
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
};
