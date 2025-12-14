import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../services/supabase';
import { api } from '../../services/api';
import { GradientBackground } from '../../components/GradientBackground';
import { Colors } from '../../constants/Colors';

export default function AuthCallbackScreen() {
    useEffect(() => {
        handleCallback();
    }, []);

    const handleCallback = async () => {
        try {
            // Get the current URL
            const url = await Linking.getInitialURL();
            console.log('Callback URL:', url);

            if (url) {
                // Extract hash part (after #)
                const hashIndex = url.indexOf('#');
                if (hashIndex !== -1) {
                    const hashPart = url.substring(hashIndex + 1);
                    const hashParams = new URLSearchParams(hashPart);

                    const accessToken = hashParams.get('access_token');
                    const refreshToken = hashParams.get('refresh_token');

                    console.log('Access Token found:', !!accessToken);
                    console.log('Refresh Token found:', !!refreshToken);

                    if (accessToken && refreshToken) {
                        // Set session in Supabase
                        const { data, error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });

                        console.log('Session set:', !!data.session);
                        if (error) {
                            console.error('Session error:', error);
                            throw error;
                        }

                        // Redirect after successful session
                        redirectToApp();
                        return;
                    }
                }
            }

            // If no tokens in URL, check for existing session
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                redirectToApp();
            } else {
                // No session, go back to login
                console.log('No session found, redirecting to login');
                router.replace('/');
            }
        } catch (error) {
            console.error('Callback error:', error);
            router.replace('/');
        }
    };

    const redirectToApp = async () => {
        try {
            const profile = await api.getProfile();
            console.log('Profile:', profile);

            if (profile.role === 'customer') {
                router.replace('/(customer)');
            } else if (profile.role === 'merchant') {
                router.replace('/(merchant)');
            } else {
                router.replace('/select-role');
            }
        } catch (error) {
            console.log('Profile not found, going to select-role');
            router.replace('/select-role');
        }
    };

    return (
        <GradientBackground>
            <View style={styles.container}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.text}>Autenticando...</Text>
            </View>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    text: {
        color: Colors.textSecondary,
        fontSize: 16,
    },
});
