/**
 * AnimatedBatchCard - VenceJá Design System
 * 
 * Card de batch com animações de entrada, visual moderno
 * e foco em urgência de compra
 */

import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { Batch } from '@/services/api';
import { getOptimizedSupabaseImageUrl } from '@/utils/images';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo } from 'react';
import {
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

interface AnimatedBatchCardProps {
    batch: Batch;
    index: number;
    selectedQuantity: number;
    availableStock: number;
    imageError: boolean;
    onQuantityChange: (batchId: string, delta: number) => void;
    onAddToCart: (batch: Batch) => void;
    onImageError: (key: string) => void;
}

export const AnimatedBatchCard: React.FC<AnimatedBatchCardProps> = memo(({
    batch,
    index,
    selectedQuantity,
    availableStock,
    imageError,
    onQuantityChange,
    onAddToCart,
    onImageError,
}) => {
    const scale = useSharedValue(0.95);
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);
    const pressScale = useSharedValue(1);

    // Entrance animation with stagger (otimizado: delay reduzido e limitado)
    useEffect(() => {
        // Limitar stagger a 10 itens (300ms max) para evitar lag em listas longas
        const delay = Math.min(index, 10) * 30;
        const timeoutId = setTimeout(() => {
            scale.value = withSpring(1, { damping: 18, stiffness: 200 });
            opacity.value = withTiming(1, { duration: 200 });
            translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
        }, delay);
        return () => clearTimeout(timeoutId);
    }, [index, opacity, scale, translateY]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value * pressScale.value },
            { translateY: translateY.value },
        ],
        opacity: opacity.value,
    }), []);

    const handlePressIn = useCallback(() => {
        'worklet';
        pressScale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    }, [pressScale]);

    const handlePressOut = useCallback(() => {
        'worklet';
        pressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }, [pressScale]);

    // Extract data (memoizado para evitar recálculo)
    const productData = useMemo(() => batch.products || batch.product, [batch.products, batch.product]);
    const productName = useMemo(() => productData?.nome || productData?.name || 'Produto sem nome', [productData]);
    const productPhoto = useMemo(() => productData?.foto1 || productData?.photo1 || null, [productData]);
    const isSurprise = useMemo(() => productData?.type === 'surprise', [productData?.type]);

    // Cálculo de preços (memoizado)
    const { originalPrice, promoPrice, discountPercent, savings } = useMemo(() => {
        const original = batch.original_price ?? batch.preco_normal_override ?? productData?.preco_normal ?? 0;
        const promo = batch.promo_price ?? batch.preco_promocional ?? 0;

        let discount = batch.discount_percent ?? batch.desconto_percentual ?? 0;
        if ((discount === 0 || !discount) && original > promo) {
            discount = ((original - promo) / original) * 100;
        }
        discount = Math.round(Math.max(0, Math.min(100, discount || 0)));

        return {
            originalPrice: original,
            promoPrice: promo,
            discountPercent: discount,
            savings: original - promo,
        };
    }, [batch.original_price, batch.preco_normal_override, batch.promo_price, batch.preco_promocional, batch.discount_percent, batch.desconto_percentual, productData?.preco_normal]);

    const storeName = useMemo(() => batch.store?.nome || batch.store?.name || 'Loja', [batch.store]);
    const storeLogo = useMemo(() => batch.store?.logo_url || null, [batch.store]);
    const storeId = useMemo(() => batch.store_id || batch.store?.id || batch.stores?.id, [batch.store_id, batch.store, batch.stores]);
    const estimatedValue = useMemo(
        () => batch.estimated_original_value ?? batch.valor_estimado_original,
        [batch.estimated_original_value, batch.valor_estimado_original]
    );

    // Cálculo de expiração (memoizado - cálculo pesado)
    const expirationInfo = useMemo(() => {
        const expirationDate = batch.expiration_date || batch.data_vencimento || null;
        let daysToExpire: number | null = null;
        let expirationText = '';

        if (expirationDate) {
            const expDate = new Date(expirationDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            expDate.setHours(0, 0, 0, 0);
            daysToExpire = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (daysToExpire < 0) {
                expirationText = 'Vencido';
            } else if (daysToExpire === 0) {
                expirationText = 'Vence hoje!';
            } else if (daysToExpire === 1) {
                expirationText = 'Vence amanhã';
            } else if (daysToExpire <= 7) {
                expirationText = `${daysToExpire} dias`;
            } else {
                expirationText = expDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            }
        }

        return {
            daysToExpire,
            expirationText,
            isUrgent: daysToExpire !== null && daysToExpire <= 2,
            isExpiringSoon: daysToExpire !== null && daysToExpire <= 7,
            isExpired: daysToExpire !== null && daysToExpire < 0,
        };
    }, [batch.expiration_date, batch.data_vencimento]);

    const { expirationText, isUrgent, isExpiringSoon, isExpired } = expirationInfo;

    // URIs de imagem (memoizado)
    const imageUri = useMemo(() =>
        !imageError ? getOptimizedSupabaseImageUrl(productPhoto, { width: 400, quality: 80 }) : null,
        [imageError, productPhoto]
    );
    const storeLogoUri = useMemo(() =>
        getOptimizedSupabaseImageUrl(storeLogo, { width: 200, quality: 80 }),
        [storeLogo]
    );

    // Callbacks otimizados
    const handleAddToCartPress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onAddToCart(batch);
    }, [batch, onAddToCart]);

    const handleNavigateToProduct = useCallback(() => {
        router.push(`/product/${batch.id}`);
    }, [batch.id]);

    return (
        <Animated.View style={[styles.card, animatedStyle]} collapsable={false}>
            {/* Image Section */}
            <TouchableOpacity
                style={styles.imageSection}
                onPress={handleNavigateToProduct}
                activeOpacity={0.95}
            >
                {imageUri ? (
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.image}
                        contentFit="cover"
                        transition={200}
                        onError={() => onImageError(batch.id)}
                    />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        {isSurprise ? (
                            <>
                                <Ionicons name="gift" size={48} color={Colors.textMuted} />
                                <Text style={styles.surprisePlaceholderText}>SURPRESA</Text>
                            </>
                        ) : (
                            <Ionicons name="image-outline" size={48} color={Colors.textMuted} />
                        )}
                    </View>
                )}

                {isSurprise && (
                    <View style={styles.surpriseBadge}>
                        <Ionicons name="gift" size={12} color="#FFFFFF" />
                        <Text style={styles.surpriseBadgeText}>SURPRESA</Text>
                    </View>
                )}

                {/* Discount Badge */}
                {discountPercent > 0 && (
                    <View style={[styles.discountBadge, isUrgent && styles.discountBadgeUrgent]}>
                        <Text style={styles.discountText}>-{discountPercent}%</Text>
                    </View>
                )}

                {/* Expiration Tag */}
                {expirationText && (
                    <View style={[
                        styles.expirationTag,
                        isUrgent && styles.expirationTagUrgent,
                        isExpiringSoon && !isUrgent && styles.expirationTagWarning,
                    ]}>
                        <Ionicons name="time" size={12} color="#FFFFFF" />
                        <Text style={styles.expirationText}>{expirationText}</Text>
                    </View>
                )}

                {/* Store Logo */}
                {storeLogo && (
                    <TouchableOpacity
                        style={styles.storeLogoContainer}
                        onPress={() => storeId && router.push({
                            pathname: '/(customer)/store-products',
                            params: { storeId }
                        })}
                    >
                        <Image
                            source={{ uri: storeLogoUri || storeLogo }}
                            style={styles.storeLogo}
                            contentFit="cover"
                        />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>

            {/* Content Section */}
            <View style={styles.content}>
                {/* Store Name */}
                <View style={styles.storeRow}>
                    {!storeLogo && (
                        <View style={styles.storeIconContainer}>
                            <Ionicons name="storefront" size={12} color={Colors.textMuted} />
                        </View>
                    )}
                    <Text style={styles.storeName} numberOfLines={1}>{storeName}</Text>
                </View>

                {/* Product Name */}
                <Text style={styles.productName} numberOfLines={2}>{productName}</Text>

                {/* Price Section */}
                <View style={styles.priceSection}>
                    <View style={styles.priceRow}>
                        {originalPrice > promoPrice && (
                            <Text style={styles.originalPrice}>
                                R$ {originalPrice.toFixed(2).replace('.', ',')}
                            </Text>
                        )}
                        <Text style={styles.promoPrice}>
                            R$ {promoPrice.toFixed(2).replace('.', ',')}
                        </Text>
                    </View>
                    {savings > 0 && (
                        <View style={styles.savingsBadge}>
                            <Text style={styles.savingsText}>
                                Economize R$ {savings.toFixed(2).replace('.', ',')}
                            </Text>
                        </View>
                    )}
                    {isSurprise && estimatedValue ? (
                        <Text style={styles.estimatedValue}>
                            Valor estimado R$ {estimatedValue.toFixed(2).replace('.', ',')}
                        </Text>
                    ) : null}
                </View>

                {/* Stock Info */}
                <View style={styles.stockRow}>
                    <Ionicons 
                        name="cube-outline" 
                        size={14} 
                        color={availableStock <= 3 ? Colors.warning : Colors.textMuted} 
                    />
                    <Text style={[
                        styles.stockText,
                        availableStock <= 3 && styles.stockTextLow
                    ]}>
                        {availableStock > 0 ? `${availableStock} disponível` : 'Esgotado'}
                    </Text>
                </View>

                {/* Quantity Selector */}
                {availableStock > 0 && !isExpired && (
                    <View style={styles.quantitySection}>
                        <View style={styles.quantitySelector}>
                            <TouchableOpacity
                                style={[styles.qtyButton, selectedQuantity <= 1 && styles.qtyButtonDisabled]}
                                onPress={() => onQuantityChange(batch.id, -1)}
                                disabled={selectedQuantity <= 1}
                            >
                                <Ionicons 
                                    name="remove" 
                                    size={18} 
                                    color={selectedQuantity <= 1 ? Colors.textMuted : Colors.text} 
                                />
                            </TouchableOpacity>
                            <Text style={styles.qtyValue}>{selectedQuantity}</Text>
                            <TouchableOpacity
                                style={[styles.qtyButton, selectedQuantity >= availableStock && styles.qtyButtonDisabled]}
                                onPress={() => onQuantityChange(batch.id, 1)}
                                disabled={selectedQuantity >= availableStock}
                            >
                                <Ionicons 
                                    name="add" 
                                    size={18} 
                                    color={selectedQuantity >= availableStock ? Colors.textMuted : Colors.text} 
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Add to Cart Button */}
                {!isExpired && (
                    <TouchableOpacity
                        style={[styles.addButton, availableStock === 0 && styles.addButtonDisabled]}
                        onPress={handleAddToCartPress}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        disabled={availableStock === 0}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="cart" size={18} color="#FFFFFF" />
                        <Text style={styles.addButtonText}>
                            {availableStock > 0 
                                ? (selectedQuantity > 1 ? `Adicionar ${selectedQuantity}x` : 'Adicionar') 
                                : 'Esgotado'}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Expired Message */}
                {isExpired && (
                    <View style={styles.expiredBanner}>
                        <Ionicons name="warning" size={16} color={Colors.error} />
                        <Text style={styles.expiredText}>Produto vencido</Text>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}, (prevProps, nextProps) => {
    // Função de comparação customizada para otimizar re-renders
    // Retornar true significa que os props são iguais (não re-renderizar)
    return (
        prevProps.batch.id === nextProps.batch.id &&
        prevProps.selectedQuantity === nextProps.selectedQuantity &&
        prevProps.availableStock === nextProps.availableStock &&
        prevProps.imageError === nextProps.imageError &&
        prevProps.index === nextProps.index
        // onQuantityChange, onAddToCart e onImageError são callbacks estáveis (não mudam)
    );
});

AnimatedBatchCard.displayName = 'AnimatedBatchCard';

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: DesignTokens.borderRadius.xl,
        overflow: 'hidden',
        marginBottom: DesignTokens.spacing.md,
        ...DesignTokens.shadows.md,
    },

    // ========== IMAGE SECTION ==========
    imageSection: {
        width: '100%',
        height: 180,
        position: 'relative',
        backgroundColor: Colors.surfaceMuted,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surfaceMuted,
    },
    surprisePlaceholderText: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: '700',
        color: Colors.textMuted,
        letterSpacing: 1,
    },
    surpriseBadge: {
        position: 'absolute',
        top: 60,
        left: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.secondary,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: DesignTokens.borderRadius.md,
        ...DesignTokens.shadows.sm,
    },
    surpriseBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.6,
    },
    discountBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: Colors.secondary,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: DesignTokens.borderRadius.md,
        ...DesignTokens.shadows.sm,
    },
    discountBadgeUrgent: {
        backgroundColor: Colors.error,
    },
    discountText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    expirationTag: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.65)',
        paddingVertical: 8,
    },
    expirationTagUrgent: {
        backgroundColor: Colors.error,
    },
    expirationTagWarning: {
        backgroundColor: 'rgba(245,158,11,0.9)',
    },
    expirationText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    storeLogoContainer: {
        position: 'absolute',
        top: 10,
        left: 10,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        ...DesignTokens.shadows.md,
    },
    storeLogo: {
        width: '100%',
        height: '100%',
    },

    // ========== CONTENT SECTION ==========
    content: {
        padding: DesignTokens.spacing.md,
    },
    storeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    storeIconContainer: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    storeName: {
        fontSize: 11,
        fontWeight: '500',
        color: Colors.textMuted,
        flex: 1,
    },
    productName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        lineHeight: 20,
        marginBottom: 10,
        minHeight: 40,
    },

    // ========== PRICE SECTION ==========
    priceSection: {
        marginBottom: 10,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
    },
    originalPrice: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.textMuted,
        textDecorationLine: 'line-through',
    },
    promoPrice: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.primary,
        letterSpacing: -0.5,
    },
    savingsBadge: {
        marginTop: 4,
        alignSelf: 'flex-start',
        backgroundColor: Colors.savingsBackground,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: DesignTokens.borderRadius.sm,
    },
    savingsText: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.savings,
    },
    estimatedValue: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
    },

    // ========== STOCK ==========
    stockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    stockText: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textMuted,
    },
    stockTextLow: {
        color: Colors.warning,
    },

    // ========== QUANTITY ==========
    quantitySection: {
        marginBottom: 12,
    },
    quantitySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: Colors.surfaceMuted,
        borderRadius: DesignTokens.borderRadius.lg,
        padding: 4,
    },
    qtyButton: {
        width: 36,
        height: 36,
        borderRadius: DesignTokens.borderRadius.md,
        backgroundColor: Colors.backgroundLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyButtonDisabled: {
        opacity: 0.4,
    },
    qtyValue: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        minWidth: 40,
        textAlign: 'center',
    },

    // ========== ADD BUTTON ==========
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: Colors.primary,
        borderRadius: DesignTokens.borderRadius.lg,
        paddingVertical: 14,
        ...DesignTokens.shadows.primary,
    },
    addButtonDisabled: {
        backgroundColor: Colors.surfaceMuted,
        ...DesignTokens.shadows.none,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },

    // ========== EXPIRED ==========
    expiredBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.error05,
        borderRadius: DesignTokens.borderRadius.md,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: Colors.error20,
    },
    expiredText: {
        color: Colors.error,
        fontSize: 14,
        fontWeight: '600',
    },
});
