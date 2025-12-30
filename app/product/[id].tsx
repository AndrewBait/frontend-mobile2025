import { Badge } from '@/components/base/Badge';
import { Button } from '@/components/base/Button';
import { GradientBackground } from '@/components/GradientBackground';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { api, Batch, Favorite } from '@/services/api';
import { getOptimizedSupabaseImageUrl } from '@/utils/images';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export default function ProductDetailScreen() {
    const insets = useSafeAreaInsets();
    const headerTop = insets.top + DesignTokens.spacing.md;
    const { id } = useLocalSearchParams<{ id: string }>();
    const { incrementCartCount, updateCartCache } = useCart();
    const { session, user } = useAuth();
    const queryClient = useQueryClient();
    const [batch, setBatch] = useState<Batch | null>(null);
    const [loading, setLoading] = useState(true);
    const [optimisticIsFavorite, setOptimisticIsFavorite] = useState<boolean | null>(null);
    const [quantity, setQuantity] = useState(1);
    const loadBatchRef = React.useRef<() => Promise<void>>(async () => {});

    const favoritesEnabled = Boolean(session && user && user.role === 'customer' && id);

    const favoritesQuery = useQuery({
        queryKey: ['favorites'],
        queryFn: () => api.getFavorites(),
        enabled: favoritesEnabled,
        staleTime: 30000,
    });

    const favoriteRecord: Favorite | undefined = (favoritesQuery.data || []).find(
        (f) => f.product_batch_id === id
    );
    const isFavoriteFromServer = Boolean(favoriteRecord);
    const isFavorite = optimisticIsFavorite ?? isFavoriteFromServer;

    const toggleFavoriteMutation = useMutation({
        mutationFn: async () => {
            if (!id) return;
            if (isFavoriteFromServer) {
                await api.removeFavoriteByBatch(id);
                return;
            }
            await api.addFavorite(id);
        },
        onMutate: async () => {
            if (!id) return;

            await queryClient.cancelQueries({ queryKey: ['favorites'] });
            const previous = queryClient.getQueryData<Favorite[]>(['favorites']) || [];

            const currentIsFavorite = optimisticIsFavorite ?? isFavoriteFromServer;
            const nextIsFavorite = !currentIsFavorite;

            if (nextIsFavorite) {
                if (!batch) {
                    setOptimisticIsFavorite(nextIsFavorite);
                    return { previous };
                }

                const optimisticFavorite: Favorite = {
                    id: `optimistic-${id}`,
                    product_batch_id: id,
                    created_at: new Date().toISOString(),
                    product_batches: batch,
                };

                queryClient.setQueryData<Favorite[]>(['favorites'], [
                    optimisticFavorite,
                    ...previous.filter((f) => f.product_batch_id !== id),
                ]);
            } else {
                queryClient.setQueryData<Favorite[]>(
                    ['favorites'],
                    previous.filter((f) => f.product_batch_id !== id)
                );
            }

            setOptimisticIsFavorite(nextIsFavorite);
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['favorites'], context.previous);
            }
            setOptimisticIsFavorite(null);
        },
        onSettled: () => {
            setOptimisticIsFavorite(null);
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
    });

    useEffect(() => {
        if (id) {
            void loadBatchRef.current();
        }
    }, [id, loadBatchRef]);

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
    loadBatchRef.current = loadBatch;

    const handleToggleFavorite = async () => {
        try {
            if (!favoritesEnabled) return;
            await toggleFavoriteMutation.mutateAsync();
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    };

    const handleAddToCart = async () => {
        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // ATUALIZAÇÃO OTIMISTA: Atualizar badge imediatamente
        incrementCartCount(quantity);
        
        try {
            const result = await api.addToCart(id!, quantity);
            
            // Usar resposta diretamente para atualizar cache (evita requisição extra)
            updateCartCache(result);
            
            // Buscar quantidade atualizada do carrinho da resposta
            const cartItem = api.findCartItem(result, id!);
            const totalInCart = cartItem?.quantity || quantity;
            
            // Success haptic
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            Alert.alert(
                '✅ Adicionado',
                `${quantity} unidade(s) adicionada(s) ao carrinho! Total no carrinho: ${totalInCart} unidade(s).`,
                [
                    { text: 'Continuar Comprando', style: 'cancel' },
                    { text: 'Ver Carrinho', onPress: () => router.push('/(customer)/cart') },
                ]
            );
        } catch (error: any) {
            // REVERTER atualização otimista em caso de erro
            incrementCartCount(-quantity);
            
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
                console.log('[ProductDetail] ✅ Erro 409 detectado - Carrinho de outra loja');
                
                Alert.alert(
                    '🛒 Carrinho de Outra Loja',
                    'Você já possui produtos de outra loja no carrinho. O que deseja fazer?',
                    [
                        { 
                            text: 'Cancelar', 
                            style: 'cancel' 
                        },
                        { 
                            text: 'Ver Carrinho Atual', 
                            onPress: () => router.push('/(customer)/cart')
                        },
                        { 
                            text: 'Substituir Carrinho', 
                            style: 'destructive',
                            onPress: async () => {
                                try {
                                    console.log('[ProductDetail] Substituindo carrinho e adicionando produto...');
                                    const result = await api.addToCart(id!, quantity, true); // replaceCart=true
                                    
                                    // Usar resposta diretamente para atualizar cache
                                    updateCartCache(result);
                                    
                                    // Buscar quantidade atualizada do carrinho da resposta
                                    const cartItem = api.findCartItem(result, id!);
                                    const totalInCart = cartItem?.quantity || quantity;
                                    
                                    Alert.alert(
                                        '✅ Adicionado!',
                                        `Carrinho substituído e ${quantity} unidade(s) adicionada(s). Total no carrinho: ${totalInCart} unidade(s).`,
                                        [
                                            { text: 'Continuar Comprando', style: 'cancel' },
                                            { text: 'Ver Carrinho', onPress: () => router.push('/(customer)/cart') },
                                        ]
                                    );
                                } catch (replaceError: any) {
                                    console.error('[ProductDetail] Erro ao substituir carrinho:', replaceError);
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
            console.error('[ProductDetail] Erro ao adicionar ao carrinho:', errorMessage);
            Alert.alert('Erro', errorMessage);
        }
    };

    const handleShare = async () => {
        try {
            // Handle both PT-BR and EN field names
            const productData = batch?.products || batch?.product;
            const productName = productData?.nome || productData?.name || 'Produto';
            const promoPrice = batch?.promo_price ?? batch?.preco_promocional ?? 0;
            const discountPercent = batch?.discount_percent ?? batch?.desconto_percentual ?? 0;
            
            await Share.share({
                message: `Confira: ${productName} por apenas R$ ${promoPrice.toFixed(2)}! ${discountPercent}% de desconto!`,
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

    // Handle both PT-BR and EN field names
    const productData = batch.products || batch.product;
    const categoryLabel = productData?.categoria || productData?.category;
    const isSurprise = productData?.type === 'surprise';
    const estimatedValue = batch.estimated_original_value ?? batch.valor_estimado_original;
    const heroImage =
        getOptimizedSupabaseImageUrl(productData?.foto1 || productData?.photo1, {
            width: 800,
            quality: 80,
        }) ||
        productData?.foto1 ||
        productData?.photo1 ||
        'https://via.placeholder.com/300';
    const originalPrice = batch.original_price ?? batch.preco_normal_override ?? productData?.preco_normal ?? 0;
    const promoPrice = batch.promo_price ?? batch.preco_promocional ?? 0;
    const discountPercent = batch.discount_percent ?? batch.desconto_percentual ?? 0;
    const expirationDate = batch.expiration_date || batch.data_vencimento || null;
    
    const daysToExpire = expirationDate ? Math.ceil(
        (new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ) : null;

    return (
        <GradientBackground>
            <View style={styles.container}>
                {/* Header */}
                <View style={[styles.header, { top: headerTop }]}>
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
                            source={{ uri: heroImage }}
                            style={styles.productImage}
                            contentFit="cover"
                            transition={200}
                        />
                        {discountPercent > 0 && (
                            <Badge
                                label={`-${Math.round(discountPercent)}%`}
                                variant="error"
                                size="md"
                                style={styles.discountBadge}
                            />
                        )}
                    </View>

                    {/* Info */}
                    <View style={styles.infoContainer}>
                        {/* Store */}
                        <TouchableOpacity style={styles.storeRow}>
                            <View style={styles.storeIconContainer}>
                                <Ionicons name="storefront" size={18} color={Colors.secondary} />
                            </View>
                            <Text style={styles.storeName}>{batch.store?.nome || batch.store?.name || 'Loja'}</Text>
                            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                        </TouchableOpacity>

                        {/* Product Name */}
                        <Text style={styles.productName}>{productData?.nome || productData?.name}</Text>

                        {isSurprise && (
                            <Badge
                                label="Pacote Surpresa"
                                variant="secondary"
                                size="sm"
                                style={styles.surpriseBadge}
                            />
                        )}

                        {/* Category */}
                        {categoryLabel && (
                            <Badge
                                label={categoryLabel}
                                variant="primary"
                                size="md"
                                style={styles.categoryBadge}
                            />
                        )}

                        {/* Description */}
                        {isSurprise && (
                            <Text style={styles.surpriseHint}>
                                Itens surpresa. A foto pode ser ilustrativa.
                            </Text>
                        )}

                        {(productData?.descricao || productData?.description) && (
                            <Text style={styles.description}>{productData?.descricao || productData?.description}</Text>
                        )}

                        {/* Prices */}
                        <View style={styles.priceContainer}>
                            <View>
                                {originalPrice > promoPrice && (
                                    <Text style={styles.originalPrice}>
                                        R$ {originalPrice.toFixed(2).replace('.', ',')}
                                    </Text>
                                )}
                                <Text style={styles.promoPrice}>
                                    R$ {promoPrice.toFixed(2).replace('.', ',')}
                                </Text>
                            </View>
                            {originalPrice > promoPrice && (
                                <Badge
                                    label={`Economia R$ ${(originalPrice - promoPrice).toFixed(2).replace('.', ',')}`}
                                    variant="success"
                                    size="sm"
                                    icon="checkmark-circle"
                                />
                            )}
                        </View>
                        {isSurprise && estimatedValue ? (
                            <Text style={styles.estimatedValue}>
                                Valor estimado R$ {estimatedValue.toFixed(2).replace('.', ',')}
                            </Text>
                        ) : null}

                        {/* Expiration & Stock */}
                        <View style={styles.infoCards}>
                            {expirationDate && (
                                <View style={[styles.infoCard, { backgroundColor: Colors.warning15 }]}>
                                    <Ionicons name="calendar" size={20} color={Colors.warning} />
                                    <Text style={[styles.infoCardTitle, { color: Colors.warning }]}>
                                        {daysToExpire !== null && daysToExpire > 0 
                                            ? `Vence em ${daysToExpire} dia(s)` 
                                            : daysToExpire === 0 
                                                ? 'Vence hoje!' 
                                                : daysToExpire !== null && daysToExpire < 0
                                                    ? 'Vencido'
                                                    : 'Data inválida'}
                                    </Text>
                                    <Text style={styles.infoCardText}>
                                        {new Date(expirationDate).toLocaleDateString('pt-BR')}
                                    </Text>
                                </View>
                            )}

                            <View style={[styles.infoCard, { backgroundColor: Colors.success15 }]}>
                                <Ionicons name="cube" size={20} color={Colors.success} />
                                <Text style={[styles.infoCardTitle, { color: Colors.success }]}>
                                    {(batch.stock ?? batch.estoque_total ?? 0)} em estoque
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
                            onPress={() => setQuantity(Math.min(batch.stock ?? batch.estoque_total ?? 99, quantity + 1))}
                        >
                            <Ionicons name="add" size={20} color={Colors.text} />
                        </TouchableOpacity>
                    </View>

                    <Button
                        title={`Adicionar • R$ ${(promoPrice * quantity).toFixed(2).replace('.', ',')}`}
                        onPress={handleAddToCart}
                        variant="primary"
                        size="lg"
                        disabled={(batch.stock ?? batch.estoque_total ?? 0) === 0}
                        leftIcon={<Ionicons name="cart" size={20} color={Colors.text} />}
                        fullWidth
                        hapticFeedback
                        accessibilityLabel={`Adicionar ${quantity} unidade(s) ao carrinho`}
                        accessibilityHint={`Total: R$ ${(promoPrice * quantity).toFixed(2)}`}
                    />
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
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    headerButton: {
        width: DesignTokens.touchTargets.min,
        height: DesignTokens.touchTargets.min,
        borderRadius: DesignTokens.borderRadius.lg,
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
        height: 400, // Hero image maior conforme plano
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
    },
    discountText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    infoContainer: {
        padding: DesignTokens.padding.medium, // Responsivo
    },
    storeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: DesignTokens.spacing.md,
        gap: DesignTokens.spacing.sm,
        paddingVertical: DesignTokens.spacing.sm,
        paddingHorizontal: DesignTokens.spacing.md,
        backgroundColor: '#F9FAFB', // Gray-50
        borderRadius: DesignTokens.borderRadius.md,
    },
    storeIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: Colors.secondary20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    storeName: {
        flex: 1,
        fontSize: 14,
        color: Colors.textSecondary,
    },
    productName: {
        ...DesignTokens.typography.h2,
        color: Colors.text,
        marginBottom: DesignTokens.spacing.md,
    },
    surpriseBadge: {
        marginBottom: DesignTokens.spacing.sm,
        alignSelf: 'flex-start',
    },
    categoryBadge: {
        marginBottom: DesignTokens.spacing.md,
        alignSelf: 'flex-start',
    },
    surpriseHint: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 12,
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
        marginBottom: DesignTokens.spacing.lg,
        paddingVertical: DesignTokens.spacing.md,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: Colors.border,
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
        letterSpacing: -0.5,
    },
    estimatedValue: {
        marginTop: 8,
        fontSize: 13,
        color: Colors.textSecondary,
        fontWeight: '600',
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
        width: DesignTokens.touchTargets.min,
        height: DesignTokens.touchTargets.min,
        borderRadius: DesignTokens.borderRadius.md,
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
    },
});
