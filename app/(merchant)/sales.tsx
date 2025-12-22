import { AdaptiveList } from '@/components/base/AdaptiveList';
import { Badge } from '@/components/base/Badge';
import { Button } from '@/components/base/Button';
import { Input } from '@/components/base/Input';
import { EmptyState } from '@/components/feedback/EmptyState';
import { GradientBackground } from '@/components/GradientBackground';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { api, Order, Store } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MerchantSalesScreen() {
    const insets = useSafeAreaInsets();
    const screenPaddingTop = insets.top + DesignTokens.spacing.md;
    const { session, isLoggingOut } = useAuth();
    const [stores, setStores] = useState<Store[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedStore, setSelectedStore] = useState<string | null>(null);
    const [pickupCode, setPickupCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending_payment' | 'picked_up' | 'cancelled'>('paid');
    const loadStoresRef = React.useRef<() => Promise<void>>(async () => {});
    const loadOrdersRef = React.useRef<() => Promise<void>>(async () => {});

    useFocusEffect(
        useCallback(() => {
            if (isLoggingOut || !session) {
                setLoading(false);
                return;
            }
            void loadStoresRef.current();

            // FIX: ao voltar de telas (ex.: detalhes do pedido), a loja selecionada pode ser a mesma
            // e o useEffect([selectedStore]) não dispara. Forçamos reload ao focar.
            if (selectedStore) {
                const timer = setTimeout(() => {
                    void loadOrdersRef.current();
                }, 350);

                return () => clearTimeout(timer);
            }
        }, [session, isLoggingOut, selectedStore, loadOrdersRef, loadStoresRef])
    );

    useEffect(() => {
        if (selectedStore && !isLoggingOut && session) {
            void loadOrdersRef.current();
        }
    }, [selectedStore, isLoggingOut, session, loadOrdersRef]);

    const loadStores = async () => {
        if (isLoggingOut || !session) {
            setLoading(false);
            return;
        }

        try {
            const data = await api.getMyStores();
            setStores(data);
            if (data.length > 0 && !selectedStore) {
                setSelectedStore(data[0].id);
            }
        } catch (error: any) {
            if (!error.message?.includes('Not authenticated') && !isLoggingOut) {
                console.error('Error loading stores:', error);
            }
        } finally {
            setLoading(false);
        }
    };
    loadStoresRef.current = loadStores;

    const loadOrders = async () => {
        if (!selectedStore || isLoggingOut || !session) return;
        try {
            const data = await api.getStoreOrders(selectedStore);
            setOrders(data);
        } catch (error: any) {
            if (!error.message?.includes('Not authenticated') && !isLoggingOut) {
                console.error('Error loading orders:', error);
            }
        } finally {
            setRefreshing(false);
        }
    };
    loadOrdersRef.current = loadOrders;

    const onRefresh = () => {
        if (isLoggingOut || !session) return;
        setRefreshing(true);
        loadOrders();
    };

    const handleVerifyPickup = async () => {
        if (!selectedStore || !pickupCode.trim()) {
            Alert.alert('Erro', 'Digite o código de retirada.');
            return;
        }

        setVerifying(true);
        try {
            const normalizedInput = pickupCode.trim().toUpperCase();
            const fullCode = normalizedInput.startsWith('VEN-') ? normalizedInput : `VEN-${normalizedInput}`;

            // Find order with this pickup code
            const order = orders.find(o => (o.pickup_code || '').toUpperCase() === fullCode);

            if (!order) {
                Alert.alert('❌ Código Inválido', 'Nenhum pedido encontrado com este código.');
                setVerifying(false);
                return;
            }

            if (order.status === 'picked_up') {
                Alert.alert('⚠️ Já Retirado', 'Este pedido já foi retirado anteriormente.');
                setVerifying(false);
                return;
            }

            if (order.status !== 'paid') {
                Alert.alert('⚠️ Pagamento Pendente', 'Este pedido ainda não foi pago.');
                setVerifying(false);
                return;
            }

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            // Confirm pickup
            await api.confirmPickup(selectedStore, order.id, fullCode);

            Alert.alert(
                '✅ Retirada Confirmada!',
                `Pedido #${order.id.slice(-6).toUpperCase()} entregue com sucesso.`,
                [{ text: 'OK' }]
            );

            setPickupCode('');
            loadOrders();
        } catch (error: any) {
            console.error('Error confirming pickup:', error);
            Alert.alert('Erro', error.message || 'Não foi possível confirmar a retirada.');
        } finally {
            setVerifying(false);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending_payment':
            case 'pending':
                return { label: 'Aguardando', variant: 'warning' as const, icon: 'time' as const };
            case 'paid':
                return { label: 'A retirar', variant: 'success' as const, icon: 'checkmark-circle' as const };
            case 'picked_up':
                return { label: 'Retirado', variant: 'primary' as const, icon: 'bag-check' as const };
            case 'cancelled':
                return { label: 'Cancelado', variant: 'error' as const, icon: 'close-circle' as const };
            default:
                return { label: 'Status', variant: 'default' as const, icon: 'help-circle' as const };
        }
    };

    const renderOrder = ({ item }: { item: Order }) => {
        const statusInfo = getStatusInfo(item.status);
        const customerName = item.customer?.name || item.customer?.email || 'Cliente';
        const storeName = stores.find(s => s.id === selectedStore)?.name || stores.find(s => s.id === selectedStore)?.nome || 'Loja';
        const itemCount = item.items?.length || 0;
        const totalQty = (item.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0);

        return (
            <TouchableOpacity
                style={styles.orderCard}
                activeOpacity={0.9}
                onPress={() => {
                    if (!selectedStore) return;
                    router.push({
                        pathname: '/(merchant)/sale-order/[id]',
                        params: { id: item.id, storeId: selectedStore },
                    });
                }}
                accessibilityRole="button"
                accessibilityLabel={`Pedido ${item.id.slice(-6).toUpperCase()} • ${statusInfo.label}`}
                accessibilityHint="Toque para ver detalhes e confirmar retirada"
            >
                <View style={styles.orderHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.orderNumber}>#{item.id.slice(-6).toUpperCase()}</Text>
                        <Text style={styles.orderSub}>{customerName} • {storeName}</Text>
                        <Text style={styles.orderDate}>
                            {item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '—'}
                        </Text>
                    </View>
                    <View style={styles.orderHeaderRight}>
                        <Badge
                            label={statusInfo.label}
                            variant={statusInfo.variant}
                            size="sm"
                            icon={statusInfo.icon}
                        />
                        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                    </View>
                </View>

                <View style={styles.orderBody}>
                    <View style={styles.orderStatRow}>
                        <Ionicons name="cube" size={16} color={Colors.textMuted} />
                        <Text style={styles.orderStatText}>{itemCount} item(ns) • {totalQty} un.</Text>
                    </View>
                    <View style={styles.orderStatRow}>
                        <Ionicons name="cash" size={16} color={Colors.textMuted} />
                        <Text style={styles.orderTotal}>R$ {item.total.toFixed(2).replace('.', ',')}</Text>
                    </View>
                </View>

                {item.status === 'paid' && item.pickup_code ? (
                    <View style={styles.codeBox}>
                        <Ionicons name="key" size={18} color={Colors.success} />
                        <Text style={styles.codeValue}>{item.pickup_code}</Text>
                        <Text style={styles.codeHint}>Retirada pendente</Text>
                    </View>
                ) : null}
            </TouchableOpacity>
        );
    };

    const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'paid'), [orders]);
    const filteredOrders = useMemo(() => {
        if (statusFilter === 'all') return orders;
        if (statusFilter === 'pending_payment') {
            return orders.filter((o) => o.status === 'pending_payment' || o.status === 'pending');
        }
        return orders.filter((o) => o.status === statusFilter);
    }, [orders, statusFilter]);

    if (loading) {
        return (
            <GradientBackground>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.secondary} />
                </View>
            </GradientBackground>
        );
    }

    if (stores.length === 0) {
        return (
            <GradientBackground>
                <View style={styles.emptyContainer}>
                    <Ionicons name="storefront-outline" size={64} color={Colors.textMuted} />
                    <Text style={styles.emptyText}>Cadastre uma loja primeiro</Text>
                </View>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <View style={[styles.container, { paddingTop: screenPaddingTop }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Pedidos</Text>
                    <Text style={styles.subtitle}>
                        {pendingOrders.length} retirada(s) pendente(s)
                    </Text>
                </View>

                {/* Pickup Code Verifier */}
                <View style={styles.verifyCard}>
                    <View style={styles.verifyHeader}>
                        <Ionicons name="qr-code" size={22} color={Colors.secondary} />
                        <Text style={styles.verifyTitle}>Confirmar retirada</Text>
                    </View>
                    <Input
                        value={pickupCode}
                        onChangeText={(text) => setPickupCode(text.toUpperCase())}
                        label="Código de retirada"
                        placeholder="VEN-XXXXXX"
                        autoCapitalize="characters"
                        autoCorrect={false}
                        maxLength={12}
                        leftIcon="key"
                        floatingLabel
                        containerStyle={{ marginBottom: DesignTokens.spacing.sm }}
                    />
                    <Button
                        title="Confirmar"
                        onPress={handleVerifyPickup}
                        variant="secondary"
                        size="md"
                        loading={verifying}
                        leftIcon={!verifying ? <Ionicons name="checkmark" size={20} color={Colors.text} /> : undefined}
                        fullWidth
                        disabled={!pickupCode.trim()}
                    />
                </View>

                {/* Store Filter */}
                {stores.length > 1 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.storesFilter}
                    >
                        {stores.map((store) => {
                            const isActive = selectedStore === store.id;
                            return (
                                <TouchableOpacity
                                    key={store.id}
                                    style={[styles.storeChip, isActive && styles.storeChipActive]}
                                    onPress={() => setSelectedStore(store.id)}
                                    activeOpacity={0.9}
                                >
                                    <Text style={[styles.storeChipText, isActive && styles.storeChipTextActive]}>
                                        {store.name || store.nome || 'Loja'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}

                {/* Status filter - Tabs Horizontais */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtersRow}
                >
                    {([
                        { key: 'paid', label: 'A retirar' },
                        { key: 'pending_payment', label: 'Aguardando' },
                        { key: 'picked_up', label: 'Retirado' },
                        { key: 'cancelled', label: 'Cancelado' },
                        { key: 'all', label: 'Todos' },
                    ] as const).map((f) => {
                        const active = statusFilter === f.key;
                        return (
                            <TouchableOpacity
                                key={f.key}
                                style={[styles.filterTab, active && styles.filterTabActive]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setStatusFilter(f.key);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                                    {f.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Orders List */}
                {filteredOrders.length === 0 ? (
                    <EmptyState
                        icon="receipt-outline"
                        title="Nenhum pedido por aqui"
                        message="Quando um cliente comprar, os pedidos aparecem aqui."
                    />
                ) : (
                    <AdaptiveList
                        data={filteredOrders}
                        renderItem={renderOrder}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        estimatedItemSize={156}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={Colors.secondary}
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
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 48,
    },
    emptyText: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginTop: 16,
    },
    header: {
        paddingHorizontal: DesignTokens.padding.medium, // Responsivo
        marginBottom: DesignTokens.spacing.lg,
    },
    title: {
        ...DesignTokens.typography.h1,
        color: Colors.text,
    },
    subtitle: {
        ...DesignTokens.typography.small,
        color: Colors.textSecondary,
    },
    verifyCard: {
        marginHorizontal: 24,
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        padding: 16,
        marginBottom: 20,
    },
    verifyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    verifyTitle: {
        ...DesignTokens.typography.bodyBold,
        color: Colors.text,
    },
    storesFilter: {
        paddingHorizontal: 24,
        paddingBottom: 16,
    },
    storeChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        marginRight: 8,
    },
    storeChipActive: {
        backgroundColor: Colors.secondary,
        borderColor: Colors.secondary,
    },
    storeChipText: {
        fontSize: 13,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    storeChipTextActive: {
        color: Colors.text,
        fontWeight: '600',
    },
    filtersRow: {
        paddingHorizontal: DesignTokens.padding.medium, // Responsivo
        paddingBottom: DesignTokens.spacing.sm,
        gap: DesignTokens.spacing.xs,
    },
    filterTab: {
        paddingHorizontal: DesignTokens.spacing.lg, // 20px conforme plano
        paddingVertical: DesignTokens.spacing.md, // 48px altura conforme plano
        borderRadius: DesignTokens.borderRadius.md,
        backgroundColor: Colors.backgroundLight, // #FFFFFF
        borderWidth: 1.5,
        borderColor: Colors.border,
        minHeight: 48, // Altura conforme plano
    },
    filterTabActive: {
        backgroundColor: Colors.primary, // Verde conforme plano
        borderColor: Colors.primary,
        ...DesignTokens.shadows.sm,
    },
    filterTabText: {
        ...DesignTokens.typography.bodyBold,
        color: Colors.textSecondary,
    },
    filterTabTextActive: {
        color: '#FFFFFF', // Texto branco no tab ativo
        fontWeight: '700',
    },
    listContent: {
        paddingHorizontal: DesignTokens.padding.medium, // Responsivo
        paddingBottom: DesignTokens.spacing.xxl,
    },
    orderCard: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: DesignTokens.borderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        padding: DesignTokens.spacing.md,
        marginBottom: 12,
        ...DesignTokens.shadows.sm,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    orderNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    orderSub: {
        ...DesignTokens.typography.small,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    orderDate: {
        ...DesignTokens.typography.caption,
        color: Colors.textMuted,
    },
    orderHeaderRight: {
        alignItems: 'flex-end',
        gap: 10,
    },
    orderBody: {
        gap: 10,
    },
    orderStatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    orderStatText: {
        ...DesignTokens.typography.small,
        color: Colors.textSecondary,
    },
    orderTotal: {
        ...DesignTokens.typography.bodyBold,
        color: Colors.success,
    },
    codeBox: {
        marginTop: 16,
        backgroundColor: Colors.success15,
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    codeValue: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.success,
        letterSpacing: 2,
    },
    codeHint: {
        ...DesignTokens.typography.captionBold,
        color: Colors.success,
        marginLeft: 'auto',
    },
});
