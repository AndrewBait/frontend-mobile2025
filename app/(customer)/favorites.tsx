import React, { useState, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../../components/GradientBackground';
import { Colors } from '../../constants/Colors';
import { api, Batch } from '../../services/api';

export default function FavoritesScreen() {
    const [favorites, setFavorites] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadFavorites();
        }, [])
    );

    const loadFavorites = async () => {
        console.log('Loading favorites...');
        try {
            // Add timeout
            const fetchFavorites = api.getFavorites();
            const timeoutPromise = new Promise<Batch[]>((resolve) =>
                setTimeout(() => {
                    console.log('Favorites fetch timeout');
                    resolve([]);
                }, 5000)
            );

            const data = await Promise.race([fetchFavorites, timeoutPromise]);
            console.log('Favorites loaded:', data.length);
            setFavorites(data);
        } catch (error) {
            console.error('Error loading favorites:', error);
            setFavorites([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadFavorites();
    };

    const handleRemoveFavorite = async (id: string) => {
        try {
            await api.removeFavorite(id);
            setFavorites(prev => prev.filter(f => f.id !== id));
        } catch (error) {
            console.error('Error removing favorite:', error);
        }
    };

    const handleAddToCart = async (batch: Batch) => {
        try {
            await api.addToCart(batch.id, 1);
        } catch (error) {
            console.error('Error adding to cart:', error);
        }
    };

    const renderFavorite = ({ item }: { item: Batch }) => (
        <TouchableOpacity
            style={styles.productCard}
            onPress={() => router.push(`/product/${item.id}`)}
            activeOpacity={0.9}
        >
            <Image
                source={{ uri: item.product?.photo1 || 'https://via.placeholder.com/100' }}
                style={styles.productImage}
            />

            <View style={styles.productInfo}>
                <Text style={styles.storeName}>{item.store?.name || 'Loja'}</Text>
                <Text style={styles.productName} numberOfLines={2}>
                    {item.product?.name || 'Produto'}
                </Text>

                <View style={styles.priceRow}>
                    <Text style={styles.originalPrice}>R$ {item.original_price.toFixed(2)}</Text>
                    <Text style={styles.promoPrice}>R$ {item.promo_price.toFixed(2)}</Text>
                    <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>-{item.discount_percent}%</Text>
                    </View>
                </View>

                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => handleAddToCart(item)}
                    >
                        <Ionicons name="cart" size={16} color={Colors.text} />
                        <Text style={styles.addButtonText}>Adicionar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveFavorite(item.id)}
                    >
                        <Ionicons name="heart-dislike" size={18} color={Colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <GradientBackground>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Favoritos</Text>
                    <Text style={styles.subtitle}>{favorites.length} produto(s)</Text>
                </View>

                {favorites.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="heart-outline" size={64} color={Colors.textMuted} />
                        </View>
                        <Text style={styles.emptyText}>Nenhum favorito ainda</Text>
                        <Text style={styles.emptySubtext}>
                            Adicione produtos aos favoritos para encontrá-los rapidamente
                        </Text>
                        <TouchableOpacity
                            style={styles.exploreButton}
                            onPress={() => router.push('/(customer)')}
                        >
                            <Text style={styles.exploreButtonText}>Explorar Vitrine</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={favorites}
                        renderItem={renderFavorite}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={Colors.primary}
                            />
                        }
                    />
                )}
            </View>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    productCard: {
        flexDirection: 'row',
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        overflow: 'hidden',
        marginBottom: 12,
    },
    productImage: {
        width: 100,
        height: 120,
        backgroundColor: Colors.glass,
    },
    productInfo: {
        flex: 1,
        padding: 12,
    },
    storeName: {
        fontSize: 11,
        color: Colors.textMuted,
        marginBottom: 4,
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    originalPrice: {
        fontSize: 12,
        color: Colors.textMuted,
        textDecorationLine: 'line-through',
    },
    promoPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.success,
    },
    discountBadge: {
        backgroundColor: Colors.error,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    discountText: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.text,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    addButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        borderRadius: 8,
        paddingVertical: 8,
        gap: 6,
    },
    addButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.text,
    },
    removeButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: Colors.error + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 48,
    },
    emptyIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    exploreButton: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        backgroundColor: Colors.primary,
    },
    exploreButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
});
