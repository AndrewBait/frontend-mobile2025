import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { AdaptiveList } from '@/components/base/AdaptiveList';
import { Badge } from '@/components/base/Badge';
import { Button } from '@/components/base/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { GradientBackground } from '@/components/GradientBackground';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { useCart } from '@/contexts/CartContext';
import { api, Batch } from '@/services/api';

export default function FavoritesScreen() {
    const insets = useSafeAreaInsets();
    const screenPaddingTop = insets.top + DesignTokens.spacing.md;
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await api.removeFavorite(id);
            setFavorites(prev => prev.filter(f => f.id !== id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Error removing favorite:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const handleAddToCart = async (batch: Batch) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // ATUALIZAÇÃO OTIMISTA: Atualizar badge imediatamente
        incrementCartCount(1);
        
        try {
            const result = await api.addToCart(batch.id, 1);
            
            // Usar resposta diretamente para atualizar cache (evita requisição extra)
            updateCartCache(result);
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

    // Componente separado para poder usar hooks
    const FavoriteItem: React.FC<{ item: Batch; index: number; onAddToCart: (batch: Batch) => void; onRemove: (id: string) => void }> = ({ item, index, onAddToCart, onRemove }) => {
        const opacity = useSharedValue(0);
        const translateX = useSharedValue(-20);

        React.useEffect(() => {
            const delay = index * 50;
            setTimeout(() => {
                opacity.value = withTiming(1, { duration: DesignTokens.animations.normal });
                translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
            }, delay);
        }, [index, opacity, translateX]);

        const animatedStyle = useAnimatedStyle(() => ({
            opacity: opacity.value,
            transform: [{ translateX: translateX.value }],
        }));

        // Handle both frontend format and backend format (Portuguese/plural)
        const productData = item.products || item.product;
        const productName = productData?.nome || productData?.name || 'Produto';
        const productPhoto = productData?.foto1 || productData?.photo1 || null;
        const storeName = item.store?.nome || item.store?.name || 'Loja';
        
        // Handle price fields (Portuguese/English)
        const originalPrice = item.original_price ?? item.preco_normal_override ?? productData?.preco_normal ?? 0;
        const promoPrice = item.promo_price ?? item.preco_promocional ?? 0;
        const discountPercent = item.discount_percent ?? item.desconto_percentual ?? 0;

        return (
            <Animated.View style={animatedStyle}>
                <TouchableOpacity
                    style={styles.productCard}
                    onPress={() => router.push(`/product/${item.id}`)}
                    activeOpacity={0.9}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver detalhes de ${productName}`}
                >
                {productPhoto ? (
                    <Image
                        source={{ uri: productPhoto }}
                        style={styles.productImage}
                        contentFit="cover"
                        transition={200}
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
                            <Badge
                                label={`-${Math.round(discountPercent)}%`}
                                variant="error"
                                size="sm"
                            />
                        )}
                    </View>

                    <View style={styles.actionsRow}>
                        <Button
                            title="Adicionar"
                            onPress={() => onAddToCart(item)}
                            variant="primary"
                            size="sm"
                            leftIcon={<Ionicons name="cart" size={16} color={Colors.text} />}
                            style={styles.addButton}
                            hapticFeedback
                        />

                        <TouchableOpacity
                            style={styles.removeButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                onRemove(item.id);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Remover dos favoritos"
                            accessibilityHint={`Remove ${productName} da lista de favoritos`}
                        >
                            <Ionicons name="heart-dislike" size={18} color={Colors.error} />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderFavorite = ({ item, index }: { item: Batch; index: number }) => {
        return (
            <FavoriteItem
                item={item}
                index={index}
                onAddToCart={handleAddToCart}
                onRemove={handleRemoveFavorite}
            />
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
            <View style={[styles.container, { paddingTop: screenPaddingTop }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Favoritos</Text>
                    <Text style={styles.subtitle}>{favorites.length} produto(s)</Text>
                </View>

                {favorites.length === 0 ? (
                    <EmptyState
                        icon="heart-outline"
                        title="Nenhum favorito ainda"
                        message="Adicione produtos aos favoritos para encontrá-los rapidamente"
                        actionLabel="Explorar Vitrine"
                        onAction={() => router.push('/(customer)')}
                    />
                ) : (
                    <AdaptiveList
                        data={favorites}
                        renderItem={renderFavorite}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        estimatedItemSize={140}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={Colors.primary}
                            />
                        }
                        removeClippedSubviews
                    />
                )}
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
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    title: {
        ...DesignTokens.typography.h1,
        color: Colors.text,
        marginBottom: DesignTokens.spacing.xs,
    },
    subtitle: {
        ...DesignTokens.typography.small,
        color: Colors.textSecondary,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    productCard: {
        flexDirection: 'row',
        backgroundColor: Colors.backgroundCard,
        borderRadius: DesignTokens.borderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        overflow: 'hidden',
        marginBottom: DesignTokens.spacing.md,
        ...DesignTokens.shadows.sm,
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
    },
    removeButton: {
        minWidth: DesignTokens.touchTargets.min,
        minHeight: DesignTokens.touchTargets.min,
        width: DesignTokens.touchTargets.min,
        height: DesignTokens.touchTargets.min,
        borderRadius: DesignTokens.borderRadius.sm,
        backgroundColor: Colors.error15,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
