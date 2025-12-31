// API Configuration
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const LOCAL_API_PORT = 3000;

const getDevServerHost = (): string | null => {
    const hostUri = Constants.expoConfig?.hostUri || (Constants as any)?.manifest?.debuggerHost || null;
    if (!hostUri || typeof hostUri !== 'string') return null;
    return hostUri.split(':')[0] || null;
};

const getLocalApiBaseUrl = (): string => {
    if (Platform.OS === 'android' && !Device.isDevice) {
        return `http://10.0.2.2:${LOCAL_API_PORT}/api`;
    }
    const host = getDevServerHost();
    if (host) {
        return `http://${host}:${LOCAL_API_PORT}/api`;
    }
    return `http://127.0.0.1:${LOCAL_API_PORT}/api`;
};

// --- CONFIGURAÇÃO FORÇADA PARA VPS ---
export const API_BASE_URL = 'https://api-venceja.cloud/api';

// --- SUPABASE CONFIG (COM FALLBACK ATIVO) ---
const FALLBACK_URL = "https://rkmvrfqhcleibdtlcwwh.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrbXZyZnFoY2xlaWJkdGxjd3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDQ4MTYsImV4cCI6MjA4MDcyMDgxNn0.5txb-OmPn8MIapJSmJyd4r1rM8Wriji1LuC2VBcyrvk";
const FALLBACK_GOOGLE_ID = "504769568668-pdefag51h1k8u6i6p9r77ra7bqqco1f4.apps.googleusercontent.com";

// AQUI ESTAVA O ERRO: Agora usamos o || para garantir que se o ENV falhar, o hardcoded entra.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY;
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || FALLBACK_GOOGLE_ID;

// Logs para confirmar
console.log('--- CONFIG CARREGADA ---');
console.log('API Alvo:', API_BASE_URL); 
console.log('Supabase URL:', SUPABASE_URL ? 'OK (Carregado)' : 'ERRO (Vazio)');
console.log('------------------------');