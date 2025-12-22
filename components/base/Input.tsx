/**
 * Input - VenceJá Design System
 * 
 * Campo de entrada moderno com animações suaves,
 * estados visuais claros e excelente UX
 */

import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: keyof typeof Ionicons.glyphMap;
    rightIcon?: keyof typeof Ionicons.glyphMap;
    onRightIconPress?: () => void;
    containerStyle?: ViewStyle;
    inputStyle?: TextStyle;
    floatingLabel?: boolean;
    required?: boolean;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    onRightIconPress,
    containerStyle,
    inputStyle,
    floatingLabel = false,
    required = false,
    placeholder,
    value,
    onFocus,
    onBlur,
    ...textInputProps
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const focusAnimation = useSharedValue(0);
    const labelPosition = useSharedValue(value ? 1 : 0);

    const handleFocus: NonNullable<TextInputProps['onFocus']> = (e) => {
        setIsFocused(true);
        focusAnimation.value = withSpring(1, { damping: 15, stiffness: 200 });
        if (floatingLabel) {
            labelPosition.value = withTiming(1, { duration: 200 });
        }
        onFocus?.(e);
    };

    const handleBlur: NonNullable<TextInputProps['onBlur']> = (e) => {
        setIsFocused(false);
        focusAnimation.value = withSpring(0, { damping: 15, stiffness: 200 });
        if (floatingLabel && !value) {
            labelPosition.value = withTiming(0, { duration: 200 });
        }
        onBlur?.(e);
    };

    const handleChangeText = (text: string) => {
        if (floatingLabel) {
            if (text.length > 0) {
                labelPosition.value = withTiming(1, { duration: 200 });
            } else if (!isFocused) {
                labelPosition.value = withTiming(0, { duration: 200 });
            }
        }
        textInputProps.onChangeText?.(text);
    };

    // Animated border style
    const animatedContainerStyle = useAnimatedStyle(() => {
        return {
            borderColor: error ? Colors.error : isFocused ? Colors.primary : Colors.border,
            borderWidth: isFocused ? 2 : 1.5,
            transform: [
                {
                    scale: interpolate(focusAnimation.value, [0, 0.5, 1], [1, 0.995, 1]),
                },
            ],
        };
    });

    // Floating label animation
    const animatedLabelStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateY: interpolate(labelPosition.value, [0, 1], [0, -26]) },
                { scale: interpolate(labelPosition.value, [0, 1], [1, 0.85]) },
            ],
            opacity: interpolate(labelPosition.value, [0, 0.5, 1], [0.7, 0.9, 1]),
        };
    });

    const hasError = !!error;
    const leftIconPadding = leftIcon ? 48 : 16;

    return (
        <View style={[styles.container, containerStyle]}>
            {/* Fixed Label */}
            {label && !floatingLabel && (
                <View style={styles.labelRow}>
                    <Text style={[styles.label, hasError && styles.labelError]}>
                        {label}
                        {required && <Text style={styles.required}> *</Text>}
                    </Text>
                </View>
            )}

            {/* Input Container */}
            <Animated.View
                style={[
                    styles.inputContainer,
                    hasError && styles.inputContainerError,
                    animatedContainerStyle,
                ]}
            >
                {/* Left Icon */}
                {leftIcon && (
                    <View style={styles.leftIconContainer}>
                        <Ionicons
                            name={leftIcon}
                            size={22}
                            color={hasError ? Colors.error : isFocused ? Colors.primary : Colors.textMuted}
                        />
                    </View>
                )}

                {/* Input Wrapper */}
                <View style={styles.inputWrapper}>
                    {/* Floating Label */}
                    {floatingLabel && label && (
                        <Animated.View
                            style={[
                                styles.floatingLabelContainer,
                                { left: leftIconPadding },
                                animatedLabelStyle,
                            ]}
                            pointerEvents="none"
                        >
                            <View style={styles.floatingLabelBackground}>
                                <Text
                                    style={[
                                        styles.floatingLabel,
                                        isFocused && styles.floatingLabelFocused,
                                        hasError && styles.floatingLabelError,
                                    ]}
                                >
                                    {label}
                                    {required && <Text style={styles.required}> *</Text>}
                                </Text>
                            </View>
                        </Animated.View>
                    )}

                    {/* Text Input */}
                    <TextInput
                        {...textInputProps}
                        value={value}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onChangeText={handleChangeText}
                        placeholder={floatingLabel ? undefined : placeholder}
                        placeholderTextColor={Colors.textMuted}
                        style={[
                            styles.input,
                            leftIcon && styles.inputWithLeftIcon,
                            (rightIcon || hasError) && styles.inputWithRightIcon,
                            inputStyle,
                        ]}
                        selectionColor={Colors.primary}
                        cursorColor={Colors.primary}
                    />
                </View>

                {/* Right Icon */}
                {rightIcon && !hasError && (
                    <TouchableOpacity
                        style={styles.rightIconContainer}
                        onPress={onRightIconPress}
                        disabled={!onRightIconPress}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={rightIcon}
                            size={22}
                            color={isFocused ? Colors.primary : Colors.textMuted}
                        />
                    </TouchableOpacity>
                )}

                {/* Error Icon */}
                {hasError && (
                    <View style={styles.errorIconContainer}>
                        <Ionicons name="alert-circle" size={22} color={Colors.error} />
                    </View>
                )}
            </Animated.View>

            {/* Error or Hint Message */}
            {(error || hint) && (
                <View style={styles.messageContainer}>
                    {hasError ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : hint ? (
                        <Text style={styles.hintText}>{hint}</Text>
                    ) : null}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: DesignTokens.spacing.md,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: DesignTokens.spacing.sm,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        letterSpacing: 0.1,
    },
    labelError: {
        color: Colors.error,
    },
    required: {
        color: Colors.error,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundLight,
        borderRadius: DesignTokens.borderRadius.lg,
        borderWidth: 1.5,
        borderColor: Colors.border,
        minHeight: 56,
        overflow: 'hidden',
    },
    inputContainerError: {
        borderColor: Colors.error,
        backgroundColor: Colors.error05,
    },
    inputWrapper: {
        flex: 1,
        position: 'relative',
        justifyContent: 'center',
    },
    floatingLabelContainer: {
        position: 'absolute',
        top: 18,
        zIndex: 1,
    },
    floatingLabelBackground: {
        backgroundColor: Colors.backgroundLight,
        paddingHorizontal: 4,
    },
    floatingLabel: {
        fontSize: 15,
        color: Colors.textMuted,
        fontWeight: '500',
    },
    floatingLabelFocused: {
        color: Colors.primary,
    },
    floatingLabelError: {
        color: Colors.error,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: Colors.text,
        paddingHorizontal: 16,
        paddingVertical: 16,
        minHeight: 56,
    },
    inputWithLeftIcon: {
        paddingLeft: 8,
    },
    inputWithRightIcon: {
        paddingRight: 8,
    },
    leftIconContainer: {
        width: 48,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightIconContainer: {
        width: 48,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorIconContainer: {
        width: 48,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    messageContainer: {
        marginTop: DesignTokens.spacing.xs,
        paddingHorizontal: 4,
    },
    errorText: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.error,
        lineHeight: 18,
    },
    hintText: {
        fontSize: 13,
        fontWeight: '400',
        color: Colors.textMuted,
        lineHeight: 18,
    },
});
