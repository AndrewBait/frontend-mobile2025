import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Clipboard,
    Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../../components/GradientBackground';
import { Colors } from '../../constants/Colors';
import { api, Order } from '../../services/api';

export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadOrder();
        }
    }, [id]);

    const loadOrder = async () => {
        try {
            const data = await api.getMyOrder(id!);
            setOrder(data);
        } catch (error) {
            console.error('Error loading order:', error);
            Alert.alert('Erro', 'Não foi possível carregar o pedido.');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleCopyPickupCode = () => {
        if (order?.pickup_code) {
            Clipboard.setString(order.pickup_code);
            Alert.alert('✅ Copiado!', 'O código de retirada foi copiado.');
        }
    };

    const handleCopyPixCode = () => {
        if (order?.pix_code) {
            Clipboard.setString(order.pix_code);
            Alert.alert('✅ Copiado!', 'O código PIX foi copiado.');
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending':
                return {
                    label: 'Aguardando Pagamento',
                    color: Colors.warning,
                    icon: 'time' as const,
                    description: 'Pague o PIX para confirmar seu pedido',
                };
            case 'paid':
                return {
                    label: 'Pago - Retirar',
                    color: Colors.success,
                    icon: 'checkmark-circle' as const,
                    description: 'Vá até a loja e apresente o código de retirada',
                };
            case 'picked_up':
                return {
                    label: 'Retirado',
                    color: Colors.primary,
                    icon: 'bag-check' as const,
                    description: 'Pedido retirado com sucesso',
                };
            case 'cancelled':
                return {
                    label: 'Cancelado',
                    color: Colors.error,
                    icon: 'close-circle' as const,
                    description: 'Este pedido foi cancelado',
                };
            case 'expired':
                return {
                    label: 'Expirado',
                    color: Colors.textMuted,
                    icon: 'alert-circle' as const,
                    description: 'O prazo de retirada expirou',
                };
            default:
                return {
                    label: 'Desconhecido',
                    color: Colors.textMuted,
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

    return (
        <GradientBackground>
            <View style={styles.container}>
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
                    <View style={[styles.statusCard, { backgroundColor: statusInfo.color + '20' }]}>
                        <Ionicons name={statusInfo.icon} size={48} color={statusInfo.color} />
                        <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
                            {statusInfo.label}
                        </Text>
                        <Text style={styles.statusDescription}>{statusInfo.description}</Text>
                    </View>

                    {/* Pickup Code */}
                    {order.status === 'paid' && order.pickup_code && (
                        <TouchableOpacity
                            style={styles.pickupCodeCard}
                            onPress={handleCopyPickupCode}
                        >
                            <Text style={styles.pickupCodeLabel}>Código de Retirada</Text>
                            <Text style={styles.pickupCode}>{order.pickup_code}</Text>
                            <Text style={styles.pickupCodeHint}>Toque para copiar</Text>
                        </TouchableOpacity>
                    )}

                    {/* PIX Code (if pending) */}
                    {order.status === 'pending' && order.pix_code && (
                        <View style={styles.pixCard}>
                            <Text style={styles.pixTitle}>Pague o PIX</Text>
                            <View style={styles.pixCodeBox}>
                                <Text style={styles.pixCode} numberOfLines={3}>{order.pix_code}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.copyButton}
                                onPress={handleCopyPixCode}
                            >
                                <Ionicons name="copy" size={18} color={Colors.primary} />
                                <Text style={styles.copyButtonText}>Copiar Código</Text>
                            </TouchableOpacity>
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
                                {order.store?.address}, {order.store?.city} - {order.store?.state}
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
                        {order.items?.map((item) => (
                            <View key={item.id} style={styles.itemRow}>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemName}>{item.batch?.product?.name || 'Produto'}</Text>
                                    <Text style={styles.itemQty}>{item.quantity}x R$ {item.unit_price.toFixed(2)}</Text>
                                </View>
                                <Text style={styles.itemTotal}>
                                    R$ {(item.quantity * item.unit_price).toFixed(2)}
                                </Text>
                            </View>
                        ))}

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>R$ {order.total_amount.toFixed(2)}</Text>
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
        paddingTop: 50,
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
        fontSize: 18,
        fontWeight: '600',
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
        fontSize: 20,
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 8,
    },
    statusDescription: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    pickupCodeCard: {
        backgroundColor: Colors.success + '20',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 2,
        borderColor: Colors.success,
        borderStyle: 'dashed',
    },
    pickupCodeLabel: {
        fontSize: 14,
        color: Colors.success,
        marginBottom: 12,
    },
    pickupCode: {
        fontSize: 36,
        fontWeight: '800',
        color: Colors.success,
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
    pixCode: {
        fontSize: 11,
        color: Colors.textSecondary,
        fontFamily: 'monospace',
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
