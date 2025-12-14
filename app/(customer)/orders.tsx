import React, { useState, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../../components/GradientBackground';
import { Colors } from '../../constants/Colors';
import { api, Order } from '../../services/api';

export default function OrdersScreen() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadOrders();
        }, [])
    );

    const loadOrders = async () => {
        console.log('Loading orders...');
        try {
            // Add timeout
            const fetchOrders = api.getMyOrders();
            const timeoutPromise = new Promise<Order[]>((resolve) =>
                setTimeout(() => {
                    console.log('Orders fetch timeout');
                    resolve([]);
                }, 5000)
            );

            const data = await Promise.race([fetchOrders, timeoutPromise]);
            console.log('Orders loaded:', data.length);
            setOrders(data);
        } catch (error) {
            console.error('Error loading orders:', error);
            setOrders([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadOrders();
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending':
                return { label: 'Aguardando Pagamento', color: Colors.warning, icon: 'time' as const };
            case 'paid':
                return { label: 'Pago - Retirar', color: Colors.success, icon: 'checkmark-circle' as const };
            case 'picked_up':
                return { label: 'Retirado', color: Colors.primary, icon: 'bag-check' as const };
            case 'cancelled':
                return { label: 'Cancelado', color: Colors.error, icon: 'close-circle' as const };
            case 'expired':
                return { label: 'Expirado', color: Colors.textMuted, icon: 'alert-circle' as const };
            default:
                return { label: 'Desconhecido', color: Colors.textMuted, icon: 'help-circle' as const };
        }
    };

    const renderOrder = ({ item }: { item: Order }) => {
        const statusInfo = getStatusInfo(item.status);

        return (
            <TouchableOpacity
                style={styles.orderCard}
                onPress={() => router.push(`/order/${item.id}`)}
                activeOpacity={0.9}
            >
                <View style={styles.orderHeader}>
                    <View>
                        <Text style={styles.orderNumber}>Pedido #{item.id.slice(-6).toUpperCase()}</Text>
                        <Text style={styles.orderDate}>
                            {new Date(item.created_at || '').toLocaleDateString('pt-BR')}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                        <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
                        <Text style={[styles.statusText, { color: statusInfo.color }]}>
                            {statusInfo.label}
                        </Text>
                    </View>
                </View>

                <View style={styles.orderBody}>
                    <View style={styles.storeRow}>
                        <Ionicons name="storefront" size={16} color={Colors.textMuted} />
                        <Text style={styles.storeName}>{item.store?.name || 'Loja'}</Text>
                    </View>

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>R$ {item.total_amount.toFixed(2)}</Text>
                    </View>
                </View>

                {item.status === 'paid' && item.pickup_code && (
                    <View style={styles.pickupCodeContainer}>
                        <Text style={styles.pickupCodeLabel}>Código de Retirada</Text>
                        <Text style={styles.pickupCode}>{item.pickup_code}</Text>
                    </View>
                )}
            </TouchableOpacity>
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
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Meus Pedidos</Text>
                    <Text style={styles.subtitle}>{orders.length} pedido(s)</Text>
                </View>

                {orders.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="receipt-outline" size={64} color={Colors.textMuted} />
                        </View>
                        <Text style={styles.emptyText}>Nenhum pedido ainda</Text>
                        <Text style={styles.emptySubtext}>
                            Comece a comprar produtos com desconto!
                        </Text>
                        <TouchableOpacity
                            style={styles.exploreButton}
                            onPress={() => router.push('/(customer)')}
                        >
                            <Text style={styles.exploreButtonText}>Explorar Vitrine</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={orders}
                        renderItem={renderOrder}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={Colors.primary}
                            />
                        }
                    />
                )}
            </View>
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
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    orderCard: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        padding: 16,
        marginBottom: 12,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    orderNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4,
    },
    orderDate: {
        fontSize: 12,
        color: Colors.textMuted,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    orderBody: {
        gap: 12,
    },
    storeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    storeName: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.glassBorder,
    },
    totalLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    pickupCodeContainer: {
        marginTop: 16,
        backgroundColor: Colors.success + '15',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    pickupCodeLabel: {
        fontSize: 12,
        color: Colors.success,
        marginBottom: 8,
    },
    pickupCode: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.success,
        letterSpacing: 4,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 48,
    },
    emptyIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    exploreButton: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        backgroundColor: Colors.primary,
    },
    exploreButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
});
