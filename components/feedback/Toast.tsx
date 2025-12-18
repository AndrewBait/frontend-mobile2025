import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type?: ToastType;
    visible: boolean;
    duration?: number;
    onHide?: () => void;
    action?: {
        label: string;
        onPress: () => void;
    };
}

export const Toast: React.FC<ToastProps> = ({
    message,
    type = 'info',
    visible,
    duration = 3000,
    onHide,
    action,
}) => {
    const [shouldRender, setShouldRender] = useState(visible);
    const mountedRef = useRef(true);
    const translateY = useSharedValue(-100);
    const opacity = useSharedValue(0);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const handleHidden = useCallback(() => {
        if (!mountedRef.current) return;
        setShouldRender(false);
        onHide?.();
    }, [onHide]);

    const hideToast = useCallback(() => {
        translateY.value = withTiming(-100, { duration: DesignTokens.animations.normal });
        opacity.value = withTiming(0, { duration: DesignTokens.animations.normal }, () => {
            runOnJS(handleHidden)();
        });
    }, [handleHidden, opacity, translateY]);

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            translateY.value = withSpring(0, {
                damping: 15,
                stiffness: 150,
            });
            opacity.value = withTiming(1, { duration: DesignTokens.animations.normal });
            
            if (duration > 0) {
                const timer = setTimeout(() => {
                    hideToast();
                }, duration);
                return () => clearTimeout(timer);
            }
        } else if (shouldRender) {
            hideToast();
        }
    }, [duration, hideToast, opacity, shouldRender, translateY, visible]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
            opacity: opacity.value,
        };
    });

    const getTypeStyles = () => {
        switch (type) {
            case 'success':
                return {
                    backgroundColor: '#DCFCE7', // Green-100
                    borderColor: Colors.primary, // #059669
                    icon: 'checkmark-circle' as const,
                    iconColor: Colors.primary, // #059669
                };
            case 'error':
                return {
                    backgroundColor: '#FEE2E2', // Red-100
                    borderColor: Colors.error, // #EF4444
                    icon: 'alert-circle' as const,
                    iconColor: Colors.error, // #EF4444
                };
            case 'warning':
                return {
                    backgroundColor: '#FEF3C7', // Amber-100
                    borderColor: Colors.warning, // #FB923C
                    icon: 'warning' as const,
                    iconColor: Colors.warning, // #FB923C
                };
            default:
                return {
                    backgroundColor: '#EFF6FF', // Blue-100
                    borderColor: '#3B82F6', // Blue-500
                    icon: 'information-circle' as const,
                    iconColor: '#3B82F6', // Blue-500
                };
        }
    };

    const typeStyles = getTypeStyles();

    if (!shouldRender) {
        return null;
    }

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <View style={[styles.toast, typeStyles]}>
                <Ionicons name={typeStyles.icon} size={20} color={typeStyles.iconColor} />
                <Text style={styles.message}>{message}</Text>
                {action && (
                    <TouchableOpacity onPress={action.onPress} style={styles.actionButton}>
                        <Text style={[styles.actionText, { color: typeStyles.iconColor }]}>
                            {action.label}
                        </Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
                    <Ionicons name="close" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

// Hook para gerenciar Toast globalmente
interface ToastState {
    message: string;
    type: ToastType;
    visible: boolean;
    action?: { label: string; onPress: () => void };
}

let toastState: ToastState = {
    message: '',
    type: 'info',
    visible: false,
};

let toastListeners: ((state: ToastState) => void)[] = [];

export const useToast = () => {
    const [state, setState] = React.useState<ToastState>(toastState);

    useEffect(() => {
        const listener = (newState: ToastState) => {
            setState(newState);
        };
        toastListeners.push(listener);
        return () => {
            toastListeners = toastListeners.filter((l) => l !== listener);
        };
    }, []);

    const showToast = (
        message: string,
        type: ToastType = 'info',
        duration?: number,
        action?: { label: string; onPress: () => void }
    ) => {
        toastState = {
            message,
            type,
            visible: true,
            action,
        };
        toastListeners.forEach((listener) => listener(toastState));

        if (duration !== undefined && duration > 0) {
            setTimeout(() => {
                hideToast();
            }, duration);
        }
    };

    const hideToast = () => {
        toastState = { ...toastState, visible: false };
        toastListeners.forEach((listener) => listener(toastState));
    };

    return {
        toast: state,
        showToast,
        hideToast,
    };
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60,
        left: DesignTokens.spacing.lg,
        right: DesignTokens.spacing.lg,
        zIndex: 9999,
        ...DesignTokens.shadows.lg,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: DesignTokens.spacing.md,
        borderRadius: DesignTokens.borderRadius.md,
        borderWidth: 1,
        gap: DesignTokens.spacing.sm,
    },
    message: {
        ...DesignTokens.typography.body,
        color: Colors.text, // Texto escuro para contraste
        flex: 1,
    },
    actionButton: {
        paddingHorizontal: DesignTokens.spacing.sm,
    },
    actionText: {
        ...DesignTokens.typography.smallBold,
    },
    closeButton: {
        padding: DesignTokens.spacing.xs,
    },
});
