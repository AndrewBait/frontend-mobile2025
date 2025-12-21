import { Button } from '@/components/base/Button';
import { Toast } from '@/components/feedback/Toast';
import { GradientBackground } from '@/components/GradientBackground';
import { ProfileRequiredModal } from '@/components/ProfileRequiredModal';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { api, Batch, Cart, CartItem, MultiCart, Order, Store } from '@/services/api';
import { supabase } from '@/services/supabase';
import { copyToClipboard } from '@/utils/clipboard';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CheckoutScreen() {
    const { storeId } = useLocalSearchParams<{ storeId: string }>();
    const insets = useSafeAreaInsets();
    const screenPaddingTop = insets.top + DesignTokens.spacing.md;
    const { isProfileComplete } = useAuth();
    const [cart, setCart] = useState<Cart | MultiCart | null>(null);
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [pixCode, setPixCode] = useState<string | null>(null);
    const [pixQrCodeImage, setPixQrCodeImage] = useState<string | null>(null);
    const [isCheckingPayment, setIsCheckingPayment] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
    const [mockConfirming, setMockConfirming] = useState(false);
    const [store, setStore] = useState<Store | null>(null);
    const [storeError, setStoreError] = useState<string | null>(null);

    const getBatchFromItem = (item: CartItem): Batch | null => item.batch || item.product_batches || null;

    useEffect(() => {
        if (!isProfileComplete) {
            setShowProfileModal(true);
        } else {
            loadStoreAndCart();
        }
    }, [isProfileComplete, storeId]);

    const loadStoreAndCart = async () => {
        try {
            // Carregar dados da loja para verificar asaas_wallet_id
            const storeData = await api.getPublicStore(storeId);
            setStore(storeData);
            
            // Verificar se loja tem asaas_wallet_id configurado
            if (!storeData.asaas_wallet_id) {
                setStoreError('Loja sem configuração de pagamento. Entre em contato com a loja.');
            } else {
                setStoreError(null);
            }
        } catch (error) {
            console.error('Error loading store:', error);
            setStoreError('Não foi possível carregar os dados da loja.');
        }

        try {
            const data = await api.getCart();
            setCart(data);
        } catch (error) {
            console.error('Error loading cart:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!order?.id) return;

        let isMounted = true;
        setIsCheckingPayment(true);

        const fetchLatest = async () => {
            try {
                const updated = await api.getMyOrder(order.id);
                if (!isMounted) return;
                setOrder(updated);

                if (updated.status === 'paid') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setToastMessage('Pagamento confirmado!');
                    setToastType('success');
                    setShowToast(true);
                    router.replace(`/order/${updated.id}`);
                }
            } catch {
                // Silencioso: rede pode oscilar; mantém fallback
            }
        };

        fetchLatest();

        const channel = supabase
            .channel(`order-status:${order.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${order.id}`,
                },
                () => {
                    fetchLatest();
                }
            )
            .subscribe();

        const interval = setInterval(fetchLatest, 10000);
        return () => {
            isMounted = false;
            clearInterval(interval);
            supabase.removeChannel(channel);
            setIsCheckingPayment(false);
        };
    }, [order?.id]);

    const handleCheckout = async () => {
        if (!isProfileComplete) {
            setShowProfileModal(true);
            return;
        }

        // Validar se loja tem asaas_wallet_id configurado (exceto em DEV onde usamos mock)
        if (!store?.asaas_wallet_id && !__DEV__) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setToastMessage('Esta loja ainda não configurou o pagamento. Entre em contato com a loja.');
            setToastType('error');
            setShowToast(true);
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setProcessing(true);
        try {
            // Se já existe um pedido pendente nesta tela, só (re)gera o PIX (idempotente)
            let currentOrder = order;
            if (!currentOrder) {
                // Reservar estoque antes de criar o pedido
                await api.reserveCart(storeId);

                // Create order
                const createdOrder = await api.createOrder(storeId);
                currentOrder = createdOrder;
                setOrder(createdOrder);
            }

            if (currentOrder.status === 'paid') {
                router.replace(`/order/${currentOrder.id}`);
                return;
            }

            // Get PIX code (idempotente no backend)
            const payment = await api.checkout(currentOrder.id);
            setPixCode(payment.pix?.copy_paste_code || null);
            setPixQrCodeImage(payment.pix?.qr_code_image || null);
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            console.error('Error processing checkout:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            
            // Mensagens específicas para diferentes erros
            let errorMessage = error.message || 'Não foi possível processar o pagamento.';
            if (error.message?.includes('CPF') || error.message?.includes('cpfCnpj')) {
                errorMessage = 'É necessário cadastrar seu CPF para realizar pagamentos. Vá em Perfil > Editar Perfil e adicione seu CPF.';
            } else if (error.message?.includes('split') || error.message?.includes('carteira')) {
                errorMessage = 'Erro de configuração de pagamento. A loja precisa ter um wallet ID diferente da plataforma. Entre em contato com o suporte.';
            }
            
            setToastMessage(errorMessage);
            setToastType('error');
            setShowToast(true);
        } finally {
            setProcessing(false);
        }
    };

    const handleMockConfirm = async () => {
        if (!order?.id) return;

        setMockConfirming(true);
        try {
            await api.mockConfirmPayment(order.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setToastMessage('Pagamento simulado! Atualizando pedido...');
            setToastType('success');
            setShowToast(true);
        } catch (error: any) {
            console.error('Error mocking payment:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setToastMessage(error?.message || 'Não foi possível simular o pagamento.');
            setToastType('error');
            setShowToast(true);
        } finally {
            setMockConfirming(false);
        }
    };

    const handleCopyPix = async () => {
        if (!pixCode) return;
        const ok = await copyToClipboard(pixCode);

        if (ok) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setToastMessage('Código PIX copiado!');
            setToastType('success');
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setToastMessage('Toque e segure no código para copiar');
            setToastType('info');
        }
        setShowToast(true);
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

    const storeCart = cart ? api.getCartsArray(cart).find((c) => c.store_id === storeId) : undefined;
    const storeItems = storeCart?.items || [];
    const total = storeItems.reduce((acc, item) => {
        const batch = getBatchFromItem(item);
        const promoPrice = batch?.preco_promocional ?? batch?.promo_price ?? 0;
        return acc + (promoPrice * item.quantity);
    }, 0);

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
                    <Text style={styles.headerTitle}>Checkout</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Progress Indicator */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressStep}>
                            <View style={[styles.progressDot, styles.progressDotActive]} />
                            <Text style={styles.progressLabel}>Resumo</Text>
                        </View>
                        <View style={styles.progressLine} />
                        <View style={styles.progressStep}>
                            <View style={[styles.progressDot, pixCode ? styles.progressDotActive : styles.progressDotInactive]} />
                            <Text style={[styles.progressLabel, !pixCode && styles.progressLabelInactive]}>PIX</Text>
                        </View>
                        <View style={styles.progressLine} />
                        <View style={styles.progressStep}>
                            <View style={[styles.progressDot, styles.progressDotInactive]} />
                            <Text style={styles.progressLabelInactive}>Confirmação</Text>
                        </View>
                    </View>

                    {pixCode ? (
                        // PIX Generated
                        <PixSuccessView
                            pixCode={pixCode}
                            pixQrCodeImage={pixQrCodeImage}
                            checkingPayment={isCheckingPayment}
                            onCopy={handleCopyPix}
                            onViewOrders={() => router.push('/(customer)/orders')}
                            showMockConfirm={__DEV__ && (pixCode.includes('MOCK') || !!pixQrCodeImage?.includes('MOCK'))}
                            mockConfirming={mockConfirming}
                            onMockConfirm={handleMockConfirm}
                        />
                    ) : (
                        // Order Summary
                        <>
                            <Text style={styles.sectionTitle}>Resumo do Pedido</Text>

                            <View style={styles.itemsCard}>
                                {storeItems.map((item) => {
                                    const batch = getBatchFromItem(item);
                                    if (!batch) return null;
                                    const product = batch.products || batch.product;
                                    const productName = product?.nome || product?.name || 'Produto';
                                    const promoPrice = batch.preco_promocional ?? batch.promo_price ?? 0;
                                    return (
                                        <View key={item.batch_id || item.product_batch_id} style={styles.itemRow}>
                                            <View style={styles.itemInfo}>
                                                <Text style={styles.itemName} numberOfLines={1}>
                                                    {productName}
                                                </Text>
                                                <Text style={styles.itemQty}>{item.quantity}x</Text>
                                            </View>
                                            <Text style={styles.itemPrice}>
                                                R$ {(promoPrice * item.quantity).toFixed(2).replace('.', ',')}
                                            </Text>
                                        </View>
                                    );
                                })}

                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>Total</Text>
                                    <Text style={styles.totalValue}>R$ {total.toFixed(2).replace('.', ',')}</Text>
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

                            {storeError ? (
                                <View style={[styles.infoCard, { backgroundColor: Colors.error15 }]}>
                                    <Ionicons name="alert-circle" size={20} color={Colors.error} />
                                    <Text style={[styles.infoText, { color: Colors.error }]}>
                                        {storeError}
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.infoCard}>
                                    <Ionicons name="information-circle" size={20} color={Colors.primary} />
                                    <Text style={styles.infoText}>
                                        Após o pagamento, você receberá um código de retirada.
                                        Apresente esse código na loja para retirar seus produtos.
                                    </Text>
                                </View>
                            )}
                        </>
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Bottom Bar */}
                {!pixCode && (
                    <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, DesignTokens.spacing.md) + DesignTokens.spacing.md }]}>
                        <View style={styles.bottomTotal}>
                            <Text style={styles.bottomTotalLabel}>Total</Text>
                            <Text style={styles.bottomTotalValue}>R$ {total.toFixed(2).replace('.', ',')}</Text>
                        </View>
                        <Button
                            title="Gerar PIX"
                            onPress={handleCheckout}
                            variant="primary"
                            size="lg"
                            loading={processing}
                            disabled={!!storeError || (!__DEV__ && !store?.asaas_wallet_id)}
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
    pixQrCodeImage: string | null;
    checkingPayment: boolean;
    onCopy: () => void;
    onViewOrders: () => void;
    showMockConfirm?: boolean;
    mockConfirming?: boolean;
    onMockConfirm?: () => void;
}> = ({ pixCode, pixQrCodeImage, checkingPayment, onCopy, onViewOrders, showMockConfirm, mockConfirming, onMockConfirm }) => {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 150 });
        opacity.value = withTiming(1, { duration: DesignTokens.animations.normal });
    }, []);

    const animatedContainerStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.pixContainer, animatedContainerStyle]}>
            <Animated.View style={animatedIconStyle}>
                <View style={styles.pixSuccessIcon}>
                    <Ionicons name="qr-code" size={64} color={Colors.success} />
                </View>
            </Animated.View>
            <Text style={styles.pixTitle}>Pague com PIX</Text>
            <Text style={styles.pixSubtitle}>
                Escaneie o QR Code no app do seu banco ou copie o código PIX
            </Text>

            {pixQrCodeImage ? (
                <View style={styles.qrCodeBox}>
                    <Image
                        source={{ uri: pixQrCodeImage }}
                        style={styles.qrCodeImage}
                        contentFit="contain"
                        transition={200}
                    />
                </View>
            ) : (
                <View style={styles.qrCodePlaceholder}>
                    <Ionicons name="qr-code-outline" size={80} color={Colors.textMuted} />
                    <Text style={styles.qrCodePlaceholderText}>QR Code não disponível</Text>
                </View>
            )}

            <View style={styles.pixCodeBox}>
                <Text style={styles.pixCode} selectable>{pixCode}</Text>
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
                {checkingPayment ? (
                    <>
                        <ActivityIndicator size="small" color={Colors.warning} />
                        <Text style={styles.timerText}>
                            Aguardando confirmação do pagamento...
                        </Text>
                    </>
                ) : (
                    <>
                        <Ionicons name="time" size={20} color={Colors.warning} />
                        <Text style={styles.timerText}>
                            Após o pagamento, você terá 2 horas para retirada
                        </Text>
                    </>
                )}
            </View>

            <Button
                title="Ver Meus Pedidos"
                onPress={onViewOrders}
                variant="secondary"
                size="md"
                fullWidth
            />

            {showMockConfirm && onMockConfirm ? (
                <View style={styles.mockBox}>
                    <View style={styles.mockHeader}>
                        <Ionicons name="flask" size={18} color={Colors.warning} />
                        <Text style={styles.mockTitle}>Modo teste</Text>
                    </View>
                    <Text style={styles.mockText}>
                        Use este botão para simular a confirmação do pagamento e seguir o fluxo até o código de retirada.
                    </Text>
                    <Button
                        title="Simular pagamento (DEV)"
                        onPress={onMockConfirm}
                        variant="outline"
                        size="md"
                        loading={!!mockConfirming}
                        fullWidth
                    />
                </View>
            ) : null}
        </Animated.View>
    );
};

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
        paddingHorizontal: DesignTokens.padding.medium, // Responsivo
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: DesignTokens.spacing.xl,
        paddingVertical: DesignTokens.spacing.md,
    },
    progressStep: {
        alignItems: 'center',
        gap: DesignTokens.spacing.xs,
    },
    progressDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressDotActive: {
        backgroundColor: Colors.primary,
        ...DesignTokens.shadows.sm,
    },
    progressDotInactive: {
        backgroundColor: Colors.glass,
        borderWidth: 2,
        borderColor: Colors.border,
    },
    progressLine: {
        flex: 1,
        height: 2,
        backgroundColor: Colors.border,
        marginHorizontal: DesignTokens.spacing.xs,
    },
    progressLabel: {
        ...DesignTokens.typography.caption,
        color: Colors.primary,
        fontWeight: '600',
        marginTop: DesignTokens.spacing.xs,
    },
    progressLabelInactive: {
        color: Colors.textMuted,
        fontWeight: '400',
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
        backgroundColor: Colors.success20,
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
        backgroundColor: Colors.primary15,
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
        backgroundColor: Colors.warning15,
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
    mockBox: {
        width: '100%',
        backgroundColor: Colors.glass,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        padding: 16,
        gap: 12,
        marginTop: 16,
    },
    mockHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    mockTitle: {
        ...DesignTokens.typography.bodyBold,
        color: Colors.text,
    },
    mockText: {
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    qrCodeBox: {
        width: '100%',
        backgroundColor: Colors.backgroundCard,
        borderRadius: DesignTokens.borderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        padding: DesignTokens.spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: DesignTokens.spacing.md,
        ...DesignTokens.shadows.sm,
    },
    qrCodeImage: {
        width: 220,
        height: 220,
        backgroundColor: Colors.surfaceMuted,
        borderRadius: DesignTokens.borderRadius.md,
    },
    qrCodePlaceholder: {
        width: '100%',
        backgroundColor: Colors.backgroundCard,
        borderRadius: DesignTokens.borderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        padding: DesignTokens.spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: DesignTokens.spacing.md,
        gap: DesignTokens.spacing.sm,
        ...DesignTokens.shadows.sm,
    },
    qrCodePlaceholderText: {
        fontSize: 14,
        color: Colors.textMuted,
        textAlign: 'center',
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
