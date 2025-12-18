import React from 'react';
import { StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';

interface GradientButtonProps {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'outline';
}

export const GradientButton: React.FC<GradientButtonProps> = ({
    title,
    onPress,
    loading = false,
    disabled = false,
    variant = 'primary',
}) => {
    if (variant === 'outline') {
        return (
            <TouchableOpacity
                style={[styles.outlineButton, disabled && styles.disabled]}
                onPress={onPress}
                disabled={disabled || loading}
                activeOpacity={0.8}
            >
                {loading ? (
                    <ActivityIndicator color={Colors.primary} />
                ) : (
                    <Text style={styles.outlineText}>{title}</Text>
                )}
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            style={[disabled && styles.disabled]}
        >
            <LinearGradient
                colors={
                    variant === 'secondary'
                        ? [Colors.secondary, Colors.secondaryDark]
                        : [Colors.gradientStart, Colors.gradientMiddle, Colors.gradientEnd]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
            >
                {loading ? (
                    <ActivityIndicator color={Colors.text} />
                ) : (
                    <Text style={styles.text}>{title}</Text>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    gradient: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    text: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    outlineButton: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: Colors.primary,
        backgroundColor: 'transparent',
    },
    outlineText: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    disabled: {
        opacity: 0.5,
    },
});
