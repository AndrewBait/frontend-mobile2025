import { AdaptiveList } from '@/components/base/AdaptiveList';
import { Badge } from '@/components/base/Badge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { GradientBackground } from '@/components/GradientBackground';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { api, Order } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OrdersScreen() {
    const insets = useSafeAreaInsets();
    const screenPaddingTop = insets.top + DesignTokens.spacing.md;
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
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        try {
            // Add timeout
            const fetchOrders = api.getMyOrders();
            const timeoutPromise = new Promise<Order[]>((resolve) =>
                (timeoutId = setTimeout(() => {
                    console.log('Orders fetch timeout');
                    resolve([]);
                }, 5000))
            );

            const data = await Promise.race([fetchOrders, timeoutPromise]);
            console.log('Orders loaded:', data.length);
            setOrders(data);
        } catch (error) {
            console.error('Error loading orders:', error);
            setOrders([]);
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
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
            case 'pending_payment':
            case 'pending':
                return { label: 'Aguardando Pagamento', variant: 'warning' as const, icon: 'time' as const };
            case 'paid':
                return { label: 'Pago - Retirar', variant: 'success' as const, icon: 'checkmark-circle' as const };
            case 'picked_up':
                return { label: 'Retirado', variant: 'primary' as const, icon: 'bag-check' as const };
            case 'cancelled':
                return { label: 'Cancelado', variant: 'error' as const, icon: 'close-circle' as const };
            case 'expired':
                return { label: 'Expirado', variant: 'default' as const, icon: 'alert-circle' as const };
            default:
                return { label: 'Desconhecido', variant: 'default' as const, icon: 'help-circle' as const };
        }
    };

    // Componente separado para poder usar hooks
    const OrderItem: React.FC<{ item: Order; index: number }> = ({ item, index }) => {
        const statusInfo = getStatusInfo(item.status);
        const opacity = useSharedValue(0);
        const translateY = useSharedValue(20);

        React.useEffect(() => {
            const delay = index * 50;
            setTimeout(() => {
                opacity.value = withTiming(1, { duration: DesignTokens.animations.normal });
                translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
            }, delay);
        }, [index, opacity, translateY]);

        const animatedStyle = useAnimatedStyle(() => ({
            opacity: opacity.value,
            transform: [{ translateY: translateY.value }],
        }));

        return (
            <Animated.View style={animatedStyle}>
                <TouchableOpacity
                    style={styles.orderCard}
                    onPress={() => router.push(`/order/${item.id}`)}
                    activeOpacity={0.9}
                    accessibilityRole="button"
                    accessibilityLabel={`Pedido ${item.id.slice(-6).toUpperCase()}, ${statusInfo.label}`}
                    accessibilityHint="Toque para ver detalhes do pedido"
                >
                    <View style={styles.orderHeader}>
                        <View>
                            <Text style={styles.orderNumber}>Pedido #{item.id.slice(-6).toUpperCase()}</Text>
                            <Text style={styles.orderDate}>
                                {new Date(item.created_at || '').toLocaleDateString('pt-BR')}
                            </Text>
                        </View>
                        <Badge
                            label={statusInfo.label}
                            variant={statusInfo.variant}
                            size="sm"
                            icon={statusInfo.icon}
                        />
                    </View>

                    <View style={styles.orderBody}>
                        <View style={styles.storeRow}>
                            <Ionicons name="storefront" size={16} color={Colors.textMuted} />
                            <Text style={styles.storeName}>{item.store?.name || 'Loja'}</Text>
                        </View>

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>R$ {item.total.toFixed(2).replace('.', ',')}</Text>
                        </View>
                    </View>

                    {item.status === 'paid' && item.pickup_code && (
                        <View style={styles.pickupCodeContainer}>
                            <Text style={styles.pickupCodeLabel}>Código de Retirada</Text>
                            <Text style={styles.pickupCode}>{item.pickup_code}</Text>
                        </View>
                )}
            </TouchableOpacity>
        </Animated.View>
        );
    };

    const renderOrder = ({ item, index }: { item: Order; index: number }) => {
        return <OrderItem item={item} index={index} />;
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
            <View style={[styles.container, { paddingTop: screenPaddingTop }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Meus Pedidos</Text>
                    <Text style={styles.subtitle}>{orders.length} pedido(s)</Text>
                </View>

                {orders.length === 0 ? (
                    <EmptyState
                        icon="receipt-outline"
                        title="Nenhum pedido ainda"
                        message="Comece a comprar produtos com desconto!"
                        actionLabel="Explorar Vitrine"
                        onAction={() => router.push('/(customer)')}
                    />
                ) : (
                    <AdaptiveList
                        data={orders}
                        renderItem={renderOrder}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        estimatedItemSize={140}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={Colors.primary}
                            />
                        }
                        removeClippedSubviews={true}
                        maxToRenderPerBatch={10}
                        windowSize={10}
                        initialNumToRender={5}
                    />
                )}
            </View>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        ...DesignTokens.typography.h1,
        color: Colors.text,
        marginBottom: DesignTokens.spacing.xs,
    },
    subtitle: {
        ...DesignTokens.typography.small,
        color: Colors.textSecondary,
    },
    listContent: {
        paddingHorizontal: DesignTokens.padding.medium, // Responsivo
        paddingBottom: DesignTokens.spacing.xxl,
    },
    orderCard: {
        backgroundColor: Colors.backgroundLight, // #FFFFFF
        borderRadius: DesignTokens.borderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: DesignTokens.spacing.lg, // 20px conforme plano
        marginBottom: DesignTokens.spacing.md,
        ...DesignTokens.shadows.sm,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: DesignTokens.spacing.md,
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
    orderBody: {
        gap: DesignTokens.spacing.sm,
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
        paddingTop: DesignTokens.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        marginTop: DesignTokens.spacing.xs,
    },
    totalLabel: {
        ...DesignTokens.typography.bodyBold,
        color: Colors.text,
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.primary, // Verde = economia
        letterSpacing: -0.3,
    },
    pickupCodeContainer: {
        marginTop: DesignTokens.spacing.md,
        backgroundColor: '#ECFDF5', // Emerald-50
        borderRadius: DesignTokens.borderRadius.md,
        padding: DesignTokens.spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.primary, // Verde
    },
    pickupCodeLabel: {
        ...DesignTokens.typography.captionBold,
        color: Colors.primary, // Verde
        marginBottom: DesignTokens.spacing.sm,
    },
    pickupCode: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.primary, // Verde
        letterSpacing: 4,
        fontFamily: 'monospace',
    },
});
