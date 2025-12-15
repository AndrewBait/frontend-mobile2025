import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { DesignTokens } from '../../constants/designTokens';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    disabled?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
    hapticFeedback?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    accessibilityLabel?: string;
    accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    hapticFeedback = true,
    style,
    textStyle,
    accessibilityLabel,
    accessibilityHint,
}) => {
    const handlePress = () => {
        if (disabled || loading) return;
        
        if (hapticFeedback) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        
        onPress();
    };

    const isDisabled = disabled || loading;

    // Size styles
    const sizeStyles = {
        sm: {
            paddingVertical: DesignTokens.spacing.sm,
            paddingHorizontal: DesignTokens.spacing.md,
            minHeight: DesignTokens.touchTargets.min,
        },
        md: {
            paddingVertical: DesignTokens.spacing.md,
            paddingHorizontal: DesignTokens.spacing.lg,
            minHeight: DesignTokens.touchTargets.comfortable,
        },
        lg: {
            paddingVertical: DesignTokens.spacing.md + 4,
            paddingHorizontal: DesignTokens.spacing.xl,
            minHeight: DesignTokens.touchTargets.large,
        },
    };

    // Text size styles
    const textSizeStyles = {
        sm: DesignTokens.typography.smallBold,
        md: DesignTokens.typography.bodyBold,
        lg: DesignTokens.typography.h3,
    };

    // Variant styles
    const getVariantStyles = () => {
        switch (variant) {
            case 'primary':
                return {
                    container: styles.primaryContainer,
                    text: styles.primaryText,
                    gradient: Colors.gradients.primarySimple,
                };
            case 'secondary':
                return {
                    container: styles.secondaryContainer,
                    text: styles.secondaryText,
                    gradient: null,
                };
            case 'tertiary':
                return {
                    container: styles.tertiaryContainer,
                    text: styles.tertiaryText,
                    gradient: null,
                };
            case 'danger':
                return {
                    container: styles.dangerContainer,
                    text: styles.dangerText,
                    gradient: Colors.gradients.error,
                };
            default:
                return {
                    container: styles.primaryContainer,
                    text: styles.primaryText,
                    gradient: Colors.gradients.primarySimple,
                };
        }
    };

    const variantStyles = getVariantStyles();
    const currentSizeStyle = sizeStyles[size];
    const currentTextStyle = textSizeStyles[size];

    // Render button content
    const renderContent = () => (
        <View style={styles.content}>
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={variant === 'primary' || variant === 'danger' ? Colors.text : Colors.primary}
                />
            ) : (
                <>
                    {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
                    <Text
                        style={[
                            currentTextStyle,
                            variantStyles.text,
                            isDisabled && styles.disabledText,
                            textStyle,
                        ]}
                    >
                        {title}
                    </Text>
                    {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
                </>
            )}
        </View>
    );

    // Primary and Danger use gradient
    if (variantStyles.gradient && (variant === 'primary' || variant === 'danger')) {
        return (
            <TouchableOpacity
                onPress={handlePress}
                disabled={isDisabled}
                activeOpacity={0.8}
                style={[
                    styles.button,
                    currentSizeStyle,
                    fullWidth && styles.fullWidth,
                    isDisabled && styles.disabled,
                    style,
                ]}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel || title}
                accessibilityHint={accessibilityHint}
                accessibilityState={{ disabled: isDisabled }}
            >
                <LinearGradient
                    colors={variantStyles.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                        styles.gradient,
                        currentSizeStyle,
                        isDisabled && styles.disabledGradient,
                    ]}
                >
                    {renderContent()}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    // Secondary and Tertiary use solid colors
    return (
        <TouchableOpacity
            onPress={handlePress}
            disabled={isDisabled}
            activeOpacity={0.7}
            style={[
                styles.button,
                variantStyles.container,
                currentSizeStyle,
                fullWidth && styles.fullWidth,
                isDisabled && styles.disabled,
                style,
            ]}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel || title}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled: isDisabled }}
        >
            {renderContent()}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: DesignTokens.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        ...DesignTokens.shadows.sm,
    },
    gradient: {
        borderRadius: DesignTokens.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: DesignTokens.spacing.sm,
    },
    primaryContainer: {
        backgroundColor: Colors.primary,
    },
    primaryText: {
        color: Colors.text,
    },
    secondaryContainer: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: Colors.primary,
    },
    secondaryText: {
        color: Colors.primary,
    },
    tertiaryContainer: {
        backgroundColor: 'transparent',
    },
    tertiaryText: {
        color: Colors.text,
    },
    dangerContainer: {
        backgroundColor: Colors.error,
    },
    dangerText: {
        color: Colors.text,
    },
    disabled: {
        opacity: 0.5,
    },
    disabledGradient: {
        opacity: 0.5,
    },
    disabledText: {
        opacity: 0.7,
    },
    fullWidth: {
        width: '100%',
    },
    leftIcon: {
        marginRight: -DesignTokens.spacing.xs,
    },
    rightIcon: {
        marginLeft: -DesignTokens.spacing.xs,
    },
});
