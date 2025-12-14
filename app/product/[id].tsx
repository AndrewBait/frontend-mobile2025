import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Share,
    Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { Colors } from '../../constants/Colors';
import { api, Batch } from '../../services/api';

export default function ProductDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [batch, setBatch] = useState<Batch | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (id) {
            loadBatch();
        }
    }, [id]);

    const loadBatch = async () => {
        try {
            const data = await api.getPublicBatch(id!);
            setBatch(data);
        } catch (error) {
            console.error('Error loading batch:', error);
            Alert.alert('Erro', 'Não foi possível carregar o produto.');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFavorite = async () => {
        try {
            if (isFavorite) {
                await api.removeFavorite(id!);
            } else {
                await api.addFavorite(id!);
            }
            setIsFavorite(!isFavorite);
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    };

    const handleAddToCart = async () => {
        try {
            await api.addToCart(id!, quantity);
            Alert.alert(
                '✅ Adicionado',
                `${quantity} unidade(s) adicionada(s) ao carrinho!`,
                [
                    { text: 'Continuar Comprando', style: 'cancel' },
                    { text: 'Ver Carrinho', onPress: () => router.push('/(customer)/cart') },
                ]
            );
        } catch (error: any) {
            console.error('Error adding to cart:', error);
            Alert.alert('Erro', error.message || 'Não foi possível adicionar ao carrinho.');
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Confira: ${batch?.product?.name} por apenas R$ ${batch?.promo_price.toFixed(2)}! ${batch?.discount_percent}% de desconto!`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    if (loading || !batch) {
        return (
            <GradientBackground>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </GradientBackground>
        );
    }

    const daysToExpire = Math.ceil(
        (new Date(batch.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return (
        <GradientBackground>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={handleShare}
                        >
                            <Ionicons name="share-outline" size={24} color={Colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={handleToggleFavorite}
                        >
                            <Ionicons
                                name={isFavorite ? 'heart' : 'heart-outline'}
                                size={24}
                                color={isFavorite ? Colors.error : Colors.text}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Image */}
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: batch.product?.photo1 || 'https://via.placeholder.com/300' }}
                            style={styles.productImage}
                        />
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>-{batch.discount_percent}%</Text>
                        </View>
                    </View>

                    {/* Info */}
                    <View style={styles.infoContainer}>
                        {/* Store */}
                        <TouchableOpacity style={styles.storeRow}>
                            <View style={styles.storeIconContainer}>
                                <Ionicons name="storefront" size={18} color={Colors.secondary} />
                            </View>
                            <Text style={styles.storeName}>{batch.store?.name || 'Loja'}</Text>
                            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                        </TouchableOpacity>

                        {/* Product Name */}
                        <Text style={styles.productName}>{batch.product?.name}</Text>

                        {/* Category */}
                        <View style={styles.categoryChip}>
                            <Text style={styles.categoryText}>{batch.product?.category}</Text>
                        </View>

                        {/* Description */}
                        {batch.product?.description && (
                            <Text style={styles.description}>{batch.product.description}</Text>
                        )}

                        {/* Prices */}
                        <View style={styles.priceContainer}>
                            <View>
                                <Text style={styles.originalPrice}>
                                    R$ {batch.original_price.toFixed(2)}
                                </Text>
                                <Text style={styles.promoPrice}>
                                    R$ {batch.promo_price.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.savingsBox}>
                                <Text style={styles.savingsText}>
                                    Economia de R$ {(batch.original_price - batch.promo_price).toFixed(2)}
                                </Text>
                            </View>
                        </View>

                        {/* Expiration & Stock */}
                        <View style={styles.infoCards}>
                            <View style={[styles.infoCard, { backgroundColor: Colors.warning + '15' }]}>
                                <Ionicons name="calendar" size={20} color={Colors.warning} />
                                <Text style={[styles.infoCardTitle, { color: Colors.warning }]}>
                                    {daysToExpire > 0 ? `Vence em ${daysToExpire} dia(s)` : 'Vence hoje!'}
                                </Text>
                                <Text style={styles.infoCardText}>
                                    {new Date(batch.expiration_date).toLocaleDateString('pt-BR')}
                                </Text>
                            </View>

                            <View style={[styles.infoCard, { backgroundColor: Colors.success + '15' }]}>
                                <Ionicons name="cube" size={20} color={Colors.success} />
                                <Text style={[styles.infoCardTitle, { color: Colors.success }]}>
                                    {batch.stock} em estoque
                                </Text>
                                <Text style={styles.infoCardText}>Unidades disponíveis</Text>
                            </View>
                        </View>

                        {/* Store Info */}
                        <View style={styles.storeInfoCard}>
                            <Text style={styles.storeInfoTitle}>Sobre a loja</Text>
                            <View style={styles.storeInfoRow}>
                                <Ionicons name="location-outline" size={16} color={Colors.textMuted} />
                                <Text style={styles.storeInfoText}>
                                    {batch.store?.address}, {batch.store?.city} - {batch.store?.state}
                                </Text>
                            </View>
                            <View style={styles.storeInfoRow}>
                                <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
                                <Text style={styles.storeInfoText}>{batch.store?.hours || 'Horário não informado'}</Text>
                            </View>
                        </View>

                        <View style={{ height: 120 }} />
                    </View>
                </ScrollView>

                {/* Bottom Bar */}
                <View style={styles.bottomBar}>
                    <View style={styles.quantitySelector}>
                        <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => setQuantity(Math.max(1, quantity - 1))}
                        >
                            <Ionicons name="remove" size={20} color={Colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{quantity}</Text>
                        <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => setQuantity(Math.min(batch.stock, quantity + 1))}
                        >
                            <Ionicons name="add" size={20} color={Colors.text} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleAddToCart}
                        disabled={batch.stock === 0}
                    >
                        <LinearGradient
                            colors={[Colors.primary, Colors.primaryDark]}
                            style={styles.addButtonGradient}
                        >
                            <Ionicons name="cart" size={20} color={Colors.text} />
                            <Text style={styles.addButtonText}>
                                Adicionar • R$ {(batch.promo_price * quantity).toFixed(2)}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
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
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    imageContainer: {
        height: 320,
        backgroundColor: Colors.glass,
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    discountBadge: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: Colors.error,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    discountText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    infoContainer: {
        padding: 24,
    },
    storeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    storeIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: Colors.secondary + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    storeName: {
        flex: 1,
        fontSize: 14,
        color: Colors.textSecondary,
    },
    productName: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 12,
    },
    categoryChip: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: Colors.primary + '20',
        borderRadius: 8,
        marginBottom: 16,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
    description: {
        fontSize: 14,
        color: Colors.textSecondary,
        lineHeight: 20,
        marginBottom: 24,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    originalPrice: {
        fontSize: 14,
        color: Colors.textMuted,
        textDecorationLine: 'line-through',
    },
    promoPrice: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.success,
    },
    savingsBox: {
        backgroundColor: Colors.success + '15',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    savingsText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.success,
    },
    infoCards: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    infoCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    infoCardTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
        textAlign: 'center',
    },
    infoCardText: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    storeInfoCard: {
        backgroundColor: Colors.glass,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    storeInfoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 12,
    },
    storeInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    storeInfoText: {
        flex: 1,
        fontSize: 13,
        color: Colors.textSecondary,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 32,
        backgroundColor: Colors.backgroundCard,
        borderTopWidth: 1,
        borderTopColor: Colors.glassBorder,
        gap: 12,
    },
    quantitySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.glass,
        borderRadius: 12,
        padding: 4,
    },
    quantityButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginHorizontal: 16,
    },
    addButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    addButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    addButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
});
