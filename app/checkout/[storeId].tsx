import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Clipboard,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { Button } from '../../components/base/Button';
import { Toast } from '../../components/feedback/Toast';
import { GradientBackground } from '../../components/GradientBackground';
import { ProfileRequiredModal } from '../../components/ProfileRequiredModal';
import { Colors } from '../../constants/Colors';
import { DesignTokens } from '../../constants/designTokens';
import { useAuth } from '../../contexts/AuthContext';
import { api, Cart } from '../../services/api';

export default function CheckoutScreen() {
    const { storeId } = useLocalSearchParams<{ storeId: string }>();
    const { isProfileComplete } = useAuth();
    const [cart, setCart] = useState<Cart | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [pixCode, setPixCode] = useState<string | null>(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

    useEffect(() => {
        if (!isProfileComplete) {
            setShowProfileModal(true);
        } else {
            loadCart();
        }
    }, [isProfileComplete]);

    const loadCart = async () => {
        try {
            const data = await api.getCart();
            setCart(data);
        } catch (error) {
            console.error('Error loading cart:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckout = async () => {
        if (!isProfileComplete) {
            setShowProfileModal(true);
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setProcessing(true);
        try {
            // Create order
            const order = await api.createOrder();

            // Get PIX code
            const payment = await api.checkout(order.id);
            setPixCode(payment.pix_code);
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            console.error('Error processing checkout:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setToastMessage(error.message || 'Não foi possível processar o pagamento.');
            setToastType('error');
            setShowToast(true);
        } finally {
            setProcessing(false);
        }
    };

    const handleCopyPix = () => {
        if (pixCode) {
            Clipboard.setString(pixCode);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setToastMessage('Código PIX copiado!');
            setToastType('success');
            setShowToast(true);
        }
    };

    if (!isProfileComplete && showProfileModal) {
        return (
            <GradientBackground>
                <ProfileRequiredModal
                    visible={showProfileModal}
                    onClose={() => {
                        setShowProfileModal(false);
                        router.back();
                    }}
                />
            </GradientBackground>
        );
    }

    if (loading) {
        return (
            <GradientBackground>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </GradientBackground>
        );
    }

    const storeItems = cart?.items.filter(item => item.batch?.store_id === storeId) || [];
    const total = storeItems.reduce((acc, item) =>
        acc + ((item.batch?.promo_price || 0) * item.quantity), 0
    );

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
                    <Text style={styles.headerTitle}>Checkout</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {pixCode ? (
                        // PIX Generated
                        <PixSuccessView
                            pixCode={pixCode}
                            onCopy={handleCopyPix}
                            onViewOrders={() => router.push('/(customer)/orders')}
                        />
                    ) : (
                        // Order Summary
                        <>
                            <Text style={styles.sectionTitle}>Resumo do Pedido</Text>

                            <View style={styles.itemsCard}>
                                {storeItems.map((item) => (
                                    <View key={item.batch_id} style={styles.itemRow}>
                                        <View style={styles.itemInfo}>
                                            <Text style={styles.itemName} numberOfLines={1}>
                                                {item.batch?.product?.name || 'Produto'}
                                            </Text>
                                            <Text style={styles.itemQty}>{item.quantity}x</Text>
                                        </View>
                                        <Text style={styles.itemPrice}>
                                            R$ {((item.batch?.promo_price || 0) * item.quantity).toFixed(2)}
                                        </Text>
                                    </View>
                                ))}

                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>Total</Text>
                                    <Text style={styles.totalValue}>R$ {total.toFixed(2)}</Text>
                                </View>
                            </View>

                            <Text style={styles.sectionTitle}>Pagamento</Text>

                            <View style={styles.paymentCard}>
                                <View style={styles.pixBadge}>
                                    <Ionicons name="flash" size={20} color={Colors.success} />
                                </View>
                                <View style={styles.paymentInfo}>
                                    <Text style={styles.paymentTitle}>PIX</Text>
                                    <Text style={styles.paymentSubtitle}>Pagamento instantâneo</Text>
                                </View>
                                <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                            </View>

                            <View style={styles.infoCard}>
                                <Ionicons name="information-circle" size={20} color={Colors.primary} />
                                <Text style={styles.infoText}>
                                    Após o pagamento, você receberá um código de retirada.
                                    Apresente esse código na loja para retirar seus produtos.
                                </Text>
                            </View>
                        </>
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Bottom Bar */}
                {!pixCode && (
                    <View style={styles.bottomBar}>
                        <View style={styles.bottomTotal}>
                            <Text style={styles.bottomTotalLabel}>Total</Text>
                            <Text style={styles.bottomTotalValue}>R$ {total.toFixed(2)}</Text>
                        </View>
                        <Button
                            title="Gerar PIX"
                            onPress={handleCheckout}
                            variant="primary"
                            size="lg"
                            loading={processing}
                            leftIcon={!processing ? <Ionicons name="card" size={20} color={Colors.text} /> : undefined}
                            fullWidth
                            hapticFeedback
                            accessibilityLabel={`Gerar código PIX para pagamento de R$ ${total.toFixed(2)}`}
                        />
                    </View>
                )}
            </View>

            {/* Toast */}
            <Toast
                message={toastMessage}
                type={toastType}
                visible={showToast}
                onHide={() => setShowToast(false)}
                duration={3000}
            />
        </GradientBackground>
    );
}

// Componente para o estado de sucesso do PIX
const PixSuccessView: React.FC<{
    pixCode: string;
    onCopy: () => void;
    onViewOrders: () => void;
}> = ({ pixCode, onCopy, onViewOrders }) => {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 150 });
        opacity.value = withTiming(1, { duration: DesignTokens.animations.normal });
    }, []);

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.pixContainer, { opacity: opacity.value }]}>
            <Animated.View style={animatedIconStyle}>
                <View style={styles.pixSuccessIcon}>
                    <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
                </View>
            </Animated.View>
            <Text style={styles.pixTitle}>PIX Gerado com Sucesso!</Text>
            <Text style={styles.pixSubtitle}>
                Copie o código abaixo e pague no app do seu banco
            </Text>

            <View style={styles.pixCodeBox}>
                <Text style={styles.pixCode} numberOfLines={3} selectable>{pixCode}</Text>
            </View>

            <Button
                title="Copiar Código PIX"
                onPress={onCopy}
                variant="primary"
                size="lg"
                leftIcon={<Ionicons name="copy" size={20} color={Colors.text} />}
                fullWidth
                hapticFeedback
                style={styles.copyButton}
                accessibilityLabel="Copiar código PIX"
                accessibilityHint="Copia o código PIX para área de transferência"
            />

            <View style={styles.timerBox}>
                <Ionicons name="time" size={20} color={Colors.warning} />
                <Text style={styles.timerText}>
                    Após o pagamento, você terá 2 horas para retirada
                </Text>
            </View>

            <Button
                title="Ver Meus Pedidos"
                onPress={onViewOrders}
                variant="secondary"
                size="md"
                fullWidth
            />
        </Animated.View>
    );
};

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
        width: DesignTokens.touchTargets.min,
        height: DesignTokens.touchTargets.min,
        borderRadius: DesignTokens.borderRadius.lg,
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
    sectionTitle: {
        ...DesignTokens.typography.h3,
        color: Colors.text,
        marginBottom: DesignTokens.spacing.md,
    },
    itemsCard: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: DesignTokens.borderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        padding: DesignTokens.spacing.md,
        marginBottom: DesignTokens.spacing.lg,
        ...DesignTokens.shadows.sm,
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    itemName: {
        flex: 1,
        fontSize: 14,
        color: Colors.text,
    },
    itemQty: {
        fontSize: 14,
        color: Colors.textMuted,
    },
    itemPrice: {
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
    paymentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        padding: 16,
        marginBottom: 16,
        gap: 12,
    },
    pixBadge: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: Colors.success + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    paymentInfo: {
        flex: 1,
    },
    paymentTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    paymentSubtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.primary + '15',
        borderRadius: 12,
        padding: 16,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: Colors.text,
        lineHeight: 18,
    },
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 32,
        backgroundColor: Colors.backgroundCard,
        borderTopWidth: 1,
        borderTopColor: Colors.glassBorder,
        gap: 16,
    },
    bottomTotal: {
        flex: 1,
    },
    bottomTotalLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    bottomTotalValue: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    payButton: {
        flex: 1,
    },
    // PIX Success
    pixContainer: {
        alignItems: 'center',
        paddingTop: 40,
    },
    pixSuccessIcon: {
        marginBottom: 24,
    },
    pixTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 8,
    },
    pixSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
    },
    pixCodeBox: {
        width: '100%',
        backgroundColor: Colors.glass,
        borderRadius: DesignTokens.borderRadius.md,
        padding: DesignTokens.spacing.md,
        marginBottom: DesignTokens.spacing.md,
        borderWidth: 2,
        borderColor: Colors.primary,
        borderStyle: 'dashed',
    },
    pixCode: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontFamily: 'monospace',
        lineHeight: 18,
    },
    copyButton: {
        marginBottom: DesignTokens.spacing.lg,
    },
    timerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.warning + '15',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        gap: 12,
    },
    timerText: {
        flex: 1,
        fontSize: 13,
        color: Colors.warning,
        lineHeight: 18,
    },
    ordersButton: {
        paddingVertical: 14,
        paddingHorizontal: 32,
    },
    ordersButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.primary,
    },
});
