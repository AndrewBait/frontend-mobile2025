import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { memo, useEffect } from 'react';
import {
    Image,
    ImageErrorEventData,
    NativeSyntheticEvent,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { DesignTokens } from '../../constants/designTokens';
import { Batch } from '../../services/api';
import { Badge } from '../base/Badge';

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

    // Animação de entrada com stagger
    useEffect(() => {
        const delay = index * 50;
        setTimeout(() => {
            scale.value = withSpring(1, {
                damping: 15,
                stiffness: 150,
            });
            opacity.value = withTiming(1, { duration: DesignTokens.animations.normal });
            translateY.value = withSpring(0, {
                damping: 15,
                stiffness: 150,
            });
        }, delay);
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value * pressScale.value },
            { translateY: translateY.value },
        ],
        opacity: opacity.value,
    }), []);

    const pressAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pressScale.value }],
    }), []);

    const handlePressIn = () => {
        pressScale.value = withTiming(0.98, { duration: DesignTokens.animations.fast });
    };

    const handlePressOut = () => {
        pressScale.value = withSpring(1, {
            damping: 15,
            stiffness: 300,
        });
    };

    // Handle both PT-BR and EN field names
    const productData = (batch as any).products || batch.product;
    const productName = productData?.nome || productData?.name || 'Produto sem nome';
    const productPhoto = productData?.foto1 || productData?.photo1 || null;
    
    // Prices
    const originalPrice = batch.original_price ?? batch.preco_normal_override ?? productData?.preco_normal ?? 0;
    const promoPrice = batch.promo_price ?? batch.preco_promocional ?? 0;
    
    // Calculate discount
    let discountPercent = batch.discount_percent ?? batch.desconto_percentual ?? 0;
    if ((discountPercent === 0 || !discountPercent || isNaN(discountPercent)) && originalPrice > 0 && promoPrice > 0 && originalPrice > promoPrice) {
        discountPercent = ((originalPrice - promoPrice) / originalPrice) * 100;
    }
    discountPercent = Math.max(0, Math.min(100, discountPercent || 0));
    
    // Store info
    const storeName = batch.store?.name || (batch.store as any)?.nome || 'Loja';
    const storeHours = batch.store?.hours || (batch.store as any)?.horario_funcionamento || '';
    const storeLogo = batch.store?.logo_url || null;
    const storeId = batch.store_id || (batch.store as any)?.id;
    
    // Expiration date
    const expirationDate = batch.expiration_date || batch.data_vencimento || null;
    let expirationDisplay = 'N/A';
    let expirationDateFormatted = '';
    let daysToExpire: number | null = null;
    if (expirationDate) {
        const expDate = new Date(expirationDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expDate.setHours(0, 0, 0, 0);
        const diffTime = expDate.getTime() - today.getTime();
        daysToExpire = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        expirationDateFormatted = expDate.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
        
        if (daysToExpire < 0) {
            expirationDisplay = 'Vencido';
        } else if (daysToExpire === 0) {
            expirationDisplay = 'Vence hoje';
        } else if (daysToExpire === 1) {
            expirationDisplay = 'Vence amanhã';
        } else {
            expirationDisplay = `${daysToExpire} dias`;
        }
    }
    
    const imageKey = batch.id;
    const imageUri = productPhoto && !imageError ? productPhoto : null;
    
    const handleImageError = (e: NativeSyntheticEvent<ImageErrorEventData>) => {
        onImageError(imageKey);
    };

    const handleAddToCartPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onAddToCart(batch);
    };

    return (
        <Animated.View style={[styles.card, animatedStyle]} collapsable={false}>
            {/* Product Image */}
            <TouchableOpacity
                style={styles.imageContainer}
                onPress={() => router.push(`/product/${batch.id}`)}
                activeOpacity={0.9}
            >
                {imageUri ? (
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.productImage}
                        resizeMode="cover"
                        onError={handleImageError}
                    />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Ionicons name="image-outline" size={40} color={Colors.textMuted} />
                        <Text style={styles.imagePlaceholderText}>Sem imagem</Text>
                    </View>
                )}
                
                {/* Discount Badge */}
                {discountPercent > 0 && (
                    <Badge
                        label={`-${Math.round(discountPercent)}%`}
                        variant="error"
                        size="md"
                        style={styles.discountBadge}
                    />
                )}
                
                {/* Store Logo overlay na imagem */}
                {storeLogo && storeId && (
                    <TouchableOpacity
                        style={styles.storeLogoOverlay}
                        onPress={() => {
                            router.push({
                                pathname: '/(customer)/store-products',
                                params: { storeId }
                            });
                        }}
                        activeOpacity={0.8}
                    >
                        <View style={styles.storeLogoOverlayContainer}>
                            <Image
                                source={{ uri: storeLogo }}
                                style={styles.storeLogoOverlayImage}
                                resizeMode="cover"
                            />
                        </View>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>

            <View style={styles.productInfo}>
                {/* Store name */}
                <Text style={styles.storeName} numberOfLines={1}>
                    {storeName}
                </Text>
                
                {/* Product name */}
                <Text style={styles.productName} numberOfLines={2}>
                    {productName}
                </Text>
                
                {/* Store hours */}
                {storeHours && (
                    <View style={styles.storeHoursRow}>
                        <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                        <Text style={styles.storeHoursText} numberOfLines={1}>
                            {storeHours}
                        </Text>
                    </View>
                )}
                
                {/* Price row */}
                <View style={styles.priceRow}>
                    <View style={styles.priceContainer}>
                        {originalPrice > promoPrice && (
                            <Text style={styles.originalPrice}>
                                R$ {originalPrice.toFixed(2).replace('.', ',')}
                            </Text>
                        )}
                        <Text style={styles.promoPrice}>
                            R$ {promoPrice.toFixed(2).replace('.', ',')}
                        </Text>
                    </View>
                </View>

                {/* Expiration date */}
                {expirationDate && (
                    <View style={styles.expirationRow}>
                        <Ionicons 
                            name="calendar-outline" 
                            size={14} 
                            color={daysToExpire !== null && daysToExpire <= 2 ? Colors.error : Colors.warning} 
                        />
                        <View style={styles.expirationInfo}>
                            <Text style={[
                                styles.expirationText,
                                daysToExpire !== null && daysToExpire <= 2 && styles.expirationTextUrgent
                            ]}>
                                {expirationDisplay}
                            </Text>
                            <Text style={styles.expirationDateText}>
                                {expirationDateFormatted}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Stock and quantity selector */}
                <View style={styles.stockQuantityRow}>
                    <View style={styles.stockInfo}>
                        <Ionicons name="cube-outline" size={12} color={Colors.textMuted} />
                        <Text style={styles.stockText}>
                            {availableStock > 0 ? `${availableStock} disponível(eis)` : 'Esgotado'}
                        </Text>
                    </View>
                    
                    {/* Quantity selector */}
                    {availableStock > 0 && (
                        <View style={styles.quantitySelector}>
                            <TouchableOpacity
                                style={[styles.quantityButton, selectedQuantity <= 1 && styles.quantityButtonDisabled]}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onQuantityChange(batch.id, -1);
                                }}
                                disabled={selectedQuantity <= 1}
                            >
                                <Ionicons 
                                    name="remove" 
                                    size={16} 
                                    color={selectedQuantity <= 1 ? Colors.textMuted : Colors.text} 
                                />
                            </TouchableOpacity>
                            <Text style={styles.quantityText}>{selectedQuantity}</Text>
                            <TouchableOpacity
                                style={[styles.quantityButton, selectedQuantity >= availableStock && styles.quantityButtonDisabled]}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onQuantityChange(batch.id, 1);
                                }}
                                disabled={selectedQuantity >= availableStock}
                            >
                                <Ionicons 
                                    name="add" 
                                    size={16} 
                                    color={selectedQuantity >= availableStock ? Colors.textMuted : Colors.text} 
                                />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Add button - SÓ APARECE SE NÃO ESTIVER VENCIDO */}
                {daysToExpire === null || daysToExpire >= 0 ? (
                    <View style={styles.addButtonContainer}>
                        <Animated.View style={pressAnimatedStyle}>
                            <TouchableOpacity
                                style={[
                                    styles.addButton,
                                    availableStock === 0 && styles.addButtonDisabled
                                ]}
                                onPress={handleAddToCartPress}
                                onPressIn={handlePressIn}
                                onPressOut={handlePressOut}
                                disabled={availableStock === 0}
                                accessibilityRole="button"
                                accessibilityLabel={`Adicionar ${productName} ao carrinho`}
                                accessibilityHint={`Produto custa R$ ${promoPrice.toFixed(2)}`}
                            >
                                <Ionicons 
                                    name="cart" 
                                    size={18} 
                                    color={Colors.text} 
                                />
                                <Text style={styles.addButtonText} numberOfLines={1}>
                                    {availableStock > 0 
                                        ? (selectedQuantity > 1 ? `Adicionar ${selectedQuantity}x` : 'Adicionar') 
                                        : 'Esgotado'}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                ) : null}
            </View>
        </Animated.View>
    );
});

AnimatedBatchCard.displayName = 'AnimatedBatchCard';

const styles = StyleSheet.create({
    card: {
        width: '100%',
        backgroundColor: Colors.backgroundCard,
        borderRadius: DesignTokens.borderRadius.xl,
        borderWidth: 1.5,
        borderColor: Colors.glassBorder,
        overflow: 'hidden',
        marginBottom: DesignTokens.spacing.md,
        ...DesignTokens.shadows.md,
        position: 'relative',
    },
    storeLogoContainer: {
        position: 'absolute',
        top: DesignTokens.spacing.md,
        left: DesignTokens.spacing.md,
        zIndex: 10,
    },
    storeLogo: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.backgroundCard,
        borderWidth: 3,
        borderColor: Colors.backgroundCard,
        overflow: 'hidden',
        ...DesignTokens.shadows.lg,
    },
    storeLogoImage: {
        width: '100%',
        height: '100%',
    },
    storeLogoOverlay: {
        position: 'absolute',
        top: DesignTokens.spacing.md,
        left: DesignTokens.spacing.md,
        zIndex: 10,
    },
    storeLogoOverlayContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.backgroundCard,
        borderWidth: 3,
        borderColor: Colors.backgroundCard,
        overflow: 'hidden',
        ...DesignTokens.shadows.lg,
    },
    storeLogoOverlayImage: {
        width: '100%',
        height: '100%',
    },
    imageContainer: {
        width: '100%',
        height: 200,
        backgroundColor: Colors.glass,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 0,
    },
    productImage: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.glass,
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imagePlaceholderText: {
        ...DesignTokens.typography.caption,
        color: Colors.textMuted,
        marginTop: DesignTokens.spacing.xs,
    },
    discountBadge: {
        position: 'absolute',
        top: DesignTokens.spacing.md,
        right: DesignTokens.spacing.md,
        zIndex: 5,
    },
    productInfo: {
        padding: DesignTokens.spacing.md,
        paddingBottom: DesignTokens.spacing.md,
        flexShrink: 0,
    },
    storeName: {
        ...DesignTokens.typography.captionBold,
        color: Colors.textMuted,
        marginBottom: DesignTokens.spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    productName: {
        ...DesignTokens.typography.bodyBold,
        color: Colors.text,
        marginBottom: DesignTokens.spacing.xs,
        minHeight: 40,
        lineHeight: 20,
    },
    storeHoursRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: DesignTokens.spacing.xs + 2,
        marginBottom: DesignTokens.spacing.xs,
        marginTop: DesignTokens.spacing.xs,
    },
    storeHoursText: {
        ...DesignTokens.typography.small,
        color: Colors.textMuted,
        fontWeight: '600',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: DesignTokens.spacing.sm,
        marginTop: DesignTokens.spacing.xs,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: DesignTokens.spacing.xs + 2,
        flex: 1,
    },
    originalPrice: {
        ...DesignTokens.typography.caption,
        color: Colors.textMuted,
        textDecorationLine: 'line-through',
    },
    promoPrice: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.success,
    },
    expirationRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: DesignTokens.spacing.xs + 2,
        marginBottom: DesignTokens.spacing.xs,
        paddingVertical: DesignTokens.spacing.xs + 1,
        paddingHorizontal: DesignTokens.spacing.sm,
        backgroundColor: Colors.glass,
        borderRadius: DesignTokens.borderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    expirationInfo: {
        flex: 1,
    },
    expirationText: {
        ...DesignTokens.typography.captionBold,
        color: Colors.warning,
        marginBottom: 2,
    },
    expirationTextUrgent: {
        color: Colors.error,
    },
    expirationDateText: {
        ...DesignTokens.typography.caption,
        color: Colors.textMuted,
        fontWeight: '500',
    },
    stockQuantityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: DesignTokens.spacing.xs,
        paddingVertical: DesignTokens.spacing.xs + 1,
        paddingHorizontal: DesignTokens.spacing.sm,
        backgroundColor: Colors.glass,
        borderRadius: DesignTokens.borderRadius.sm,
    },
    stockInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: DesignTokens.spacing.xs,
        flex: 1,
    },
    stockText: {
        ...DesignTokens.typography.caption,
        color: Colors.textMuted,
        fontWeight: '500',
    },
    quantitySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: DesignTokens.spacing.sm,
        backgroundColor: Colors.backgroundCard,
        borderRadius: DesignTokens.borderRadius.sm,
        paddingHorizontal: DesignTokens.spacing.xs,
        paddingVertical: DesignTokens.spacing.xs,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    quantityButton: {
        minWidth: DesignTokens.touchTargets.min,
        minHeight: DesignTokens.touchTargets.min,
        width: DesignTokens.touchTargets.min,
        height: DesignTokens.touchTargets.min,
        borderRadius: DesignTokens.borderRadius.sm,
        backgroundColor: Colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityButtonDisabled: {
        opacity: 0.4,
    },
    quantityText: {
        ...DesignTokens.typography.smallBold,
        color: Colors.text,
        minWidth: 24,
        textAlign: 'center',
    },
    addButtonContainer: {
        width: '100%',
        marginTop: DesignTokens.spacing.sm,
        paddingTop: DesignTokens.spacing.xs,
        paddingBottom: DesignTokens.spacing.xs,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        borderRadius: DesignTokens.borderRadius.md,
        paddingVertical: DesignTokens.spacing.md,
        paddingHorizontal: DesignTokens.spacing.md,
        gap: DesignTokens.spacing.sm,
        ...DesignTokens.shadows.sm,
        minHeight: 48,
        width: '100%',
        elevation: 3,
    },
    addButtonDisabled: {
        backgroundColor: Colors.glass,
        opacity: 0.6,
    },
    addButtonText: {
        ...DesignTokens.typography.smallBold,
        color: Colors.text,
        letterSpacing: 0.3,
        fontSize: 13,
    },
});
