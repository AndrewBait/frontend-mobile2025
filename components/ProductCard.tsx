/**
 * ProductCard - VenceJá Design System
 * 
 * Card de produto com design moderno inspirado em
 * apps de delivery, com foco em urgência e economia
 */

import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

interface Product {
    id: string;
    name: string;
    storeName: string;
    storePhoto?: string;
    photo1?: string;
    originalPrice: number;
    promoPrice: number;
    discountPercent: number;
    expirationDate: string;
    stock?: number;
}

interface ProductCardProps {
    product: Product;
    onPress: () => void;
    onAddToCart: () => void;
    onToggleFavorite: () => void;
    isFavorite?: boolean;
    variant?: 'default' | 'compact';
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 colunas com margin

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const ProductCard: React.FC<ProductCardProps> = ({
    product,
    onPress,
    onAddToCart,
    onToggleFavorite,
    isFavorite = false,
    variant = 'default',
}) => {
    const scale = useSharedValue(1);
    const cardWidth = variant === 'compact' ? CARD_WIDTH : CARD_WIDTH;

    // Calculate days until expiration
    const getDaysUntilExpiration = () => {
        const today = new Date();
        const expDate = new Date(product.expirationDate);
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysLeft = getDaysUntilExpiration();
    const isUrgent = daysLeft <= 3;
    const isExpiringSoon = daysLeft <= 7;

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    const handleAddToCart = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onAddToCart();
    };

    const handleToggleFavorite = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggleFavorite();
    };

    // Format expiration text
    const getExpirationText = () => {
        if (daysLeft <= 0) return 'Vence hoje!';
        if (daysLeft === 1) return 'Vence amanhã';
        if (daysLeft <= 7) return `${daysLeft} dias`;
        return new Date(product.expirationDate).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
        });
    };

    const savings = product.originalPrice - product.promoPrice;

    return (
        <AnimatedTouchable
            style={[styles.card, { width: cardWidth }, animatedStyle]}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
        >
            {/* Image Section */}
            <View style={styles.imageSection}>
                <Image
                    source={{ uri: product.photo1 || 'https://via.placeholder.com/200' }}
                    style={styles.image}
                    resizeMode="cover"
                />

                {/* Gradient Overlay for text readability */}
                <View style={styles.imageOverlay} />

                {/* Discount Badge - Prominent */}
                <View style={[
                    styles.discountBadge,
                    isUrgent && styles.discountBadgeUrgent
                ]}>
                    <Text style={styles.discountText}>-{product.discountPercent}%</Text>
                </View>

                {/* Favorite Button */}
                <TouchableOpacity
                    style={[
                        styles.favoriteButton,
                        isFavorite && styles.favoriteButtonActive
                    ]}
                    onPress={handleToggleFavorite}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons
                        name={isFavorite ? 'heart' : 'heart-outline'}
                        size={18}
                        color={isFavorite ? Colors.favorite : '#FFFFFF'}
                    />
                </TouchableOpacity>

                {/* Expiration Tag - Bottom of image */}
                <View style={[
                    styles.expirationTag,
                    isUrgent && styles.expirationTagUrgent,
                    isExpiringSoon && !isUrgent && styles.expirationTagWarning,
                ]}>
                    <Ionicons
                        name="time-outline"
                        size={12}
                        color={isUrgent ? '#FFFFFF' : isExpiringSoon ? Colors.warning : '#FFFFFF'}
                    />
                    <Text style={[
                        styles.expirationText,
                        isUrgent && styles.expirationTextUrgent,
                    ]}>
                        {getExpirationText()}
                    </Text>
                </View>
            </View>

            {/* Content Section */}
            <View style={styles.content}>
                {/* Store Info */}
                <View style={styles.storeRow}>
                    <View style={styles.storeLogo}>
                        {product.storePhoto ? (
                            <Image source={{ uri: product.storePhoto }} style={styles.storeLogoImage} />
                        ) : (
                            <Ionicons name="storefront" size={12} color={Colors.textMuted} />
                        )}
                    </View>
                    <Text style={styles.storeName} numberOfLines={1}>
                        {product.storeName}
                    </Text>
                </View>

                {/* Product Name */}
                <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                </Text>

                {/* Price Section */}
                <View style={styles.priceSection}>
                    <View style={styles.priceColumn}>
                        {product.originalPrice > product.promoPrice && (
                            <Text style={styles.originalPrice}>
                                R$ {product.originalPrice.toFixed(2).replace('.', ',')}
                            </Text>
                        )}
                        <Text style={styles.promoPrice}>
                            R$ {product.promoPrice.toFixed(2).replace('.', ',')}
                        </Text>
                    </View>
                    {savings > 0 && (
                        <View style={styles.savingsBadge}>
                            <Text style={styles.savingsText}>
                                Economize R$ {savings.toFixed(2).replace('.', ',')}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Add to Cart Button */}
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddToCart}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>Adicionar</Text>
                </TouchableOpacity>
            </View>
        </AnimatedTouchable>
    );
};

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
        height: 160,
        position: 'relative',
        backgroundColor: Colors.surfaceMuted,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.05)',
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
        letterSpacing: 0.3,
    },
    favoriteButton: {
        position: 'absolute',
        top: 10,
        left: 10,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    favoriteButtonActive: {
        backgroundColor: 'rgba(255,255,255,0.95)',
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
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingVertical: 6,
    },
    expirationTagUrgent: {
        backgroundColor: Colors.error,
    },
    expirationTagWarning: {
        backgroundColor: 'rgba(245, 158, 11, 0.9)',
    },
    expirationText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    expirationTextUrgent: {
        fontWeight: '700',
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
    storeLogo: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    storeLogoImage: {
        width: '100%',
        height: '100%',
    },
    storeName: {
        fontSize: 11,
        fontWeight: '500',
        color: Colors.textMuted,
        flex: 1,
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        lineHeight: 18,
        marginBottom: 8,
        minHeight: 36,
    },

    // ========== PRICE SECTION ==========
    priceSection: {
        marginBottom: 10,
    },
    priceColumn: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    originalPrice: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textMuted,
        textDecorationLine: 'line-through',
    },
    promoPrice: {
        fontSize: 20,
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

    // ========== ADD BUTTON ==========
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: Colors.primary,
        borderRadius: DesignTokens.borderRadius.lg,
        paddingVertical: 12,
        ...DesignTokens.shadows.primary,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
});
