import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface GradientBackgroundProps {
    children: React.ReactNode;
    variant?: 'default' | 'hero' | 'clean';
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({ 
    children,
    variant = 'default'
}) => {
    if (variant === 'clean') {
        return (
            <View style={styles.cleanContainer}>
                {children}
            </View>
        );
    }

    if (variant === 'hero') {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={Colors.gradients.hero}
                    style={styles.heroGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.content}>
                    {children}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Fundo limpo e moderno */}
            <View style={styles.backgroundBase} />
            
            {/* Gradiente sutil no topo */}
            <LinearGradient
                colors={['rgba(16, 185, 129, 0.03)', 'transparent']}
                style={styles.topGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            />

            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    cleanContainer: {
        flex: 1,
        backgroundColor: Colors.backgroundLight,
    },
    backgroundBase: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.background,
    },
    topGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 300,
    },
    heroGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 280,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    content: {
        flex: 1,
        zIndex: 10,
    },
});
