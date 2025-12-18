import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/components/base/Badge';
import { Button } from '@/components/base/Button';
import { Input } from '@/components/base/Input';
import { Toast } from '@/components/feedback/Toast';
import { GradientBackground } from '@/components/GradientBackground';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { api, Order, OrderItem } from '@/services/api';

const formatMoney = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('pt-BR');
};

const normalizePickupCode = (input: string) => {
    const trimmed = (input || '').trim().toUpperCase();
    const compact = trimmed.replace(/\s+/g, '');
    if (!compact) return compact;
    if (compact.startsWith('VEN-')) return compact;
    return `VEN-${compact}`;
};

const getStatusInfo = (status: string) => {
    switch (status) {
        case 'pending_payment':
        case 'pending':
            return { label: 'Aguardando Pagamento', variant: 'warning' as const, icon: 'time' as const };
        case 'paid':
            return { label: 'Pago • A Retirar', variant: 'success' as const, icon: 'checkmark-circle' as const };
        case 'picked_up':
            return { label: 'Retirado', variant: 'primary' as const, icon: 'bag-check' as const };
        case 'cancelled':
            return { label: 'Cancelado', variant: 'error' as const, icon: 'close-circle' as const };
        default:
            return { label: 'Status', variant: 'default' as const, icon: 'help-circle' as const };
    }
};

const getBatchName = (item: OrderItem) => {
    const product = item.batch?.products || item.batch?.product;
    return product?.nome || product?.name || 'Produto';
};

export default function MerchantSaleOrderScreen() {
    const insets = useSafeAreaInsets();
    const screenPaddingTop = insets.top + DesignTokens.spacing.md;
    const { id, storeId } = useLocalSearchParams<{ id: string; storeId?: string }>();

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pickupCode, setPickupCode] = useState('');
    const [revealPickupCode, setRevealPickupCode] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

    const statusInfo = useMemo(() => getStatusInfo(order?.status || ''), [order?.status]);

    const loadOrder = useCallback(async () => {
        if (!id || !storeId) return;
        try {
            const data = await api.getStoreOrder(storeId, id);
            setOrder(data);
        } catch (error: any) {
            console.error('Error loading store order:', error);
            Alert.alert('Erro', error?.message || 'Não foi possível carregar este pedido.');
            router.back();
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id, storeId]);

    useEffect(() => {
        if (!id || !storeId) {
            setLoading(false);
            return;
        }
        loadOrder();
    }, [id, storeId, loadOrder]);

    const onRefresh = () => {
        setRefreshing(true);
        loadOrder();
    };

    const pickupDeadlineInfo = useMemo(() => {
        const deadline = order?.pickup_deadline;
        if (!deadline) return null;
        const deadlineDate = new Date(deadline);
        if (Number.isNaN(deadlineDate.getTime())) return null;
        const ms = deadlineDate.getTime() - Date.now();
        const minutes = Math.max(0, Math.floor(ms / 60000));
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const label = ms <= 0
            ? 'Prazo expirado'
            : hours > 0
                ? `Restam ${hours}h ${mins}min`
                : `Restam ${mins}min`;
        return { deadline, label, expired: ms <= 0 };
    }, [order?.pickup_deadline]);

    const handleCallCustomer = async () => {
        const phone = order?.customer?.phone;
        if (!phone) return;
        const telUrl = `tel:${phone}`;
        const canOpen = await Linking.canOpenURL(telUrl);
        if (!canOpen) {
            Alert.alert('Não disponível', 'Não foi possível abrir o discador neste dispositivo.');
            return;
        }
        Linking.openURL(telUrl);
    };

    const handleConfirmPickup = async () => {
        if (!order || !storeId) return;
        const normalized = normalizePickupCode(pickupCode);
        if (!normalized) {
            Alert.alert('Código obrigatório', 'Digite o código de retirada informado pelo cliente.');
            return;
        }

        setVerifying(true);
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const updated = await api.confirmPickup(storeId, order.id, normalized);
            setOrder(updated);
            setPickupCode('');
            setToastMessage('Retirada confirmada com sucesso!');
            setToastType('success');
            setShowToast(true);
        } catch (error: any) {
            console.error('Error confirming pickup:', error);
            setToastMessage(error?.message || 'Não foi possível confirmar a retirada.');
            setToastType('error');
            setShowToast(true);
        } finally {
            setVerifying(false);
        }
    };

    if (!storeId && !loading) {
        return (
            <GradientBackground>
                <View style={styles.loadingContainer}>
                    <Text style={styles.errorText}>
                        Não foi possível identificar a loja deste pedido.
                    </Text>
                    <Button title="Voltar" onPress={() => router.back()} variant="secondary" />
                </View>
            </GradientBackground>
        );
    }

    if (loading || !order) {
        return (
            <GradientBackground>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.secondary} />
                </View>
            </GradientBackground>
        );
    }

    const customerName = order.customer?.name || order.customer?.email || 'Cliente';
    const customerEmail = order.customer?.email || '—';
    const customerPhone = order.customer?.phone;
    const items = order.items || [];
    const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

    const payment = order.payment;
    const paymentStatusLabel = payment?.status === 'paid'
        ? 'Pago'
        : payment?.status === 'cancelled'
            ? 'Cancelado'
            : 'Pendente';

    return (
        <GradientBackground>
            <View style={[styles.container, { paddingTop: screenPaddingTop }]}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        accessibilityRole="button"
                        accessibilityLabel="Voltar"
                    >
                        <Ionicons name="arrow-back" size={22} color={Colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>Pedido</Text>
                        <Text style={styles.headerSubtitle}>#{order.id.slice(-6).toUpperCase()}</Text>
                    </View>
                    <View style={{ width: DesignTokens.touchTargets.min }} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.content}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={Colors.secondary}
                        />
                    }
                >
                    {/* Status */}
                    <View style={styles.card}>
                        <View style={styles.rowBetween}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>Status</Text>
                                <Text style={styles.cardSubtitle}>
                                    {formatDateTime(order.created_at)}
                                </Text>
                            </View>
                            <Badge
                                label={statusInfo.label}
                                variant={statusInfo.variant}
                                size="sm"
                                icon={statusInfo.icon}
                            />
                        </View>

                        {pickupDeadlineInfo && order.status === 'paid' ? (
                            <View style={[styles.inlineInfo, pickupDeadlineInfo.expired && styles.inlineInfoError]}>
                                <Ionicons
                                    name={pickupDeadlineInfo.expired ? 'alert-circle' : 'time'}
                                    size={18}
                                    color={pickupDeadlineInfo.expired ? Colors.error : Colors.warning}
                                />
                                <Text style={styles.inlineInfoText}>
                                    {pickupDeadlineInfo.expired
                                        ? 'Prazo de retirada expirado'
                                        : `Retirada até ${formatDateTime(pickupDeadlineInfo.deadline)} • ${pickupDeadlineInfo.label}`}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Cliente */}
                    <View style={styles.card}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.cardTitle}>Cliente</Text>
                            {customerPhone ? (
                                <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={handleCallCustomer}
                                    accessibilityRole="button"
                                    accessibilityLabel="Ligar para o cliente"
                                >
                                    <Ionicons name="call" size={18} color={Colors.secondary} />
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        <View style={styles.infoRow}>
                            <Ionicons name="person" size={16} color={Colors.textMuted} />
                            <Text style={styles.infoText}>{customerName}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="mail" size={16} color={Colors.textMuted} />
                            <Text style={styles.infoText}>{customerEmail}</Text>
                        </View>
                        {customerPhone ? (
                            <View style={styles.infoRow}>
                                <Ionicons name="call" size={16} color={Colors.textMuted} />
                                <Text style={styles.infoText}>{customerPhone}</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Itens */}
                    <View style={styles.card}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.cardTitle}>Itens</Text>
                            <Text style={styles.mutedText}>
                                {items.length} item(ns) • {totalQty} un.
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        {items.map((item) => {
                            const unitPrice = item.unit_price ?? item.price ?? 0;
                            return (
                                <View key={item.id} style={styles.itemRow}>
                                    <View style={styles.itemLeft}>
                                        <Text style={styles.itemName} numberOfLines={2}>
                                            {getBatchName(item)}
                                        </Text>
                                        <Text style={styles.itemMeta}>
                                            {item.quantity}x • {formatMoney(unitPrice)}
                                        </Text>
                                    </View>
                                    <Text style={styles.itemTotal}>
                                        {formatMoney(unitPrice * item.quantity)}
                                    </Text>
                                </View>
                            );
                        })}

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>{formatMoney(order.total)}</Text>
                        </View>
                    </View>

                    {/* Pagamento */}
                    <View style={styles.card}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.cardTitle}>Pagamento</Text>
                            <Badge
                                label={paymentStatusLabel}
                                variant={payment?.status === 'paid' ? 'success' : payment?.status === 'cancelled' ? 'error' : 'warning'}
                                size="sm"
                                icon={payment?.status === 'paid' ? 'checkmark-circle' : payment?.status === 'cancelled' ? 'close-circle' : 'time'}
                            />
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="calendar" size={16} color={Colors.textMuted} />
                            <Text style={styles.infoText}>
                                {payment?.paid_at ? `Pago em ${formatDateTime(payment.paid_at)}` : 'Ainda não confirmado'}
                            </Text>
                        </View>

                        {payment?.store_value !== undefined ? (
                            <>
                                <View style={styles.divider} />
                                <View style={styles.moneyRow}>
                                    <Text style={styles.mutedText}>Valor bruto</Text>
                                    <Text style={styles.moneyValue}>{formatMoney(Number(payment.gross_value || 0))}</Text>
                                </View>
                                <View style={styles.moneyRow}>
                                    <Text style={styles.mutedText}>Taxa plataforma</Text>
                                    <Text style={styles.moneyValue}>{formatMoney(Number(payment.platform_fee || 0))}</Text>
                                </View>
                                <View style={styles.moneyRow}>
                                    <Text style={styles.mutedText}>Repasse loja</Text>
                                    <Text style={styles.moneyValueStrong}>{formatMoney(Number(payment.store_value || 0))}</Text>
                                </View>
                            </>
                        ) : null}
                    </View>

                    {/* Retirada */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Retirada</Text>
                        <Text style={styles.cardSubtitle}>
                            Confirme somente com o cliente presente.
                        </Text>

                        {order.status === 'paid' ? (
                            <>
                                <View style={styles.inlineInfo}>
                                    <Ionicons name="key" size={18} color={Colors.textMuted} />
                                    <Text style={styles.inlineInfoText}>
                                        Peça o código do cliente e confirme abaixo.
                                    </Text>
                                </View>

                                {order.pickup_code ? (
                                    <>
                                        <View style={styles.pickupCodeHeaderRow}>
                                            <Text style={styles.mutedText}>Código do pedido</Text>
                                            <TouchableOpacity
                                                style={styles.revealButton}
                                                onPress={() => setRevealPickupCode((v) => !v)}
                                                activeOpacity={0.9}
                                                accessibilityRole="button"
                                                accessibilityLabel={revealPickupCode ? 'Ocultar código do pedido' : 'Mostrar código do pedido'}
                                            >
                                                <Ionicons
                                                    name={revealPickupCode ? 'eye-off' : 'eye'}
                                                    size={16}
                                                    color={Colors.textSecondary}
                                                />
                                                <Text style={styles.revealButtonText}>
                                                    {revealPickupCode ? 'Ocultar' : 'Mostrar'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                        {revealPickupCode ? (
                                            <View style={styles.pickupCodeBox}>
                                                <Text style={styles.pickupCodeValue}>{order.pickup_code}</Text>
                                                <TouchableOpacity
                                                    style={styles.pickupCodeUseButton}
                                                    onPress={() => setPickupCode(order.pickup_code || '')}
                                                    activeOpacity={0.9}
                                                    accessibilityRole="button"
                                                    accessibilityLabel="Usar código do pedido no campo"
                                                >
                                                    <Ionicons name="arrow-down" size={16} color={Colors.secondary} />
                                                    <Text style={styles.pickupCodeUseText}>Usar</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : null}
                                    </>
                                ) : null}

                                <Input
                                    label="Código de retirada"
                                    value={pickupCode}
                                    onChangeText={(text) => setPickupCode(text.toUpperCase())}
                                    placeholder="VEN-XXXXXX"
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    leftIcon="qr-code"
                                    floatingLabel
                                />

                                <Button
                                    title="Confirmar retirada"
                                    onPress={handleConfirmPickup}
                                    variant="secondary"
                                    size="lg"
                                    loading={verifying}
                                    leftIcon={!verifying ? <Ionicons name="checkmark" size={20} color={Colors.text} /> : undefined}
                                    fullWidth
                                />
                            </>
                        ) : (
                            <View style={styles.inlineInfo}>
                                <Ionicons name="information-circle" size={18} color={Colors.textMuted} />
                                <Text style={styles.inlineInfoText}>
                                    {order.status === 'pending_payment'
                                        ? 'Aguardando confirmação do pagamento.'
                                        : order.status === 'picked_up'
                                            ? `Retirado em ${formatDateTime(order.picked_up_at)}`
                                            : 'Este pedido não está disponível para retirada.'}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={{ height: 32 }} />
                </ScrollView>

                <Toast
                    message={toastMessage}
                    type={toastType}
                    visible={showToast}
                    onHide={() => setShowToast(false)}
                    duration={3000}
                />
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
        paddingHorizontal: 24,
    },
    errorText: {
        ...DesignTokens.typography.body,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: DesignTokens.spacing.md,
    },
    header: {
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: DesignTokens.spacing.md,
    },
    headerCenter: {
        alignItems: 'center',
        flex: 1,
    },
    headerTitle: {
        ...DesignTokens.typography.smallBold,
        color: Colors.textSecondary,
    },
    headerSubtitle: {
        ...DesignTokens.typography.h3,
        color: Colors.text,
        marginTop: 2,
    },
    backButton: {
        width: DesignTokens.touchTargets.min,
        height: DesignTokens.touchTargets.min,
        borderRadius: DesignTokens.borderRadius.lg,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: 24,
        paddingBottom: 32,
        gap: DesignTokens.spacing.md,
    },
    card: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: DesignTokens.borderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        padding: DesignTokens.spacing.md,
        ...DesignTokens.shadows.sm,
    },
    cardTitle: {
        ...DesignTokens.typography.h3,
        color: Colors.text,
    },
    cardSubtitle: {
        ...DesignTokens.typography.small,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    rowBetween: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    mutedText: {
        ...DesignTokens.typography.small,
        color: Colors.textSecondary,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.glassBorder,
        marginVertical: DesignTokens.spacing.md,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 10,
    },
    infoText: {
        ...DesignTokens.typography.body,
        color: Colors.text,
        flex: 1,
    },
    iconButton: {
        width: DesignTokens.touchTargets.min,
        height: DesignTokens.touchTargets.min,
        borderRadius: DesignTokens.borderRadius.lg,
        backgroundColor: Colors.secondary15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inlineInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: Colors.glass,
        borderRadius: DesignTokens.borderRadius.md,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        padding: DesignTokens.spacing.md,
        marginTop: DesignTokens.spacing.md,
    },
    inlineInfoError: {
        backgroundColor: Colors.error15,
        borderColor: Colors.error25,
    },
    inlineInfoText: {
        ...DesignTokens.typography.small,
        color: Colors.text,
        flex: 1,
        lineHeight: 18,
    },
    pickupCodeHeaderRow: {
        marginTop: DesignTokens.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    revealButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: DesignTokens.borderRadius.full,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    revealButtonText: {
        ...DesignTokens.typography.captionBold,
        color: Colors.textSecondary,
    },
    pickupCodeBox: {
        marginTop: DesignTokens.spacing.sm,
        backgroundColor: Colors.glass,
        borderRadius: DesignTokens.borderRadius.md,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    pickupCodeValue: {
        ...DesignTokens.typography.bodyBold,
        color: Colors.text,
        letterSpacing: 2,
        flex: 1,
    },
    pickupCodeUseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: DesignTokens.borderRadius.full,
        backgroundColor: Colors.secondary15,
        borderWidth: 1,
        borderColor: Colors.secondary25,
    },
    pickupCodeUseText: {
        ...DesignTokens.typography.captionBold,
        color: Colors.secondary,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.glassBorder,
    },
    itemLeft: {
        flex: 1,
    },
    itemName: {
        ...DesignTokens.typography.bodyBold,
        color: Colors.text,
    },
    itemMeta: {
        ...DesignTokens.typography.small,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    itemTotal: {
        ...DesignTokens.typography.bodyBold,
        color: Colors.text,
    },
    totalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: DesignTokens.spacing.md,
    },
    totalLabel: {
        ...DesignTokens.typography.bodyBold,
        color: Colors.text,
    },
    totalValue: {
        ...DesignTokens.typography.h2,
        color: Colors.success,
    },
    moneyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    moneyValue: {
        ...DesignTokens.typography.bodyBold,
        color: Colors.text,
    },
    moneyValueStrong: {
        ...DesignTokens.typography.bodyBold,
        color: Colors.success,
    },
});
