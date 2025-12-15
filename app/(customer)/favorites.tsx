import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { GradientBackground } from '../../components/GradientBackground';
import { Colors } from '../../constants/Colors';
import { useCart } from '../../contexts/CartContext';
import { api, Batch } from '../../services/api';

export default function FavoritesScreen() {
    const { incrementCartCount, updateCartCache } = useCart();
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
        // ATUALIZAÇÃO OTIMISTA: Atualizar badge imediatamente
        incrementCartCount(1);
        
        try {
            const result = await api.addToCart(batch.id, 1);
            
            // Usar resposta diretamente para atualizar cache (evita requisição extra)
            updateCartCache(result);
            
            Alert.alert(
                '✅ Adicionado!',
                'Produto adicionado ao carrinho.',
                [{ text: 'OK' }]
            );
        } catch (error: any) {
            // REVERTER atualização otimista em caso de erro
            incrementCartCount(-1);
            
            const errorMessage = error?.message || 'Não foi possível adicionar ao carrinho.';
            const statusCode = error?.status || error?.statusCode;
            
            // Verificar se é timeout ou erro de rede
            const isNetworkError = 
                errorMessage.includes('timeout') ||
                errorMessage.includes('Timeout') ||
                errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('Network request failed') ||
                errorMessage.includes('NetworkError');
            
            if (isNetworkError) {
                Alert.alert(
                    '⚠️ Erro de Conexão',
                    'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.',
                    [{ text: 'OK' }]
                );
                return;
            }
            
            // Detectar erro 409 (Conflict) - carrinho de outra loja
            const isDifferentStoreError = 
                statusCode === 409 ||
                errorMessage.includes('outra loja') || 
                errorMessage.includes('carrinho aberto') ||
                errorMessage.toLowerCase().includes('loja diferente');
            
            if (isDifferentStoreError) {
                console.log('[Favorites] ✅ Erro 409 detectado - Carrinho de outra loja');
                
                Alert.alert(
                    '🛒 Carrinho de Outra Loja',
                    'Você já possui produtos de outra loja no carrinho. O que deseja fazer?',
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        { 
                            text: 'Ver Carrinho Atual', 
                            onPress: () => router.push('/(customer)/cart')
                        },
                        { 
                            text: 'Substituir Carrinho', 
                            style: 'destructive',
                            onPress: async () => {
                                try {
                                    const result = await api.addToCart(batch.id, 1, true); // replaceCart=true
                                    
                                    // Usar resposta diretamente para atualizar cache
                                    updateCartCache(result);
                                    
                                    Alert.alert(
                                        '✅ Adicionado!',
                                        'Carrinho substituído e produto adicionado com sucesso!',
                                        [{ text: 'OK' }]
                                    );
                                } catch (replaceError: any) {
                                    Alert.alert(
                                        'Erro',
                                        replaceError?.message || 'Não foi possível substituir o carrinho. Tente novamente.'
                                    );
                                }
                            }
                        },
                    ]
                );
                return;
            }
            
            // Outros erros
            console.error('[Favorites] Erro ao adicionar ao carrinho:', errorMessage);
            Alert.alert('Erro', errorMessage);
        }
    };

    const renderFavorite = ({ item }: { item: Batch }) => {
        // Handle both frontend format and backend format (Portuguese/plural)
        const productData = (item as any).products || item.product;
        const productName = productData?.nome || productData?.name || 'Produto';
        const productPhoto = productData?.foto1 || productData?.photo1 || null;
        const storeName = item.store?.name || (item.store as any)?.nome || 'Loja';
        
        // Handle price fields (Portuguese/English)
        const originalPrice = item.original_price ?? item.preco_normal_override ?? productData?.preco_normal ?? 0;
        const promoPrice = item.promo_price ?? item.preco_promocional ?? 0;
        const discountPercent = item.discount_percent ?? item.desconto_percentual ?? 0;

        return (
            <TouchableOpacity
                style={styles.productCard}
                onPress={() => router.push(`/product/${item.id}`)}
                activeOpacity={0.9}
            >
                {productPhoto ? (
                    <Image
                        source={{ uri: productPhoto }}
                        style={styles.productImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.productImage, styles.imagePlaceholder]}>
                        <Ionicons name="image-outline" size={32} color={Colors.textMuted} />
                    </View>
                )}

                <View style={styles.productInfo}>
                    <Text style={styles.storeName}>{storeName}</Text>
                    <Text style={styles.productName} numberOfLines={2}>
                        {productName}
                    </Text>

                    <View style={styles.priceRow}>
                        {originalPrice > promoPrice && (
                            <Text style={styles.originalPrice}>
                                R$ {originalPrice.toFixed(2).replace('.', ',')}
                            </Text>
                        )}
                        <Text style={styles.promoPrice}>
                            R$ {promoPrice.toFixed(2).replace('.', ',')}
                        </Text>
                        {discountPercent > 0 && (
                            <View style={styles.discountBadge}>
                                <Text style={styles.discountText}>-{Math.round(discountPercent)}%</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                handleAddToCart(item);
                            }}
                        >
                            <Ionicons name="cart" size={16} color={Colors.text} />
                            <Text style={styles.addButtonText}>Adicionar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.removeButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                handleRemoveFavorite(item.id);
                            }}
                        >
                            <Ionicons name="heart-dislike" size={18} color={Colors.error} />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

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
    imagePlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
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
