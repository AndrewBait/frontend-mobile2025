import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

type PercentString = `${number}%`;

interface SkeletonProps {
    width?: number | PercentString;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
    variant?: 'rect' | 'circle';
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = 20,
    borderRadius = DesignTokens.borderRadius.sm,
    style,
    variant = 'rect',
}) => {
    const shimmer = useSharedValue(0);

    useEffect(() => {
        shimmer.value = withRepeat(
            withTiming(1, { duration: 1500 }),
            -1,
            false
        );
    }, [shimmer]);

    const animatedStyle = useAnimatedStyle(() => {
        const translateX = interpolate(shimmer.value, [0, 1], [-200, 200]);
        const opacity = interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.6, 0.3]);

        return {
            transform: [{ translateX }],
            opacity,
        };
    });

    const finalBorderRadius = variant === 'circle' ? 999 : borderRadius;
    const finalWidth = variant === 'circle' ? height : width;

    return (
        <View
            style={[
                styles.container,
                {
                    width: finalWidth,
                    height,
                    borderRadius: finalBorderRadius,
                },
                style,
            ]}
        >
            <Animated.View style={[styles.shimmer, animatedStyle]} />
        </View>
    );
};

// Skeleton para texto
interface SkeletonTextProps {
    lines?: number;
    width?: number | PercentString;
    lastLineWidth?: number | PercentString;
    style?: ViewStyle;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
    lines = 3,
    width = '100%',
    lastLineWidth = '60%',
    style,
}) => {
    return (
        <View style={[styles.textContainer, style]}>
            {Array.from({ length: lines }).map((_, index) => (
                <Skeleton
                    key={index}
                    width={index === lines - 1 ? lastLineWidth : width}
                    height={16}
                    style={index < lines - 1 ? styles.textLine : undefined}
                />
            ))}
        </View>
    );
};

// Skeleton para card de produto
export const SkeletonProductCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
    return (
        <View style={[styles.cardContainer, style]}>
            <Skeleton width="100%" height={180} borderRadius={DesignTokens.borderRadius.lg} />
            <View style={styles.cardContent}>
                <Skeleton width="60%" height={14} style={styles.cardSpacing} />
                <Skeleton width="100%" height={16} style={styles.cardSpacing} />
                <Skeleton width="80%" height={16} style={styles.cardSpacing} />
                <Skeleton width="100%" height={36} borderRadius={DesignTokens.borderRadius.md} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#E5E7EB', // Gray-200
        overflow: 'hidden',
        position: 'relative',
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#F3F4F6', // Gray-100 (highlight)
        width: '50%',
    },
    textContainer: {
        gap: DesignTokens.spacing.sm,
    },
    textLine: {
        marginBottom: DesignTokens.spacing.sm,
    },
    cardContainer: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: DesignTokens.borderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        overflow: 'hidden',
        padding: DesignTokens.spacing.md,
    },
    cardContent: {
        marginTop: DesignTokens.spacing.md,
    },
    cardSpacing: {
        marginBottom: DesignTokens.spacing.sm,
    },
});
