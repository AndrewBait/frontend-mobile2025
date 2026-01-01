import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '@/services/api';

type ExpoNotificationsModule = typeof import('expo-notifications');

let notificationsModulePromise: Promise<ExpoNotificationsModule | null> | null = null;
let didConfigureHandler = false;
let didWarnExpoGo = false;

const isExpoGo = () =>
    // expo-constants >= 14: executionEnvironment === 'storeClient' in Expo Go
    (Constants as any)?.executionEnvironment === 'storeClient';

const getNotificationsModule = async (): Promise<ExpoNotificationsModule | null> => {
    if (notificationsModulePromise) return notificationsModulePromise;

    notificationsModulePromise = (async () => {
        // Expo Go (SDK 53+) não suporta push remoto no Android/iOS.
        // Evitamos até importar o módulo para não crashar no startup.
        if (isExpoGo()) {
            if (__DEV__ && !didWarnExpoGo) {
                didWarnExpoGo = true;
                console.log(
                    '[Notifications] Expo Go não suporta push remoto (SDK 53+). Use um development build (dev-client).',
                );
            }
            return null;
        }

        try {
            const mod = await import('expo-notifications');

            if (!didConfigureHandler) {
                didConfigureHandler = true;
                mod.setNotificationHandler({
                    handleNotification: async () => ({
                        shouldShowAlert: true,
                        shouldPlaySound: true,
                        shouldSetBadge: true,
                        shouldShowBanner: true,
                        shouldShowList: true,
                    }),
                });
            }

            return mod;
        } catch (error) {
            if (__DEV__) {
                console.warn(
                    '[Notifications] expo-notifications indisponível; push desativado.',
                    error,
                );
            }
            return null;
        }
    })();

    return notificationsModulePromise;
};

/**
 * Solicita permissões de notificação e retorna o token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    let token: string | null = null;

    // Apenas em dispositivos físicos (não simuladores)
    if (!Device.isDevice) {
        if (__DEV__) console.log('Push notifications não funcionam em simuladores');
        return null;
    }

    const Notifications = await getNotificationsModule();
    if (!Notifications) return null;

    // Verificar permissões atuais
    let finalStatus: string;
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        finalStatus = existingStatus;

        // Se não tiver permissão, solicitar
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
    } catch (error) {
        if (__DEV__) {
            console.warn('[Notifications] Falha ao checar/solicitar permissões:', error);
        }
        return null;
    }

    // Se não conseguiu permissão, retornar null
    if (finalStatus !== 'granted') {
        if (__DEV__) console.log('Permissão de notificação negada');
        return null;
    }

    // Obter token do Expo
    try {
        const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ||
            Constants.easConfig?.projectId;

        if (!projectId) {
            if (__DEV__) {
                console.warn(
                    '[Notifications] EAS Project ID não configurado (app.json). Push desativado. Rode "eas init" para gerar o projectId.',
                );
            }
            return null;
        }

        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        if (__DEV__) {
            console.log('[Notifications] Push token obtido (redacted)');
        }
    } catch (error) {
        if (__DEV__) {
            console.warn('[Notifications] Erro ao obter push token:', error);
        }
        return null;
    }

    // Configurar canal de notificação para Android
    if (Platform.OS === 'android') {
        try {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#6366F1',
            });
        } catch (error) {
            if (__DEV__) {
                console.warn('[Notifications] Falha ao configurar canal Android:', error);
            }
        }
    }

    return token;
}

/**
 * Registra o token de notificação no backend
 */
export async function registerNotificationTokenWithBackend(): Promise<boolean> {
    try {
        const token = await registerForPushNotificationsAsync();

        if (!token) {
            return false;
        }

        // Determinar plataforma
        const platform: 'ios' | 'android' | 'web' =
            Platform.OS === 'ios' ? 'ios' :
            Platform.OS === 'android' ? 'android' :
            'web';

        // Registrar no backend
        await api.registerNotificationToken(token, platform);
        if (__DEV__) console.log('Token de notificação registrado no backend com sucesso');
        return true;
    } catch (error) {
        if (__DEV__) console.warn('Erro ao registrar token de notificação:', error);
        return false;
    }
}

/**
 * Remove o token de notificação do backend
 */
export async function unregisterNotificationToken(token: string): Promise<boolean> {
    try {
        await api.unregisterNotificationToken(token);
        if (__DEV__) console.log('Token de notificação removido do backend');
        return true;
    } catch (error) {
        if (__DEV__) console.warn('Erro ao remover token de notificação:', error);
        return false;
    }
}
