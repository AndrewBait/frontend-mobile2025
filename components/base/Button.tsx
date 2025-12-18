/**
 * Button - VenceJá Design System
 * 
 * Botão moderno com sombras coloridas, animações fluidas
 * e variantes para diferentes contextos
 */

import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'gradient';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
    const isDisabled = disabled || loading;
    const pressScale = useSharedValue(1);
    const pressOpacity = useSharedValue(1);

    // Get size config
    const sizeConfig = DesignTokens.components.button[size] || DesignTokens.components.button.md;

    // Animated styles
    const animatedContainerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pressScale.value }],
        opacity: pressOpacity.value,
    }));

    const handlePress = () => {
        if (isDisabled) return;
        if (hapticFeedback) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onPress();
    };

    const handlePressIn = () => {
        if (isDisabled) return;
        pressScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
        pressOpacity.value = withTiming(0.9, { duration: 100 });
    };

    const handlePressOut = () => {
        pressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
        pressOpacity.value = withTiming(1, { duration: 150 });
    };

    // Get variant styles
    const getVariantStyles = () => {
        switch (variant) {
            case 'primary':
                return {
                    container: styles.primaryContainer,
                    text: styles.primaryText,
                    spinnerColor: '#FFFFFF',
                    useGradient: false,
                    shadowStyle: styles.primaryShadow,
                };
            case 'secondary':
                return {
                    container: styles.secondaryContainer,
                    text: styles.secondaryText,
                    spinnerColor: Colors.text,
                    useGradient: false,
                    shadowStyle: styles.secondaryShadow,
                };
            case 'outline':
                return {
                    container: styles.outlineContainer,
                    text: styles.outlineText,
                    spinnerColor: Colors.primary,
                    useGradient: false,
                    shadowStyle: null,
                };
            case 'ghost':
                return {
                    container: styles.ghostContainer,
                    text: styles.ghostText,
                    spinnerColor: Colors.primary,
                    useGradient: false,
                    shadowStyle: null,
                };
            case 'danger':
                return {
                    container: styles.dangerContainer,
                    text: styles.dangerText,
                    spinnerColor: '#FFFFFF',
                    useGradient: false,
                    shadowStyle: styles.dangerShadow,
                };
            case 'success':
                return {
                    container: styles.successContainer,
                    text: styles.successText,
                    spinnerColor: '#FFFFFF',
                    useGradient: false,
                    shadowStyle: styles.successShadow,
                };
            case 'gradient':
                return {
                    container: styles.gradientContainer,
                    text: styles.gradientText,
                    spinnerColor: '#FFFFFF',
                    useGradient: true,
                    shadowStyle: styles.primaryShadow,
                };
            default:
                return {
                    container: styles.primaryContainer,
                    text: styles.primaryText,
                    spinnerColor: '#FFFFFF',
                    useGradient: false,
                    shadowStyle: styles.primaryShadow,
                };
        }
    };

    const variantStyles = getVariantStyles();

    const containerStyle = [
        styles.button,
        {
            minHeight: sizeConfig.height,
            paddingHorizontal: sizeConfig.paddingHorizontal,
        },
        variantStyles.container,
        !isDisabled && variantStyles.shadowStyle,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
    ];

    const textStyles = [
        styles.buttonText,
        { fontSize: sizeConfig.fontSize },
        variantStyles.text,
        textStyle,
    ];

    const renderContent = () => (
        <View style={styles.content}>
            {loading ? (
                <ActivityIndicator 
                    size="small" 
                    color={variantStyles.spinnerColor} 
                />
            ) : (
                <>
                    {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
                    <Text style={textStyles}>{title}</Text>
                    {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
                </>
            )}
        </View>
    );

    return (
        <AnimatedPressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isDisabled}
            style={[containerStyle, animatedContainerStyle]}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel || title}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled: isDisabled, busy: loading }}
        >
            {variantStyles.useGradient && !isDisabled ? (
                <>
                    <LinearGradient
                        colors={Colors.gradients.sunset}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientFill}
                    />
                    {renderContent()}
                </>
            ) : (
                renderContent()
            )}
        </AnimatedPressable>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: DesignTokens.borderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: DesignTokens.spacing.sm,
    },
    buttonText: {
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    gradientFill: {
        ...StyleSheet.absoluteFillObject,
    },
    fullWidth: {
        width: '100%',
    },
    disabled: {
        opacity: 0.5,
    },
    iconLeft: {
        marginRight: 2,
    },
    iconRight: {
        marginLeft: 2,
    },

    // ===== PRIMARY =====
    primaryContainer: {
        backgroundColor: Colors.primary,
    },
    primaryText: {
        color: '#FFFFFF',
    },
    primaryShadow: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
    },

    // ===== SECONDARY =====
    secondaryContainer: {
        backgroundColor: Colors.surfaceMuted,
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    secondaryText: {
        color: Colors.text,
    },
    secondaryShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },

    // ===== OUTLINE =====
    outlineContainer: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    outlineText: {
        color: Colors.primary,
    },

    // ===== GHOST =====
    ghostContainer: {
        backgroundColor: 'transparent',
    },
    ghostText: {
        color: Colors.primary,
    },

    // ===== DANGER =====
    dangerContainer: {
        backgroundColor: Colors.error,
    },
    dangerText: {
        color: '#FFFFFF',
    },
    dangerShadow: {
        shadowColor: Colors.error,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
    },

    // ===== SUCCESS =====
    successContainer: {
        backgroundColor: Colors.success,
    },
    successText: {
        color: '#FFFFFF',
    },
    successShadow: {
        shadowColor: Colors.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
    },

    // ===== GRADIENT =====
    gradientContainer: {
        backgroundColor: 'transparent',
    },
    gradientText: {
        color: '#FFFFFF',
    },
});
