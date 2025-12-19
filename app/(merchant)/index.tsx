import { GradientBackground } from '@/components/GradientBackground';
import { SalesChart } from '@/components/SalesChart';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { api, Store } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface DailySale {
    date: string;
    total: number;
    count: number;
}

interface DashboardData {
    totalSales: number;
    todaySales: number;
    pendingOrders: number;
    lowStock: number;
    expiringSoon: number;
    dailySales: DailySale[];
}

export default function MerchantDashboard() {
    const { user, session, isLoggingOut } = useAuth();
    const [stores, setStores] = useState<Store[]>([]);
    const [dashboard, setDashboard] = useState<DashboardData>({
        totalSales: 0,
        todaySales: 0,
        pendingOrders: 0,
        lowStock: 0,
        expiringSoon: 0,
        dailySales: [],
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            // Don't load data if logging out or no session
            if (isLoggingOut || !session) {
                console.log('Skipping dashboard load - logging out or no session');
                setLoading(false);
                return;
            }
            loadData();
        }, [session, isLoggingOut])
    );

    const loadData = async () => {
        // Double check before API calls
        if (isLoggingOut || !session) {
            console.log('Skipping data load - no session or logging out');
            setLoading(false);
            setRefreshing(false);
            return;
        }

        console.log('Loading merchant dashboard...');
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        try {
            // Add timeout
            const fetchStores = async () => {
                const storesData = await api.getMyStores();
                setStores(storesData);
                return storesData;
            };

            const timeoutPromise = new Promise<Store[]>((resolve) =>
                (timeoutId = setTimeout(() => {
                    console.log('Dashboard fetch timeout');
                    resolve([]);
                }, 8000))
            );

            const storesData = await Promise.race([fetchStores(), timeoutPromise]);
            console.log('Stores loaded:', storesData.length);

            // Load dashboard summary for first store
            if (storesData.length > 0) {
                try {
                    const summary = await api.getStoreSummary(storesData[0].id);
                    console.log('Summary loaded:', summary);
                    setDashboard({
                        totalSales: summary.total_sales || 0,
                        todaySales: summary.total_paid_today || 0,
                        pendingOrders: summary.pending_pickup || 0,
                        lowStock: summary.low_stock || 0,
                        expiringSoon: summary.expiring_soon || 0,
                        dailySales: summary.daily_sales || [],
                    });
                } catch (e) {
                    console.log('Summary fetch failed:', e);
                }
            }
        } catch (error: any) {
            // Don't log auth errors during logout
            if (!error.message?.includes('Not authenticated') && !isLoggingOut) {
                console.error('Error loading dashboard:', error);
            }
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    if (loading) {
        return (
            <GradientBackground>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.secondary} />
                    <Text style={styles.loadingText}>Carregando dashboard...</Text>
                </View>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.secondary}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>
                            Olá{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
                        </Text>
                        <Text style={styles.title}>Dashboard</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.notificationButton}
                        onPress={() => router.push('/(merchant)/sales')}
                    >
                        {dashboard.pendingOrders > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{dashboard.pendingOrders}</Text>
                            </View>
                        )}
                        <Ionicons name="notifications-outline" size={24} color={Colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Stats Cards */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, styles.statCardPrimary]}>
                        <Ionicons name="trending-up" size={24} color={Colors.success} />
                        <Text style={styles.statValue}>R$ {dashboard.totalSales.toFixed(0)}</Text>
                        <Text style={styles.statLabel}>Total de vendas</Text>
                    </View>
                    <View style={[styles.statCard, styles.statCardSecondary]}>
                        <Ionicons name="today" size={24} color={Colors.primary} />
                        <Text style={styles.statValue}>R$ {dashboard.todaySales.toFixed(0)}</Text>
                        <Text style={styles.statLabel}>Vendas hoje</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={[styles.statCard, styles.statCardWarning]}>
                        <Ionicons name="time" size={24} color={Colors.warning} />
                        <Text style={styles.statValue}>{dashboard.pendingOrders}</Text>
                        <Text style={styles.statLabel}>Retiradas pendentes</Text>
                    </View>
                    <View style={[styles.statCard, styles.statCardError]}>
                        <Ionicons name="alert-circle" size={24} color={Colors.error} />
                        <Text style={styles.statValue}>{dashboard.lowStock}</Text>
                        <Text style={styles.statLabel}>Estoque baixo</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Ações Rápidas</Text>

                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/(merchant)/create-product')}
                    >
                        <LinearGradient
                            colors={['rgba(5, 150, 105, 0.1)', 'rgba(5, 150, 105, 0.05)']}
                            style={styles.actionGradient}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: 'rgba(5, 150, 105, 0.15)' }]}>
                                <Ionicons name="add-circle" size={28} color={Colors.primary} />
                            </View>
                            <Text style={styles.actionTitle}>Novo Produto</Text>
                            <Text style={styles.actionDesc}>Cadastrar lote</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/(merchant)/sales')}
                    >
                        <LinearGradient
                            colors={['rgba(251, 146, 60, 0.1)', 'rgba(251, 146, 60, 0.05)']}
                            style={styles.actionGradient}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: 'rgba(251, 146, 60, 0.15)' }]}>
                                <Ionicons name="qr-code" size={28} color={Colors.warning} />
                            </View>
                            <Text style={styles.actionTitle}>Retirada</Text>
                            <Text style={styles.actionDesc}>Verificar código</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/(merchant)/products')}
                    >
                        <LinearGradient
                            colors={['rgba(5, 150, 105, 0.1)', 'rgba(16, 185, 129, 0.05)']}
                            style={styles.actionGradient}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: 'rgba(5, 150, 105, 0.15)' }]}>
                                <Ionicons name="cube" size={28} color={Colors.primary} />
                            </View>
                            <Text style={styles.actionTitle}>Produtos</Text>
                            <Text style={styles.actionDesc}>Gerenciar estoque</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/(merchant)/stores')}
                    >
                        <LinearGradient
                            colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
                            style={styles.actionGradient}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                                <Ionicons name="storefront" size={28} color="#3B82F6" />
                            </View>
                            <Text style={styles.actionTitle}>Lojas</Text>
                            <Text style={styles.actionDesc}>{stores.length} cadastrada(s)</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* No Stores Warning */}
                {stores.length === 0 && (
                    <TouchableOpacity
                        style={styles.warningCard}
                        onPress={() => router.push('/(merchant)/create-store')}
                    >
                        <Ionicons name="warning" size={24} color={Colors.warning} />
                        <View style={styles.warningContent}>
                            <Text style={styles.warningTitle}>Cadastre sua primeira loja</Text>
                            <Text style={styles.warningText}>
                                Você precisa ter uma loja para começar a vender
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>
                )}

                {/* Expiring Soon Alert */}
                {dashboard.expiringSoon > 0 && (
                    <TouchableOpacity
                        style={[styles.warningCard, styles.expiringCard]}
                        onPress={() => router.push('/(merchant)/products')}
                    >
                        <Ionicons name="calendar" size={24} color={Colors.error} />
                        <View style={styles.warningContent}>
                            <Text style={[styles.warningTitle, { color: Colors.error }]}>
                                {dashboard.expiringSoon} produto(s) vencendo
                            </Text>
                            <Text style={styles.warningText}>
                                Produtos vencendo nos próximos 3 dias
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>
                )}

                {/* Low Stock Alert */}
                {dashboard.lowStock > 0 && (
                    <TouchableOpacity
                        style={[styles.warningCard, styles.lowStockCard]}
                        onPress={() => router.push('/(merchant)/products')}
                    >
                        <Ionicons name="cube-outline" size={24} color={Colors.warning} />
                        <View style={styles.warningContent}>
                            <Text style={styles.warningTitle}>
                                {dashboard.lowStock} produto(s) com estoque baixo
                            </Text>
                            <Text style={styles.warningText}>
                                Menos de 3 unidades disponíveis
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>
                )}

                {/* Sales Chart */}
                {stores.length > 0 && (
                    <SalesChart data={dashboard.dailySales} />
                )}

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
        gap: 16,
    },
    loadingText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: DesignTokens.padding.medium,
        marginBottom: DesignTokens.spacing.xl,
    },
    greeting: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    title: {
        fontSize: 30,
        fontWeight: '800',
        color: Colors.text,
        letterSpacing: -0.5,
    },
    notificationButton: {
        width: 52,
        height: 52,
        borderRadius: DesignTokens.borderRadius.xl,
        backgroundColor: Colors.backgroundLight,
        borderWidth: 1.5,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        ...DesignTokens.shadows.sm,
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: Colors.error,
        borderRadius: 12,
        minWidth: 22,
        height: 22,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: Colors.background,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: DesignTokens.padding.medium,
        gap: 12,
        marginBottom: 12,
    },
    statCard: {
        flex: 1,
        padding: 20,
        borderRadius: DesignTokens.borderRadius.xl,
        ...DesignTokens.shadows.md,
    },
    statCardPrimary: {
        backgroundColor: '#ECFDF5',
    },
    statCardSecondary: {
        backgroundColor: '#EFF6FF',
    },
    statCardWarning: {
        backgroundColor: '#FFFBEB',
    },
    statCardError: {
        backgroundColor: '#FEF2F2',
    },
    statValue: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.text,
        marginTop: 10,
        letterSpacing: -1,
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.textSecondary,
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
        paddingHorizontal: DesignTokens.padding.medium,
        marginTop: DesignTokens.spacing.xl,
        marginBottom: DesignTokens.spacing.md,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: DesignTokens.padding.medium,
        gap: 12,
    },
    actionCard: {
        width: '47%',
        borderRadius: DesignTokens.borderRadius.xl,
        overflow: 'hidden',
        backgroundColor: Colors.backgroundLight,
        ...DesignTokens.shadows.md,
    },
    actionGradient: {
        padding: 20,
        alignItems: 'center',
    },
    actionIcon: {
        width: 56,
        height: 56,
        borderRadius: DesignTokens.borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    actionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
        textAlign: 'center',
    },
    actionDesc: {
        fontSize: 12,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    warningCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: DesignTokens.padding.medium,
        marginTop: DesignTokens.spacing.xl,
        padding: 16,
        backgroundColor: '#FFFBEB',
        borderRadius: DesignTokens.borderRadius.xl,
        borderWidth: 1.5,
        borderColor: Colors.warning,
        gap: 12,
        ...DesignTokens.shadows.sm,
    },
    warningContent: {
        flex: 1,
    },
    warningTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.warning,
        marginBottom: 2,
    },
    warningText: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    expiringCard: {
        backgroundColor: '#FEF2F2',
        borderColor: Colors.error,
    },
    lowStockCard: {
        backgroundColor: '#FFFBEB',
        borderColor: Colors.warning,
    },
});
