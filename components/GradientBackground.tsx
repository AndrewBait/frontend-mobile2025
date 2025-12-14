import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface GradientBackgroundProps {
    children: React.ReactNode;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({ children }) => {
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F0F23', '#1A1A2E', '#16213E']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Decorative orbs */}
            <View style={[styles.orb, styles.orb1]} />
            <View style={[styles.orb, styles.orb2]} />
            <View style={[styles.orb, styles.orb3]} />

            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F23',
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    content: {
        flex: 1,
        zIndex: 10,
    },
    orb: {
        position: 'absolute',
        borderRadius: 999,
        opacity: 0.3,
    },
    orb1: {
        width: width * 0.8,
        height: width * 0.8,
        backgroundColor: '#6366F1',
        top: -width * 0.4,
        right: -width * 0.3,
        opacity: 0.15,
    },
    orb2: {
        width: width * 0.6,
        height: width * 0.6,
        backgroundColor: '#EC4899',
        bottom: height * 0.1,
        left: -width * 0.3,
        opacity: 0.1,
    },
    orb3: {
        width: width * 0.4,
        height: width * 0.4,
        backgroundColor: '#8B5CF6',
        top: height * 0.4,
        right: -width * 0.2,
        opacity: 0.12,
    },
});
