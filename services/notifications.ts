import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when the app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export interface NotificationData {
    type: 'new_order' | 'order_paid' | 'order_picked_up' | 'promo' | 'general';
    orderId?: string;
    storeId?: string;
    title?: string;
    body?: string;
}

class NotificationService {
    private expoPushToken: string | null = null;
    private notificationListener: Notifications.EventSubscription | null = null;
    private responseListener: Notifications.EventSubscription | null = null;

    /**
     * Initialize notifications and register for push notifications
     */
    async initialize(): Promise<string | null> {
        // Check if it's a physical device (push notifications don't work on simulators)
        if (!Device.isDevice) {
            console.log('Push notifications only work on physical devices');
            return null;
        }

        try {
            // Get existing permissions
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            // Request permission if not granted
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Push notification permission not granted');
                return null;
            }

            // Get the Expo push token
            // Use projectId from expo-constants (automatically set by EAS Build)
            const projectId = Constants.expoConfig?.extra?.eas?.projectId;
            
            if (!projectId) {
                console.warn('Project ID not found. Push notifications may not work correctly. Make sure to build with EAS Build.');
            }

            const tokenData = await Notifications.getExpoPushTokenAsync(
                projectId ? { projectId } : undefined
            );

            this.expoPushToken = tokenData.data;
            console.log('Expo Push Token:', this.expoPushToken);

            // Configure Android-specific settings
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'Default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#6366F1',
                });

                await Notifications.setNotificationChannelAsync('orders', {
                    name: 'Pedidos',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#10B981',
                    description: 'Notificações sobre novos pedidos e atualizações',
                });
            }

            return this.expoPushToken;
        } catch (error) {
            console.error('Error initializing notifications:', error);
            return null;
        }
    }

    /**
     * Register device token with backend for receiving push notifications
     */
    async registerTokenWithBackend(): Promise<void> {
        if (!this.expoPushToken) {
            console.log('No push token available to register');
            return;
        }

        try {
            // TODO: Implement backend endpoint to save device token
            // await api.registerPushToken({
            //     token: this.expoPushToken,
            //     platform: Platform.OS,
            // });
            console.log('Push token registered with backend (placeholder)');
        } catch (error) {
            console.error('Error registering push token:', error);
        }
    }

    /**
     * Set up notification event listeners
     */
    setupListeners(
        onNotificationReceived?: (notification: Notifications.Notification) => void,
        onNotificationResponse?: (response: Notifications.NotificationResponse) => void
    ): void {
        // Listener for notifications received while app is foregrounded
        this.notificationListener = Notifications.addNotificationReceivedListener(
            (notification) => {
                console.log('Notification received:', notification);
                onNotificationReceived?.(notification);
            }
        );

        // Listener for when user interacts with notification
        this.responseListener = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                console.log('Notification response:', response);
                const data = response.notification.request.content.data as NotificationData;
                this.handleNotificationResponse(data);
                onNotificationResponse?.(response);
            }
        );
    }

    /**
     * Handle notification tap/response
     */
    private handleNotificationResponse(data: NotificationData): void {
        // Navigate based on notification type
        switch (data.type) {
            case 'new_order':
            case 'order_paid':
                if (data.orderId) {
                    // TODO: Navigate to order details
                    console.log('Navigate to order:', data.orderId);
                }
                break;
            case 'promo':
                // TODO: Navigate to product/promo details
                console.log('Navigate to promo');
                break;
            default:
                console.log('Generic notification tapped');
        }
    }

    /**
     * Remove notification listeners
     */
    removeListeners(): void {
        if (this.notificationListener) {
            Notifications.removeNotificationSubscription(this.notificationListener);
        }
        if (this.responseListener) {
            Notifications.removeNotificationSubscription(this.responseListener);
        }
    }

    /**
     * Schedule a local notification (useful for testing)
     */
    async scheduleLocalNotification(
        title: string,
        body: string,
        data?: NotificationData,
        seconds: number = 1
    ): Promise<string> {
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data: data || { type: 'general' },
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds,
            },
        });

        console.log('Scheduled notification with ID:', id);
        return id;
    }

    /**
     * Cancel all scheduled notifications
     */
    async cancelAllNotifications(): Promise<void> {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }

    /**
     * Get the current push token
     */
    getPushToken(): string | null {
        return this.expoPushToken;
    }

    /**
     * Check if notifications are enabled
     */
    async areNotificationsEnabled(): Promise<boolean> {
        const { status } = await Notifications.getPermissionsAsync();
        return status === 'granted';
    }

    /**
     * Get badge count
     */
    async getBadgeCount(): Promise<number> {
        return await Notifications.getBadgeCountAsync();
    }

    /**
     * Set badge count
     */
    async setBadgeCount(count: number): Promise<void> {
        await Notifications.setBadgeCountAsync(count);
    }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export types for convenience
export type { Notifications };
