import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../components/GradientBackground';
import { Colors } from '../constants/Colors';
import { api } from '../services/api';
import { supabase } from '../services/supabase';

export default function SelectRoleScreen() {
    const [loading, setLoading] = useState<'customer' | 'merchant' | null>(null);
    const [userName, setUserName] = useState('');

    useEffect(() => {
        loadUserName();
    }, []);

    const loadUserName = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.name) {
                setUserName(user.user_metadata.name.split(' ')[0]);
            }
        } catch (error) {
            console.error('Error loading user:', error);
        }
    };

    const selectRole = async (role: 'customer' | 'merchant') => {
        setLoading(role);
        console.log('Selecting role:', role);

        // Just navigate to the registration form - role will be saved when form is submitted
        console.log('Navigating to registration form for:', role);

        if (role === 'customer') {
            // Go to customer setup form with role param
            router.replace({ pathname: '/(customer)/setup', params: { pendingRole: 'customer' } });
        } else {
            // Go to store creation form with role param
            router.replace({ pathname: '/(merchant)/create-store', params: { pendingRole: 'merchant' } });
        }

        setLoading(null);
    };

    return (
        <GradientBackground>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.greeting}>
                        Olá{userName ? `, ${userName}` : ''}! 👋
                    </Text>
                    <Text style={styles.title}>Como vai usar o app?</Text>
                </View>

                {/* Role Cards */}
                <View style={styles.cardsContainer}>
                    {/* Customer Card */}
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => selectRole('customer')}
                        disabled={loading !== null}
                        activeOpacity={0.85}
                    >
                        <View style={[styles.cardIcon, { backgroundColor: Colors.primary + '20' }]}>
                            {loading === 'customer' ? (
                                <ActivityIndicator color={Colors.primary} />
                            ) : (
                                <Ionicons name="cart" size={28} color={Colors.primary} />
                            )}
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>Consumidor</Text>
                            <Text style={styles.cardDescription}>Comprar com até 95% off</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>

                    {/* Merchant Card */}
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => selectRole('merchant')}
                        disabled={loading !== null}
                        activeOpacity={0.85}
                    >
                        <View style={[styles.cardIcon, { backgroundColor: Colors.secondary + '20' }]}>
                            {loading === 'merchant' ? (
                                <ActivityIndicator color={Colors.secondary} />
                            ) : (
                                <Ionicons name="storefront" size={28} color={Colors.secondary} />
                            )}
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>Lojista</Text>
                            <Text style={styles.cardDescription}>Vender e reduzir desperdício</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    Você pode mudar depois nas configurações
                </Text>
            </View>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 100,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 40,
    },
    greeting: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginBottom: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
    },
    cardsContainer: {
        gap: 16,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        padding: 20,
        gap: 16,
    },
    cardIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 24,
        right: 24,
        textAlign: 'center',
        fontSize: 13,
        color: Colors.textMuted,
    },
});
