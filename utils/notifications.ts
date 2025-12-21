import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '@/services/api';

// Configurar como as notificações devem ser tratadas quando o app está em foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

/**
 * Solicita permissões de notificação e retorna o token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    let token: string | null = null;

    // Apenas em dispositivos físicos (não simuladores)
    if (!Device.isDevice) {
        console.log('Push notifications não funcionam em simuladores');
        return null;
    }

    // Verificar permissões atuais
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Se não tiver permissão, solicitar
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    // Se não conseguiu permissão, retornar null
    if (finalStatus !== 'granted') {
        console.log('Permissão de notificação negada');
        return null;
    }

    // Obter token do Expo
    try {
        token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('Push token obtido:', token);
    } catch (error) {
        console.error('Erro ao obter push token:', error);
        return null;
    }

    // Configurar canal de notificação para Android
    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6366F1',
        });
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
            console.log('Não foi possível obter token de notificação');
            return false;
        }

        // Determinar plataforma
        const platform: 'ios' | 'android' | 'web' =
            Platform.OS === 'ios' ? 'ios' :
            Platform.OS === 'android' ? 'android' :
            'web';

        // Registrar no backend
        await api.registerNotificationToken(token, platform);
        console.log('Token de notificação registrado no backend com sucesso');
        return true;
    } catch (error) {
        console.error('Erro ao registrar token de notificação:', error);
        return false;
    }
}

/**
 * Remove o token de notificação do backend
 */
export async function unregisterNotificationToken(token: string): Promise<boolean> {
    try {
        await api.unregisterNotificationToken(token);
        console.log('Token de notificação removido do backend');
        return true;
    } catch (error) {
        console.error('Erro ao remover token de notificação:', error);
        return false;
    }
}
