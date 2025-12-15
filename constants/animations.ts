/**
 * Animações Reutilizáveis
 * 
 * Funções helper para criar animações comuns usando react-native-reanimated
 */

import React from 'react';
import {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { DesignTokens } from './designTokens';

/**
 * Animação de fade-in
 */
export const useFadeIn = (duration: number = DesignTokens.animations.normal) => {
    const opacity = useSharedValue(0);

    const fadeIn = () => {
        opacity.value = withTiming(1, { duration });
    };

    const fadeOut = (onComplete?: () => void) => {
        opacity.value = withTiming(0, { duration }, () => {
            if (onComplete) {
                runOnJS(onComplete)();
            }
        });
    };

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return { fadeIn, fadeOut, animatedStyle, opacity };
};

/**
 * Animação de slide-up
 */
export const useSlideUp = (
    fromY: number = 50,
    duration: number = DesignTokens.animations.normal
) => {
    const translateY = useSharedValue(fromY);
    const opacity = useSharedValue(0);

    const slideIn = () => {
        translateY.value = withSpring(0, {
            damping: 15,
            stiffness: 150,
        });
        opacity.value = withTiming(1, { duration });
    };

    const slideOut = (onComplete?: () => void) => {
        translateY.value = withTiming(fromY, { duration });
        opacity.value = withTiming(0, { duration }, () => {
            if (onComplete) {
                runOnJS(onComplete)();
            }
        });
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    return { slideIn, slideOut, animatedStyle, translateY, opacity };
};

/**
 * Animação de scale
 */
export const useScale = (initialScale: number = 0.9) => {
    const scale = useSharedValue(initialScale);
    const opacity = useSharedValue(0);

    const scaleIn = () => {
        scale.value = withSpring(1, {
            damping: 15,
            stiffness: 150,
        });
        opacity.value = withTiming(1, { duration: DesignTokens.animations.normal });
    };

    const scaleOut = (onComplete?: () => void) => {
        scale.value = withTiming(initialScale, { duration: DesignTokens.animations.normal });
        opacity.value = withTiming(0, { duration: DesignTokens.animations.normal }, () => {
            if (onComplete) {
                runOnJS(onComplete)();
            }
        });
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return { scaleIn, scaleOut, animatedStyle, scale, opacity };
};

/**
 * Animação de press (scale down)
 */
export const usePressScale = () => {
    const scale = useSharedValue(1);

    const pressIn = () => {
        scale.value = withTiming(0.95, { duration: DesignTokens.animations.fast });
    };

    const pressOut = () => {
        scale.value = withSpring(1, {
            damping: 15,
            stiffness: 300,
        });
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return { pressIn, pressOut, animatedStyle };
};

/**
 * Animação de stagger (para listas)
 */
export const useStaggerAnimation = (index: number, delay: number = 50) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    const start = () => {
        opacity.value = withTiming(1, {
            duration: DesignTokens.animations.normal,
        });
        translateY.value = withSpring(0, {
            damping: 15,
            stiffness: 150,
        });
    };

    // Delay baseado no índice
    setTimeout(() => {
        start();
    }, index * delay);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return { animatedStyle };
};

/**
 * Animação de pulse
 */
export const usePulse = (minScale: number = 0.95, maxScale: number = 1.05) => {
    const scale = useSharedValue(1);

    React.useEffect(() => {
        scale.value = withRepeat(
            withTiming(maxScale, { duration: 1000 }),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return { animatedStyle };
};
