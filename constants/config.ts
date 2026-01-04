import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const LOCAL_API_PORT = 3000;

// --- DEFINIÇÃO DA URL DE PRODUÇÃO (Movido para o topo para evitar erro) ---
const PROD_API_BASE_URL = 'https://api-venceja.cloud/api';

const getDevServerHost = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost ||
    null;

  if (!hostUri || typeof hostUri !== 'string') return null;
  return hostUri.split(':')[0] || null;
};

// Função auxiliar para descobrir o IP da máquina local (para Dev)
const getLocalApiBaseUrl = (): string => {
  // Emulador Android padrão
  if (Platform.OS === 'android' && !Device.isDevice) {
    return `http://10.0.2.2:${LOCAL_API_PORT}/api`;
  }

  // Tenta pegar o IP da máquina que iniciou o Expo
  const host = getDevServerHost();
  if (host) {
    return `http://${host}:${LOCAL_API_PORT}/api`;
  }

  // Fallback final
  return `http://127.0.0.1:${LOCAL_API_PORT}/api`;
};

// =====================================================================
// LÓGICA DE SELEÇÃO DE AMBIENTE (ROBUSTA)
// =====================================================================

// 1. Se existe uma variável no .env (EXPO_PUBLIC_API_URL), ela é a LEI.
// 2. Se não existe e estamos em DEV (__DEV__), tentamos descobrir o IP local.
// 3. Se for produção e não tiver variável, usamos a URL da VPS.

const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;

export const API_BASE_URL = ENV_API_URL
  ? ENV_API_URL
  : __DEV__
    ? getLocalApiBaseUrl()
    : PROD_API_BASE_URL; // Agora PROD_API_BASE_URL já está definida

// =====================================================================
// SUPABASE & GOOGLE (Variáveis de Ambiente Obrigatórias)
// =====================================================================
// SEGURANÇA: Chaves NÃO devem ser hardcoded no código.
// Configure via EAS Secrets ou arquivo .env local.
// Em builds de produção, use: eas secret:create

const getRequiredEnvVar = (name: string, fallbackForDev?: string): string => {
  const value = process.env[name];
  if (value) return value;

  // Em desenvolvimento, permitir fallback para facilitar setup inicial
  if (__DEV__ && fallbackForDev) {
    console.warn(
      `⚠️ ${name} não configurada. Usando fallback de desenvolvimento. ` +
        'Configure via .env para produção.',
    );
    return fallbackForDev;
  }

  // Em produção, fallback é obrigatório via EAS Secrets
  throw new Error(
    `Variável de ambiente ${name} não configurada. ` +
      'Configure via EAS Secrets para builds de produção.',
  );
};

// URLs e IDs públicos (não são secrets, podem ter fallback)
export const SUPABASE_URL = getRequiredEnvVar(
  'EXPO_PUBLIC_SUPABASE_URL',
  'https://rkmvrfqhcleibdtlcwwh.supabase.co',
);

// ANON KEY é pública mas deve vir de variável de ambiente em produção
export const SUPABASE_ANON_KEY = getRequiredEnvVar(
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  __DEV__ ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrbXZyZnFoY2xlaWJkdGxjd3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDQ4MTYsImV4cCI6MjA4MDcyMDgxNn0.5txb-OmPn8MIapJSmJyd4r1rM8Wriji1LuC2VBcyrvk' : undefined,
);

export const GOOGLE_CLIENT_ID = getRequiredEnvVar(
  'EXPO_PUBLIC_GOOGLE_CLIENT_ID',
  __DEV__ ? '504769568668-pdefag51h1k8u6i6p9r77ra7bqqco1f4.apps.googleusercontent.com' : undefined,
);

// Logs para você saber ONDE o app está conectando quando abrir
if (__DEV__) {
  console.log('------------------------------------------------');
  console.log(
    '🚀 AMBIENTE DETECTADO:',
    ENV_API_URL ? 'PERSONALIZADO (.env)' : 'AUTOMÁTICO (Local/VPS)',
  );
  console.log('📡 API URL:', API_BASE_URL);
  console.log('------------------------------------------------');
}