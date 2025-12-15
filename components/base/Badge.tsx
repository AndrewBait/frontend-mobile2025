import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Colors } from '../../constants/Colors';
import { DesignTokens } from '../../constants/designTokens';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';
export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    size?: BadgeSize;
    icon?: keyof typeof Ionicons.glyphMap;
    iconPosition?: 'left' | 'right';
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
    label,
    variant = 'default',
    size = 'md',
    icon,
    iconPosition = 'left',
    style,
    textStyle,
}) => {
    const getVariantStyles = () => {
        switch (variant) {
            case 'primary':
                return {
                    container: { backgroundColor: Colors.primary20, borderColor: Colors.primary },
                    text: { color: Colors.primary },
                    iconColor: Colors.primary,
                };
            case 'success':
                return {
                    container: { backgroundColor: Colors.success20, borderColor: Colors.success },
                    text: { color: Colors.success },
                    iconColor: Colors.success,
                };
            case 'warning':
                return {
                    container: { backgroundColor: Colors.warning20, borderColor: Colors.warning },
                    text: { color: Colors.warning },
                    iconColor: Colors.warning,
                };
            case 'error':
                return {
                    container: { backgroundColor: Colors.error20, borderColor: Colors.error },
                    text: { color: Colors.error },
                    iconColor: Colors.error,
                };
            default:
                return {
                    container: { backgroundColor: Colors.glass, borderColor: Colors.glassBorder },
                    text: { color: Colors.textSecondary },
                    iconColor: Colors.textMuted,
                };
        }
    };

    const variantStyles = getVariantStyles();
    const iconSize = size === 'sm' ? 12 : 14;
    const textSize = size === 'sm' ? DesignTokens.typography.captionBold : DesignTokens.typography.smallBold;

    const renderIcon = () => {
        if (!icon) return null;
        return (
            <Ionicons
                name={icon}
                size={iconSize}
                color={variantStyles.iconColor}
                style={iconPosition === 'left' ? styles.iconLeft : styles.iconRight}
            />
        );
    };

    return (
        <View
            style={[
                styles.container,
                variantStyles.container,
                size === 'sm' ? styles.sizeSm : styles.sizeMd,
                style,
            ]}
        >
            {iconPosition === 'left' && renderIcon()}
            <Text style={[textSize, variantStyles.text, textStyle]}>{label}</Text>
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
    sizeSm: {
        paddingHorizontal: DesignTokens.spacing.sm,
        paddingVertical: DesignTokens.spacing.xs,
        gap: DesignTokens.spacing.xs,
    },
    sizeMd: {
        paddingHorizontal: DesignTokens.spacing.md,
        paddingVertical: DesignTokens.spacing.sm,
        gap: DesignTokens.spacing.sm,
    },
    iconLeft: {
        marginRight: -DesignTokens.spacing.xs,
    },
    iconRight: {
        marginLeft: -DesignTokens.spacing.xs,
    },
});
