import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { Button, ButtonVariant } from '@/components/base/Button';

interface EmptyStateProps {
    icon?: keyof typeof Ionicons.glyphMap;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
    secondaryActionVariant?: ButtonVariant;
    style?: ViewStyle;
    animated?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon = 'search-outline',
    title,
    message,
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
    secondaryActionVariant = 'ghost',
    style,
    animated = true,
}) => {
    const pulse = useSharedValue(0);

    React.useEffect(() => {
        if (animated) {
            pulse.value = withRepeat(
                withTiming(1, { duration: 2000 }),
                -1,
                true
            );
        }
    }, [animated]);

    const animatedStyle = useAnimatedStyle(() => {
        if (!animated) return {};
        
        const scale = interpolate(pulse.value, [0, 1], [1, 1.05]);
        const opacity = interpolate(pulse.value, [0, 1], [0.8, 1]);

        return {
            transform: [{ scale }],
            opacity,
        };
    });

    return (
        <View style={[styles.container, style]}>
            <Animated.View style={[styles.iconContainer, animatedStyle]}>
                <Ionicons name={icon} size={64} color={Colors.textMuted} />
            </Animated.View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            {actionLabel && onAction && (
                <Button
                    title={actionLabel}
                    onPress={onAction}
                    variant="primary"
                    size="md"
                    style={styles.actionButton}
                />
            )}
            {secondaryActionLabel && onSecondaryAction && (
                <Button
                    title={secondaryActionLabel}
                    onPress={onSecondaryAction}
                    variant={secondaryActionVariant}
                    size="md"
                    style={styles.secondaryActionButton}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: DesignTokens.spacing.xxl,
        paddingVertical: DesignTokens.spacing.xl,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: DesignTokens.spacing.lg,
    },
    title: {
        ...DesignTokens.typography.h3,
        color: Colors.text,
        marginBottom: DesignTokens.spacing.sm,
        textAlign: 'center',
    },
    message: {
        ...DesignTokens.typography.body,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: DesignTokens.spacing.lg,
        lineHeight: 22,
    },
    actionButton: {
        marginTop: DesignTokens.spacing.md,
    },
    secondaryActionButton: {
        marginTop: DesignTokens.spacing.sm,
    },
});
