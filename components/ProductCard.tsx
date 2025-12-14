import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Product } from '../services/database';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2;

interface ProductCardProps {
    product: Product;
    onPress: () => void;
    onAddToCart: () => void;
    onToggleFavorite: () => void;
    isFavorite?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
    product,
    onPress,
    onAddToCart,
    onToggleFavorite,
    isFavorite = false,
}) => {
    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
            {/* Image */}
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: product.photo1 }}
                    style={styles.image}
                    resizeMode="cover"
                />

                {/* Discount Badge */}
                <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>-{product.discountPercent}%</Text>
                </View>

                {/* Favorite Button */}
                <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                >
                    <Ionicons
                        name={isFavorite ? 'heart' : 'heart-outline'}
                        size={18}
                        color={isFavorite ? Colors.secondary : Colors.text}
                    />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.name} numberOfLines={2}>{product.name}</Text>

                <Text style={styles.store} numberOfLines={1}>
                    <Ionicons name="storefront-outline" size={10} color={Colors.textMuted} />
                    {' '}{product.storeName}
                </Text>

                <View style={styles.priceRow}>
                    <View>
                        <Text style={styles.originalPrice}>R$ {product.originalPrice.toFixed(2)}</Text>
                        <Text style={styles.promoPrice}>R$ {product.promoPrice.toFixed(2)}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={(e) => { e.stopPropagation(); onAddToCart(); }}
                    >
                        <Ionicons name="add" size={20} color={Colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Expiration */}
                <View style={styles.expirationContainer}>
                    <Ionicons name="time-outline" size={10} color={Colors.warning} />
                    <Text style={styles.expirationText}>
                        Vence: {new Date(product.expirationDate).toLocaleDateString('pt-BR')}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        overflow: 'hidden',
        marginBottom: 12,
    },
    imageContainer: {
        width: '100%',
        height: CARD_WIDTH * 0.85,
        backgroundColor: Colors.glass,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    discountBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: Colors.error,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    discountText: {
        color: Colors.text,
        fontSize: 12,
        fontWeight: '700',
    },
    favoriteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        padding: 12,
    },
    name: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4,
        minHeight: 36,
    },
    store: {
        fontSize: 11,
        color: Colors.textMuted,
        marginBottom: 8,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    originalPrice: {
        fontSize: 11,
        color: Colors.textMuted,
        textDecorationLine: 'line-through',
    },
    promoPrice: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.success,
    },
    addButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expirationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    expirationText: {
        fontSize: 10,
        color: Colors.warning,
    },
});
