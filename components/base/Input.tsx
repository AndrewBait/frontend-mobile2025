import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    NativeSyntheticEvent,
    StyleSheet,
    Text,
    TextInput,
    TextInputFocusEventData,
    TextInputProps,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { DesignTokens } from '../../constants/designTokens';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    leftIcon?: keyof typeof Ionicons.glyphMap;
    rightIcon?: keyof typeof Ionicons.glyphMap;
    onRightIconPress?: () => void;
    containerStyle?: ViewStyle;
    inputStyle?: ViewStyle;
    floatingLabel?: boolean;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    leftIcon,
    rightIcon,
    onRightIconPress,
    containerStyle,
    inputStyle,
    floatingLabel = false,
    placeholder,
    value,
    onFocus,
    onBlur,
    ...textInputProps
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!value);
    const labelPosition = useSharedValue(value ? 1 : 0);
    const labelScale = useSharedValue(value ? 0.85 : 1);

    const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        setIsFocused(true);
        labelPosition.value = withTiming(1, { duration: DesignTokens.animations.normal });
        labelScale.value = withTiming(0.85, { duration: DesignTokens.animations.normal });
        onFocus?.(e);
    };

    const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        setIsFocused(false);
        if (!value) {
            labelPosition.value = withTiming(0, { duration: DesignTokens.animations.normal });
            labelScale.value = withTiming(1, { duration: DesignTokens.animations.normal });
        }
        onBlur?.(e);
    };

    const handleChangeText = (text: string) => {
        setHasValue(text.length > 0);
        if (text.length > 0 && !hasValue) {
            labelPosition.value = withTiming(1, { duration: DesignTokens.animations.normal });
            labelScale.value = withTiming(0.85, { duration: DesignTokens.animations.normal });
        } else if (text.length === 0 && hasValue) {
            labelPosition.value = withTiming(0, { duration: DesignTokens.animations.normal });
            labelScale.value = withTiming(1, { duration: DesignTokens.animations.normal });
        }
        textInputProps.onChangeText?.(text);
    };

    const animatedLabelStyle = useAnimatedStyle(() => {
        const translateY = interpolate(labelPosition.value, [0, 1], [0, -28]);
        return {
            transform: [
                { translateY },
                { scale: labelScale.value },
            ],
        };
    });

    const animatedBorderStyle = useAnimatedStyle(() => {
        const borderColor = error
            ? Colors.error
            : isFocused
                ? Colors.primary
                : Colors.glassBorder;
        const borderWidth = isFocused ? 2 : 1;

        return {
            borderColor: withTiming(borderColor, { duration: DesignTokens.animations.fast }),
            borderWidth: withTiming(borderWidth, { duration: DesignTokens.animations.fast }),
        };
    });

    return (
        <View style={[styles.container, containerStyle]}>
            {label && !floatingLabel && (
                <Text style={[styles.label, error && styles.labelError]}>{label}</Text>
            )}
            <Animated.View style={[styles.inputContainer, animatedBorderStyle]}>
                {leftIcon && (
                    <View style={styles.leftIconContainer}>
                        <Ionicons
                            name={leftIcon}
                            size={20}
                            color={isFocused ? Colors.primary : Colors.textMuted}
                        />
                    </View>
                )}
                <View style={styles.inputWrapper}>
                    {floatingLabel && label && (
                        <Animated.View style={[styles.floatingLabelContainer, animatedLabelStyle]}>
                            <Text
                                style={[
                                    styles.floatingLabel,
                                    isFocused && styles.floatingLabelFocused,
                                    error && styles.floatingLabelError,
                                ]}
                            >
                                {label}
                            </Text>
                        </Animated.View>
                    )}
                    <TextInput
                        {...textInputProps}
                        value={value}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onChangeText={handleChangeText}
                        placeholder={floatingLabel && label ? undefined : placeholder}
                        placeholderTextColor={Colors.textMuted}
                        style={[
                            styles.input,
                            leftIcon && styles.inputWithLeftIcon,
                            rightIcon && styles.inputWithRightIcon,
                            inputStyle,
                        ]}
                        selectionColor={Colors.primary}
                        cursorColor={Colors.primary}
                    />
                </View>
                {rightIcon && (
                    <TouchableOpacity
                        style={styles.rightIconContainer}
                        onPress={onRightIconPress}
                        disabled={!onRightIconPress}
                    >
                        <Ionicons
                            name={rightIcon}
                            size={20}
                            color={error ? Colors.error : isFocused ? Colors.primary : Colors.textMuted}
                        />
                    </TouchableOpacity>
                )}
                {error && (
                    <View style={styles.errorIconContainer}>
                        <Ionicons name="alert-circle" size={18} color={Colors.error} />
                    </View>
                )}
            </Animated.View>
            {error && (
                <Text style={styles.errorText}>{error}</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: DesignTokens.spacing.md,
    },
    label: {
        ...DesignTokens.typography.smallBold,
        color: Colors.text,
        marginBottom: DesignTokens.spacing.sm,
    },
    labelError: {
        color: Colors.error,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.glass,
        borderRadius: DesignTokens.borderRadius.md,
        borderWidth: 1,
        minHeight: DesignTokens.touchTargets.min,
    },
    inputWrapper: {
        flex: 1,
        position: 'relative',
    },
    floatingLabelContainer: {
        position: 'absolute',
        left: DesignTokens.spacing.md,
        top: DesignTokens.spacing.md,
        zIndex: 1,
        backgroundColor: Colors.backgroundCard,
        paddingHorizontal: DesignTokens.spacing.xs,
    },
    floatingLabel: {
        ...DesignTokens.typography.small,
        color: Colors.textMuted,
    },
    floatingLabelFocused: {
        color: Colors.primary,
    },
    floatingLabelError: {
        color: Colors.error,
    },
    input: {
        ...DesignTokens.typography.body,
        color: Colors.text,
        paddingHorizontal: DesignTokens.spacing.md,
        paddingVertical: DesignTokens.spacing.md,
        minHeight: DesignTokens.touchTargets.min,
    },
    inputWithLeftIcon: {
        paddingLeft: DesignTokens.spacing.sm,
    },
    inputWithRightIcon: {
        paddingRight: DesignTokens.spacing.sm,
    },
    leftIconContainer: {
        paddingLeft: DesignTokens.spacing.md,
    },
    rightIconContainer: {
        paddingRight: DesignTokens.spacing.md,
    },
    errorIconContainer: {
        paddingRight: DesignTokens.spacing.md,
    },
    errorText: {
        ...DesignTokens.typography.caption,
        color: Colors.error,
        marginTop: DesignTokens.spacing.xs,
        marginLeft: DesignTokens.spacing.sm,
    },
});
