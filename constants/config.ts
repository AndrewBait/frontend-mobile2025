// API Configuration
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const LOCAL_API_PORT = 3000;

const getDevServerHost = (): string | null => {
    const hostUri =
        Constants.expoConfig?.hostUri ||
        // Fallbacks for older/newer Expo manifests
        (Constants as any)?.expoGoConfig?.debuggerHost ||
        (Constants as any)?.manifest?.debuggerHost ||
        (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ||
        null;

    if (!hostUri || typeof hostUri !== 'string') return null;
    return hostUri.split(':')[0] || null;
};

const getLocalApiBaseUrl = (): string => {
    // iOS Simulator: localhost aponta para o Mac host
    if (Platform.OS === 'ios' && !Device.isDevice) {
        return `http://127.0.0.1:${LOCAL_API_PORT}`;
    }

    // Android Emulator: host do Mac/PC é 10.0.2.2
    if (Platform.OS === 'android' && !Device.isDevice) {
        return `http://10.0.2.2:${LOCAL_API_PORT}`;
    }

    // Dispositivo físico: usar o host do Metro/Expo (LAN)
    const host = getDevServerHost();
    if (host) {
        return `http://${host}:${LOCAL_API_PORT}`;
    }

    return `http://127.0.0.1:${LOCAL_API_PORT}`;
};

export const API_BASE_URL = __DEV__
    ? getLocalApiBaseUrl()
    : 'https://api.venceja.com.br';

console.log('[Config] API Base URL:', API_BASE_URL);

export const SUPABASE_URL = 'https://rkmvrfqhcleibdtlcwwh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrbXZyZnFoY2xlaWJkdGxjd3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDQ4MTYsImV4cCI6MjA4MDcyMDgxNn0.5txb-OmPn8MIapJSmJyd4r1rM8Wriji1LuC2VBcyrvk';

export const GOOGLE_CLIENT_ID = '504769568668-pdefag51h1k8u6i6p9r77ra7bqqco1f4.apps.googleusercontent.com';
