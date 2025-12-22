import { GradientBackground } from '@/components/GradientBackground';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { api, Order } from '@/services/api';
import { copyToClipboard } from '@/utils/clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const screenPaddingTop = insets.top + DesignTokens.spacing.md;
    const [order, setOrder] = useState<Order | null>(null);
    const orderStatus = order?.status;
    const [loading, setLoading] = useState(true);
    const [pixLoading, setPixLoading] = useState(false);
    const [pixCode, setPixCode] = useState<string | null>(null);
    const [pixQrCodeImage, setPixQrCodeImage] = useState<string | null>(null);
    const loadOrderRef = React.useRef<() => Promise<void>>(async () => {});

    useEffect(() => {
        if (id) {
            void loadOrderRef.current();
        }
    }, [id, loadOrderRef]);

    useEffect(() => {
        if (!id || orderStatus !== 'pending_payment') return;

        let isMounted = true;
        const interval = setInterval(async () => {
            try {
                const data = await api.getMyOrder(id);
                if (!isMounted) return;
                setOrder(data);
            } catch {
                // rede pode oscilar; mantém tentando
            }
        }, 3000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [id, orderStatus]);

    const loadOrder = async () => {
        try {
            const data = await api.getMyOrder(id!);
            setOrder(data);
            setPixCode(data.payment?.pix_copy_paste_code || null);
            setPixQrCodeImage(data.payment?.pix_qr_code_image || null);
        } catch (error) {
            console.error('Error loading order:', error);
            Alert.alert('Erro', 'Não foi possível carregar o pedido.');
            router.back();
        } finally {
            setLoading(false);
        }
    };
    loadOrderRef.current = loadOrder;

    const loadPix = async () => {
        if (!id) return;
        setPixLoading(true);
        try {
            const payment = await api.checkout(id);
            setPixCode(payment.pix?.copy_paste_code || null);
            setPixQrCodeImage(payment.pix?.qr_code_image || null);
        } catch (error: any) {
            console.error('Error loading PIX:', error);
            Alert.alert('Erro', error?.message || 'Não foi possível carregar o PIX.');
        } finally {
            setPixLoading(false);
        }
    };

    useEffect(() => {
        if (!order || order.status !== 'pending_payment') return;
        // Se o /me/orders não retornar pix_* (migration ainda não aplicada), buscamos via checkout idempotente.
        if (!pixCode && !pixQrCodeImage && !pixLoading) {
            loadPix();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order?.status]);

    const handleCopyPickupCode = async () => {
        if (!order?.pickup_code) return;
        const ok = await copyToClipboard(order.pickup_code);
        Alert.alert(
            ok ? '✅ Copiado!' : 'Dica',
            ok ? 'O código de retirada foi copiado.' : 'Toque e segure no código para copiar.',
        );
    };

    const handleCopyPixCode = async () => {
        const pix = pixCode || order?.payment?.pix_copy_paste_code;
        if (!pix) return;
        const ok = await copyToClipboard(pix);
        Alert.alert(
            ok ? '✅ Copiado!' : 'Dica',
            ok ? 'O código PIX foi copiado.' : 'Toque e segure no código para copiar.',
        );
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending_payment':
            case 'pending':
                return {
                    label: 'Aguardando Pagamento',
                    color: Colors.warning,
                    bgColor: Colors.warning15,
                    icon: 'time' as const,
                    description: 'Pague o PIX para confirmar seu pedido',
                };
            case 'paid':
                return {
                    label: 'Pago - Retirar',
                    color: Colors.success,
                    bgColor: Colors.success15,
                    icon: 'checkmark-circle' as const,
                    description: 'Vá até a loja e apresente o código de retirada',
                };
            case 'picked_up':
                return {
                    label: 'Retirado',
                    color: Colors.primary,
                    bgColor: Colors.primary15,
                    icon: 'bag-check' as const,
                    description: 'Pedido retirado com sucesso',
                };
            case 'cancelled':
                return {
                    label: 'Cancelado',
                    color: Colors.error,
                    bgColor: Colors.error15,
                    icon: 'close-circle' as const,
                    description: 'Este pedido foi cancelado',
                };
            default:
                return {
                    label: 'Desconhecido',
                    color: Colors.textMuted,
                    bgColor: Colors.surfaceMuted,
                    icon: 'help-circle' as const,
                    description: '',
                };
        }
    };

    if (loading || !order) {
        return (
            <GradientBackground>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </GradientBackground>
        );
    }

    const statusInfo = getStatusInfo(order.status);
    const pickupDeadlineInfo = (() => {
        const deadline = order.pickup_deadline;
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
    })();

    return (
        <GradientBackground>
            <View style={[styles.container, { paddingTop: screenPaddingTop }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Pedido #{order.id.slice(-6).toUpperCase()}</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Status Card */}
                    <View style={[styles.statusCard, { backgroundColor: statusInfo.bgColor }]}>
                        <Ionicons name={statusInfo.icon} size={48} color={statusInfo.color} />
                        <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
                            {statusInfo.label}
                        </Text>
                        <Text style={styles.statusDescription}>{statusInfo.description}</Text>

                        {order.status === 'paid' && pickupDeadlineInfo ? (
                            <View style={[styles.deadlineRow, pickupDeadlineInfo.expired && styles.deadlineRowExpired]}>
                                <Ionicons
                                    name={pickupDeadlineInfo.expired ? 'alert-circle' : 'time'}
                                    size={18}
                                    color={pickupDeadlineInfo.expired ? Colors.error : Colors.warning}
                                />
                                <Text style={styles.deadlineText}>
                                    {pickupDeadlineInfo.expired
                                        ? 'Prazo de retirada expirado'
                                        : `Retirada até ${new Date(pickupDeadlineInfo.deadline).toLocaleString('pt-BR')} • ${pickupDeadlineInfo.label}`}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Pickup Code */}
                    {order.status === 'paid' && order.pickup_code && (
                        <TouchableOpacity
                            style={styles.pickupCodeCard}
                            onPress={handleCopyPickupCode}
                        >
                            <Text style={styles.pickupCodeLabel}>Código de Retirada</Text>
                            <Text style={styles.pickupCode} selectable>{order.pickup_code}</Text>
                            <Text style={styles.pickupCodeHint}>Toque para copiar (ou segure para selecionar)</Text>
                        </TouchableOpacity>
                    )}

                    {/* PIX Code (if pending) */}
                    {order.status === 'pending_payment' && (
                        <View style={styles.pixCard}>
                            <Text style={styles.pixTitle}>Pague o PIX</Text>
                            {pixLoading && !pixQrCodeImage && !pixCode ? (
                                <View style={styles.pixLoadingRow}>
                                    <ActivityIndicator size="small" color={Colors.primary} />
                                    <Text style={styles.pixLoadingText}>Carregando PIX...</Text>
                                </View>
                            ) : null}
                            {pixQrCodeImage ? (
                                <View style={styles.qrCodeBox}>
                                    <Image
                                        source={{ uri: pixQrCodeImage }}
                                        style={styles.qrCodeImage}
                                        contentFit="contain"
                                        transition={200}
                                    />
                                </View>
                            ) : null}
                            {pixCode ? (
                                <>
                                    <View style={styles.pixCodeBox}>
                                        <Text style={styles.pixCode} selectable>
                                            {pixCode}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.copyButton}
                                        onPress={handleCopyPixCode}
                                    >
                                        <Ionicons name="copy" size={18} color={Colors.primary} />
                                        <Text style={styles.copyButtonText}>Copiar Código</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <TouchableOpacity style={styles.reloadPixButton} onPress={loadPix}>
                                    <Ionicons name="refresh" size={18} color={Colors.primary} />
                                    <Text style={styles.reloadPixText}>Gerar/Atualizar PIX</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Store Info */}
                    <Text style={styles.sectionTitle}>Loja</Text>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Ionicons name="storefront" size={18} color={Colors.textMuted} />
                            <Text style={styles.infoText}>{order.store?.name || 'Loja'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="location" size={18} color={Colors.textMuted} />
                            <Text style={styles.infoText}>
                                {order.store?.address
                                    ? `${order.store.address}${order.store.city ? `, ${order.store.city}` : ''}${order.store.state ? ` - ${order.store.state}` : ''}`
                                    : 'Endereço não informado'}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="time" size={18} color={Colors.textMuted} />
                            <Text style={styles.infoText}>{order.store?.hours || 'Horário não informado'}</Text>
                        </View>
                    </View>

                    {/* Items */}
                    <Text style={styles.sectionTitle}>Itens do Pedido</Text>
                    <View style={styles.itemsCard}>
                        {order.items?.map((item) => {
                            const unitPrice = item.unit_price ?? item.price ?? 0;

                            return (
                                <View key={item.id} style={styles.itemRow}>
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>{item.batch?.product?.name || 'Produto'}</Text>
                                        <Text style={styles.itemQty}>{item.quantity}x R$ {unitPrice.toFixed(2)}</Text>
                                    </View>
                                    <Text style={styles.itemTotal}>
                                        R$ {(item.quantity * unitPrice).toFixed(2)}
                                    </Text>
                                </View>
                            );
                        })}

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>R$ {order.total.toFixed(2)}</Text>
                        </View>
                    </View>

                    {/* Timestamps */}
                    <Text style={styles.sectionTitle}>Histórico</Text>
                    <View style={styles.timelineCard}>
                        <View style={styles.timelineItem}>
                            <View style={styles.timelineDot} />
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineLabel}>Pedido criado</Text>
                                <Text style={styles.timelineDate}>
                                    {new Date(order.created_at || '').toLocaleString('pt-BR')}
                                </Text>
                            </View>
                        </View>

                        {order.paid_at && (
                            <View style={styles.timelineItem}>
                                <View style={[styles.timelineDot, { backgroundColor: Colors.success }]} />
                                <View style={styles.timelineContent}>
                                    <Text style={styles.timelineLabel}>Pagamento confirmado</Text>
                                    <Text style={styles.timelineDate}>
                                        {new Date(order.paid_at).toLocaleString('pt-BR')}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {order.picked_up_at && (
                            <View style={styles.timelineItem}>
                                <View style={[styles.timelineDot, { backgroundColor: Colors.primary }]} />
                                <View style={styles.timelineContent}>
                                    <Text style={styles.timelineLabel}>Retirado</Text>
                                    <Text style={styles.timelineDate}>
                                        {new Date(order.picked_up_at).toLocaleString('pt-BR')}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        ...DesignTokens.typography.bodyBold,
        color: Colors.text,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    statusCard: {
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
    },
    statusLabel: {
        ...DesignTokens.typography.h2,
        marginTop: 16,
        marginBottom: 8,
    },
    statusDescription: {
        ...DesignTokens.typography.small,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    deadlineRow: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    deadlineRowExpired: {
        backgroundColor: Colors.error15,
        borderColor: Colors.error25,
    },
    deadlineText: {
        ...DesignTokens.typography.small,
        color: Colors.text,
        flex: 1,
        lineHeight: 18,
    },
    pickupCodeCard: {
        backgroundColor: '#ECFDF5', // Emerald-50
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 2,
        borderColor: Colors.primary, // Verde
        borderStyle: 'dashed',
    },
    pickupCodeLabel: {
        fontSize: 14,
        color: Colors.primary, // Verde
        marginBottom: 12,
        fontWeight: '600',
    },
    pickupCode: {
        fontSize: 32, // Conforme plano
        fontWeight: '800',
        color: Colors.primary, // Verde
        letterSpacing: 4,
    },
    pickupCodeHint: {
        fontSize: 12,
        color: Colors.textMuted,
        marginTop: 12,
    },
    pixCard: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    pixTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 12,
    },
    pixCodeBox: {
        backgroundColor: Colors.glass,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    qrCodeBox: {
        width: '100%',
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    qrCodeImage: {
        width: 220,
        height: 220,
        backgroundColor: Colors.surfaceMuted,
        borderRadius: 12,
    },
    pixCode: {
        fontSize: 11,
        color: Colors.textSecondary,
        fontFamily: 'monospace',
    },
    pixLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 12,
    },
    pixLoadingText: {
        ...DesignTokens.typography.small,
        color: Colors.textSecondary,
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
    },
    copyButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    reloadPixButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.glassBorder,
        marginTop: 12,
    },
    reloadPixText: {
        ...DesignTokens.typography.bodyBold,
        color: Colors.primary,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 12,
    },
    infoCard: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        gap: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: Colors.textSecondary,
    },
    itemsCard: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.glassBorder,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.text,
        marginBottom: 4,
    },
    itemQty: {
        fontSize: 12,
        color: Colors.textMuted,
    },
    itemTotal: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.success,
    },
    timelineCard: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.textMuted,
        marginTop: 4,
        marginRight: 12,
    },
    timelineContent: {
        flex: 1,
    },
    timelineLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.text,
        marginBottom: 4,
    },
    timelineDate: {
        fontSize: 12,
        color: Colors.textMuted,
    },
});
