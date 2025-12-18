import { GradientBackground } from '@/components/GradientBackground';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomerProfileScreen() {
    const insets = useSafeAreaInsets();
    const screenPaddingTop = insets.top + DesignTokens.spacing.md;
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
            'Deseja trocar para o perfil de Lojista?',
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
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <ScrollView
                style={styles.container}
                contentContainerStyle={[styles.contentContainer, { paddingTop: screenPaddingTop }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Perfil</Text>
                </View>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        {user?.photo_url ? (
                            <Image
                                source={{ uri: user.photo_url }}
                                style={styles.avatar}
                                contentFit="cover"
                                transition={200}
                            />
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
                            <Ionicons name="cart" size={12} color={Colors.primary} />
                            <Text style={styles.roleText}>Consumidor</Text>
                        </View>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Conta</Text>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/(customer)/setup')}
                    >
                        <View style={[styles.menuIcon, styles.menuIconPrimary]}>
                            <Ionicons name="person-outline" size={20} color={Colors.primary} />
                        </View>
                        <Text style={styles.menuText}>Editar Perfil</Text>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.menuIcon, styles.menuIconSuccess]}>
                            <Ionicons name="location-outline" size={20} color={Colors.success} />
                        </View>
                        <Text style={styles.menuText}>Endereços</Text>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.menuIcon, styles.menuIconSecondary]}>
                            <Ionicons name="notifications-outline" size={20} color={Colors.secondary} />
                        </View>
                        <Text style={styles.menuText}>Notificações</Text>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>
                </View>

                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Preferências</Text>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleSwitchRole}
                    >
                        <View style={[styles.menuIcon, styles.menuIconSecondary]}>
                            <Ionicons name="swap-horizontal" size={20} color={Colors.secondary} />
                        </View>
                        <Text style={styles.menuText}>Trocar para Lojista</Text>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.menuIcon, styles.menuIconWarning]}>
                            <Ionicons name="help-circle-outline" size={20} color={Colors.warning} />
                        </View>
                        <Text style={styles.menuText}>Ajuda</Text>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.menuIcon, styles.menuIconNeutral]}>
                            <Ionicons name="document-text-outline" size={20} color={Colors.textSecondary} />
                        </View>
                        <Text style={styles.menuText}>Termos de Uso</Text>
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
    },
    contentContainer: {
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        paddingHorizontal: DesignTokens.spacing.lg,
        marginBottom: DesignTokens.spacing.lg,
    },
    title: {
        ...DesignTokens.typography.h1,
        color: Colors.text,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: DesignTokens.spacing.lg,
        padding: DesignTokens.spacing.lg,
        backgroundColor: Colors.backgroundCard,
        borderRadius: DesignTokens.borderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        marginBottom: DesignTokens.spacing.lg,
        ...DesignTokens.shadows.sm,
    },
    avatarContainer: {
        marginRight: DesignTokens.spacing.md,
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
        backgroundColor: Colors.inputBackground,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileInfo: {
        flex: 1,
    },
    userName: {
        ...DesignTokens.typography.h3,
        color: Colors.text,
        marginBottom: DesignTokens.spacing.xs,
    },
    userEmail: {
        ...DesignTokens.typography.small,
        color: Colors.textSecondary,
        marginBottom: DesignTokens.spacing.sm,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#ECFDF5', // Emerald-50
        paddingHorizontal: DesignTokens.spacing.sm + 2,
        paddingVertical: DesignTokens.spacing.xs,
        borderRadius: DesignTokens.borderRadius.sm,
        gap: DesignTokens.spacing.xs,
    },
    roleText: {
        ...DesignTokens.typography.captionBold,
        color: Colors.primary,
    },
    menuSection: {
        marginHorizontal: DesignTokens.spacing.lg,
        marginBottom: DesignTokens.spacing.lg,
    },
    sectionTitle: {
        ...DesignTokens.typography.captionBold,
        color: Colors.textMuted,
        marginBottom: DesignTokens.spacing.md - 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundCard,
        borderRadius: DesignTokens.borderRadius.lg,
        padding: DesignTokens.spacing.md - 2,
        marginBottom: DesignTokens.spacing.sm,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        ...DesignTokens.shadows.sm,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: DesignTokens.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: DesignTokens.spacing.md - 4,
    },
    menuIconPrimary: {
        backgroundColor: Colors.primary15,
    },
    menuIconSuccess: {
        backgroundColor: Colors.success15,
    },
    menuIconSecondary: {
        backgroundColor: Colors.secondary15,
    },
    menuIconWarning: {
        backgroundColor: Colors.warning15,
    },
    menuIconNeutral: {
        backgroundColor: Colors.glassStrong,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    menuText: {
        flex: 1,
        ...DesignTokens.typography.body,
        color: Colors.text,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: DesignTokens.spacing.lg,
        paddingVertical: DesignTokens.spacing.md - 2,
        backgroundColor: Colors.error15,
        borderRadius: DesignTokens.borderRadius.lg,
        gap: DesignTokens.spacing.sm,
    },
    logoutText: {
        ...DesignTokens.typography.bodyBold,
        color: Colors.error,
    },
    versionText: {
        ...DesignTokens.typography.caption,
        color: Colors.textMuted,
        textAlign: 'center',
        marginTop: DesignTokens.spacing.lg,
    },
});
