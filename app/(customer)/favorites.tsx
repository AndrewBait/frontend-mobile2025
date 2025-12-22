import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { memo, useCallback, useMemo } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { api, Favorite } from '@/services/api';
import { getOptimizedSupabaseImageUrl } from '@/utils/images';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Componente otimizado para item de favorito (extraído para evitar recriação)
const FavoriteItem = memo<{
    item: Favorite;
    index: number;
    onAddToCart: (favorite: Favorite) => void;
    onRemove: (favoriteId: string) => void;
}>(({ item, index, onAddToCart, onRemove }) => {
    const opacity = useSharedValue(0);
    const translateX = useSharedValue(-20);

    React.useEffect(() => {
        // Limitar stagger a 10 itens para evitar lag
        const delay = Math.min(index, 10) * 30;
        const timeoutId = setTimeout(() => {
            opacity.value = withTiming(1, { duration: 200 });
            translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
        }, delay);
        return () => clearTimeout(timeoutId);
    }, [index, opacity, translateX]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateX: translateX.value }],
    }), []);

    // Dados do batch e produto (memoizados)
    const batch = item.product_batches;
    const { productName, productPhoto, storeName, originalPrice, promoPrice, discountPercent } = useMemo(() => {
        const productData = batch.products || batch.product;
        const name = productData?.nome || productData?.name || 'Produto';
        const photo = productData?.foto1 || productData?.photo1 || null;
        const store =
            batch.store?.nome ||
            batch.store?.name ||
            batch.stores?.nome ||
            batch.stores?.name ||
            'Loja';

        const original = batch.original_price ?? batch.preco_normal_override ?? productData?.preco_normal ?? 0;
        const promo = batch.promo_price ?? batch.preco_promocional ?? 0;
        const discount = batch.discount_percent ?? batch.desconto_percentual ?? 0;

        return {
            productName: name,
            productPhoto: photo,
            storeName: store,
            originalPrice: original,
            promoPrice: promo,
            discountPercent: discount,
        };
    }, [batch]);

    const handlePress = useCallback(() => {
        router.push(`/product/${item.product_batch_id}`);
    }, [item.product_batch_id]);

    const handleRemove = useCallback((e: any) => {
        e.stopPropagation();
        onRemove(item.id);
    }, [item.id, onRemove]);

    const handleAdd = useCallback(() => {
        onAddToCart(item);
    }, [item, onAddToCart]);

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity
                style={styles.productCard}
                onPress={handlePress}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel={`Ver detalhes de ${productName}`}
            >
                {productPhoto ? (
                    <Image
                        source={{
                            uri:
                                getOptimizedSupabaseImageUrl(productPhoto, { width: 400, quality: 80 }) ||
                                productPhoto,
                        }}
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
                            onPress={handleAdd}
                            variant="primary"
                            size="sm"
                            leftIcon={<Ionicons name="cart" size={16} color={Colors.text} />}
                            style={styles.addButton}
                            hapticFeedback
                        />

                        <TouchableOpacity
                            style={styles.removeButton}
                            onPress={handleRemove}
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
}, (prevProps, nextProps) => {
    // Comparação customizada: só re-renderizar se o item mudou
    return prevProps.item.id === nextProps.item.id && prevProps.index === nextProps.index;
});

FavoriteItem.displayName = 'FavoriteItem';

export default function FavoritesScreen() {
    const insets = useSafeAreaInsets();
    const screenPaddingTop = insets.top + DesignTokens.spacing.md;
    const { session, user } = useAuth();
    const { incrementCartCount, updateCartCache } = useCart();
    const queryClient = useQueryClient();
    const enabled = Boolean(session && user && user.role === 'customer');

    const favoritesQuery = useQuery({
        queryKey: ['favorites'],
        queryFn: () => api.getFavorites(),
        enabled,
        staleTime: 30000,
    });

    useFocusEffect(
        useCallback(() => {
            if (!enabled) return;
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        }, [enabled, queryClient])
    );

    const onRefresh = () => {
        favoritesQuery.refetch();
    };

    const removeFavoriteMutation = useMutation({
        mutationFn: (favoriteId: string) => api.removeFavorite(favoriteId),
        onMutate: async (favoriteId: string) => {
            await queryClient.cancelQueries({ queryKey: ['favorites'] });
            const previous = queryClient.getQueryData<Favorite[]>(['favorites']);

            queryClient.setQueryData<Favorite[]>(['favorites'], (current) => {
                return (current || []).filter((f) => f.id !== favoriteId);
            });

            return { previous };
        },
        onError: (_err, _favoriteId, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['favorites'], context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
    });

    const handleRemoveFavorite = useCallback(async (favoriteId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await removeFavoriteMutation.mutateAsync(favoriteId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Error removing favorite:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    }, [removeFavoriteMutation]);

    const handleAddToCart = useCallback(async (favorite: Favorite) => {
        const batchId = favorite.product_batch_id;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // ATUALIZAÇÃO OTIMISTA: Atualizar badge imediatamente
        incrementCartCount(1);
        
        try {
            const result = await api.addToCart(batchId, 1);
            
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
                                    const result = await api.addToCart(batchId, 1, true); // replaceCart=true
                                    
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
    }, [incrementCartCount, updateCartCache]);

    const favorites = favoritesQuery.data ?? [];
    const loading = favoritesQuery.isLoading;
    const refreshing = favoritesQuery.isRefetching;

    const renderFavorite = useCallback(({ item, index }: { item: Favorite; index: number }) => {
        return (
            <FavoriteItem
                item={item}
                index={index}
                onAddToCart={handleAddToCart}
                onRemove={handleRemoveFavorite}
            />
        );
    }, [handleAddToCart, handleRemoveFavorite]);

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
