import { GradientBackground } from '@/components/GradientBackground';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function MerchantProfileScreen() {
    const { user, loading, signOut } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            'Sair',
            'Deseja realmente sair da sua conta?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: signOut,
                },
            ]
        );
    };

    const handleSwitchRole = () => {
        Alert.alert(
            'Trocar Perfil',
            'Deseja trocar para o perfil de Consumidor?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Trocar',
                    onPress: () => router.replace('/select-role'),
                },
            ]
        );
    };

    if (loading) {
        return (
            <GradientBackground>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.secondary} />
                </View>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Perfil</Text>
                </View>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        {user?.photo_url ? (
                            <Image source={{ uri: user.photo_url }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={40} color={Colors.textMuted} />
                            </View>
                        )}
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.userName}>{user?.name || 'Usuário'}</Text>
                        <Text style={styles.userEmail}>{user?.email}</Text>
                        <View style={styles.roleBadge}>
                            <Ionicons name="storefront" size={12} color={Colors.secondary} />
                            <Text style={styles.roleText}>Lojista</Text>
                        </View>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Loja</Text>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/(merchant)/stores')}
                    >
                        <View style={[styles.menuIcon, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                            <Ionicons name="storefront-outline" size={20} color={Colors.secondary} />
                        </View>
                        <Text style={styles.menuText}>Minhas Lojas</Text>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.menuIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                            <Ionicons name="card-outline" size={20} color={Colors.success} />
                        </View>
                        <Text style={styles.menuText}>Dados Bancários</Text>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.menuIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                            <Ionicons name="diamond-outline" size={20} color={Colors.warning} />
                        </View>
                        <Text style={styles.menuText}>Plano Premium</Text>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>
                </View>

                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Preferências</Text>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleSwitchRole}
                    >
                        <View style={[styles.menuIcon, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                            <Ionicons name="swap-horizontal" size={20} color={Colors.primary} />
                        </View>
                        <Text style={styles.menuText}>Trocar para Consumidor</Text>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.menuIcon, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                            <Ionicons name="notifications-outline" size={20} color={Colors.secondary} />
                        </View>
                        <Text style={styles.menuText}>Notificações</Text>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.menuIcon, { backgroundColor: 'rgba(107, 114, 128, 0.15)' }]}>
                            <Ionicons name="help-circle-outline" size={20} color={Colors.textSecondary} />
                        </View>
                        <Text style={styles.menuText}>Ajuda</Text>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Logout */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                >
                    <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                    <Text style={styles.logoutText}>Sair da Conta</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Versão 1.0.0</Text>

                <View style={{ height: 100 }} />
            </ScrollView>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 24,
        padding: 20,
        backgroundColor: Colors.backgroundCard,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        marginBottom: 24,
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: Colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 8,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#FEF3C7', // Amber-100
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.secondary, // #F59E0B (Amber-500)
    },
    menuSection: {
        marginHorizontal: 24,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textMuted,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundCard,
        borderRadius: 14,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    menuText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: Colors.text,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 24,
        paddingVertical: 14,
        backgroundColor: Colors.error15,
        borderRadius: 14,
        gap: 8,
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.error,
    },
    versionText: {
        fontSize: 12,
        color: Colors.textMuted,
        textAlign: 'center',
        marginTop: 24,
    },
});
