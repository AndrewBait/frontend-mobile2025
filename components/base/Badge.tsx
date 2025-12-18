/**
 * Badge - VenceJá Design System
 * 
 * Componente de badge para status, tags e labels
 */

import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    size?: BadgeSize;
    icon?: keyof typeof Ionicons.glyphMap;
    iconPosition?: 'left' | 'right';
    style?: ViewStyle;
    textStyle?: TextStyle;
    solid?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
    label,
    variant = 'default',
    size = 'md',
    icon,
    iconPosition = 'left',
    style,
    textStyle,
    solid = false,
}) => {
    const getVariantStyles = () => {
        if (solid) {
            // Solid badges - filled background
            switch (variant) {
                case 'primary':
                    return {
                        container: { backgroundColor: Colors.primary, borderColor: Colors.primary },
                        text: { color: '#FFFFFF' },
                        iconColor: '#FFFFFF',
                    };
                case 'secondary':
                    return {
                        container: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
                        text: { color: '#FFFFFF' },
                        iconColor: '#FFFFFF',
                    };
                case 'success':
                    return {
                        container: { backgroundColor: Colors.success, borderColor: Colors.success },
                        text: { color: '#FFFFFF' },
                        iconColor: '#FFFFFF',
                    };
                case 'warning':
                    return {
                        container: { backgroundColor: Colors.warning, borderColor: Colors.warning },
                        text: { color: '#FFFFFF' },
                        iconColor: '#FFFFFF',
                    };
                case 'error':
                    return {
                        container: { backgroundColor: Colors.error, borderColor: Colors.error },
                        text: { color: '#FFFFFF' },
                        iconColor: '#FFFFFF',
                    };
                case 'info':
                    return {
                        container: { backgroundColor: Colors.info, borderColor: Colors.info },
                        text: { color: '#FFFFFF' },
                        iconColor: '#FFFFFF',
                    };
                default:
                    return {
                        container: { backgroundColor: Colors.textMuted, borderColor: Colors.textMuted },
                        text: { color: '#FFFFFF' },
                        iconColor: '#FFFFFF',
                    };
            }
        }

        // Soft badges - light background
        switch (variant) {
            case 'primary':
                return {
                    container: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
                    text: { color: '#047857' },
                    iconColor: '#059669',
                };
            case 'secondary':
                return {
                    container: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
                    text: { color: '#C2410C' },
                    iconColor: '#EA580C',
                };
            case 'success':
                return {
                    container: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
                    text: { color: '#166534' },
                    iconColor: '#22C55E',
                };
            case 'warning':
                return {
                    container: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
                    text: { color: '#B45309' },
                    iconColor: '#F59E0B',
                };
            case 'error':
                return {
                    container: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
                    text: { color: '#B91C1C' },
                    iconColor: '#EF4444',
                };
            case 'info':
                return {
                    container: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
                    text: { color: '#1D4ED8' },
                    iconColor: '#3B82F6',
                };
            default:
                return {
                    container: { backgroundColor: Colors.surfaceMuted, borderColor: Colors.border },
                    text: { color: Colors.textSecondary },
                    iconColor: Colors.textMuted,
                };
        }
    };

    const getSizeStyles = () => {
        switch (size) {
            case 'sm':
                return {
                    container: styles.sizeSm,
                    fontSize: 10,
                    iconSize: 10,
                };
            case 'lg':
                return {
                    container: styles.sizeLg,
                    fontSize: 14,
                    iconSize: 16,
                };
            default:
                return {
                    container: styles.sizeMd,
                    fontSize: 12,
                    iconSize: 14,
                };
        }
    };

    const variantStyles = getVariantStyles();
    const sizeStyles = getSizeStyles();

    const renderIcon = () => {
        if (!icon) return null;
        return (
            <Ionicons
                name={icon}
                size={sizeStyles.iconSize}
                color={variantStyles.iconColor}
            />
        );
    };

    return (
        <View
            style={[
                styles.container,
                variantStyles.container,
                sizeStyles.container,
                style,
            ]}
        >
            {iconPosition === 'left' && renderIcon()}
            <Text 
                style={[
                    styles.text, 
                    { fontSize: sizeStyles.fontSize },
                    variantStyles.text, 
                    textStyle
                ]}
            >
                {label}
            </Text>
            {iconPosition === 'right' && renderIcon()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderRadius: DesignTokens.borderRadius.full,
    },
    text: {
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    sizeSm: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        gap: 4,
    },
    sizeMd: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        gap: 5,
    },
    sizeLg: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        gap: 6,
    },
});
