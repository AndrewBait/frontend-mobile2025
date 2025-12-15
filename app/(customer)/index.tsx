import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    ImageErrorEventData,
    NativeSyntheticEvent,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { GradientBackground } from '../../components/GradientBackground';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { api, Batch } from '../../services/api';
import { PRODUCT_CATEGORIES } from '../../utils/validation';

export default function VitrineScreen() {
    const { user, isProfileComplete } = useAuth();
    const { incrementCartCount, updateCartCache } = useCart();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
    
    // Paginação
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const ITEMS_PER_PAGE = 10;
    
    // Quantidade selecionada por produto
    const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
    
    // Filtros
    const [showFilters, setShowFilters] = useState(false);
    const [filterRadius, setFilterRadius] = useState<number | null>(null);
    const [filterMinPrice, setFilterMinPrice] = useState<string>('');
    const [filterMaxPrice, setFilterMaxPrice] = useState<string>('');
    const [filterMaxDaysToExpire, setFilterMaxDaysToExpire] = useState<number | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadBatches(true);
        }, [selectedCategory, location, filterRadius])
    );

    useEffect(() => {
        getLocation();
    }, []);

    const getLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                setLocation({
                    lat: loc.coords.latitude,
                    lng: loc.coords.longitude,
                });
            }
        } catch (error) {
            console.error('Error getting location:', error);
        }
    };

    const loadBatches = async (reset: boolean = false) => {
        if (reset) {
            setPage(1);
            setBatches([]);
            setHasMore(true);
        }
        
        console.log('Loading batches...', { page: reset ? 1 : page });
        try {
            const params: any = {};

            if (selectedCategory) {
                params.categoria = selectedCategory;
            }

            if (location) {
                params.lat = location.lat;
                params.lng = location.lng;
                // Usar raio do filtro se selecionado, senão usar o raio padrão do usuário
                params.raio_km = filterRadius ?? user?.radius_km ?? 5;
            }

            // Add timeout to prevent infinite loading (10 segundos)
            const fetchPromise = api.getPublicBatches(params);
            const timeoutPromise = new Promise<Batch[]>((resolve) =>
                setTimeout(() => {
                    // Não logar como erro, apenas informação
                    console.log('[Vitrine] Timeout ao buscar batches após 10s - retornando vazio');
                    resolve([]);
                }, 10000)
            );

            const data = await Promise.race([fetchPromise, timeoutPromise]);
            if (data.length > 0) {
                console.log('[Vitrine] Batches loaded:', data.length);
            }
            
            if (reset) {
                setBatches(data);
            } else {
                setBatches(prev => [...prev, ...data]);
            }
            
            // Verificar se há mais itens para carregar
            setHasMore(data.length >= ITEMS_PER_PAGE);
            setImageErrors(new Set()); // Reset image errors on new load
        } catch (error: any) {
            // Não logar erros de rede como ERROR se já foram tratados no api.ts
            const isNetworkError = error?.message?.includes('Network request failed') || 
                                 error?.message?.includes('Failed to fetch') ||
                                 error?.message?.includes('timeout');
            if (!isNetworkError) {
                console.error('[Vitrine] Erro ao carregar batches:', error?.message || error);
            }
            if (reset) {
                setBatches([]);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    const loadMoreBatches = () => {
        // Por enquanto, não há paginação no backend
        // Esta função está preparada para quando o backend suportar paginação
        // Por enquanto, apenas carregamos tudo de uma vez
        if (!loadingMore && hasMore && !loading && batches.length > 0) {
            // Se houver mais itens filtrados que não foram mostrados, podemos simular paginação
            // Mas por enquanto, apenas retornamos
            return;
        }
    };

    // Filter batches based on search query and filters
    const filteredBatches = useMemo(() => {
        let filtered = batches;

        // Filtro de busca por texto
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(batch => {
                // Handle both PT-BR and EN field names
                const productData = (batch as any).products || batch.product;
                const productName = (productData?.nome || productData?.name || '').toLowerCase();
                const storeName = (batch.store?.name || (batch.store as any)?.nome || '').toLowerCase();
                const category = (productData?.categoria || productData?.category || '').toLowerCase();
                return productName.includes(query) || storeName.includes(query) || category.includes(query);
            });
        }

        // Filtro de preço
        if (filterMinPrice || filterMaxPrice) {
            filtered = filtered.filter(batch => {
                const promoPrice = batch.promo_price ?? batch.preco_promocional ?? 0;
                const minPrice = filterMinPrice ? parseFloat(filterMinPrice.replace(',', '.')) : 0;
                const maxPrice = filterMaxPrice ? parseFloat(filterMaxPrice.replace(',', '.')) : Infinity;
                return promoPrice >= minPrice && promoPrice <= maxPrice;
            });
        }

        // Filtro de data de vencimento (dias até vencer)
        if (filterMaxDaysToExpire !== null) {
            filtered = filtered.filter(batch => {
                const expirationDate = batch.expiration_date || batch.data_vencimento;
                if (!expirationDate) return false;
                
                const expDate = new Date(expirationDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                expDate.setHours(0, 0, 0, 0);
                const diffTime = expDate.getTime() - today.getTime();
                const daysToExpire = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return daysToExpire >= 0 && daysToExpire <= filterMaxDaysToExpire;
            });
        }

        // Filtro de distância (raio) - aplicado no backend, mas podemos ordenar por distância aqui
        // O filtro de raio já é aplicado no loadBatches através do parâmetro raio_km

        return filtered;
    }, [batches, searchQuery, filterMinPrice, filterMaxPrice, filterMaxDaysToExpire]);

    const onRefresh = () => {
        setRefreshing(true);
        loadBatches(true);
    };

    const handleQuantityChange = (batchId: string, delta: number) => {
        setSelectedQuantities(prev => {
            const current = prev[batchId] || 1;
            const newQuantity = Math.max(1, Math.min(current + delta, 99));
            return { ...prev, [batchId]: newQuantity };
        });
    };

    const handleAddToCart = async (batch: Batch) => {
        const quantity = selectedQuantities[batch.id] || 1;
        const availableStock = batch.disponivel ?? batch.stock ?? batch.estoque_total ?? 0;
        
        if (quantity > availableStock) {
            Alert.alert('Estoque insuficiente', `Apenas ${availableStock} unidade(s) disponível(eis).`);
            return;
        }
        
        console.log('[VitrineScreen] ========== ADICIONANDO AO CARRINHO ==========');
        console.log('[VitrineScreen] Batch ID:', batch.id);
        console.log('[VitrineScreen] Quantidade:', quantity);
        
        // ATUALIZAÇÃO OTIMISTA: Atualizar badge imediatamente
        incrementCartCount(quantity);
        
        try {
            console.log('[VitrineScreen] Chamando api.addToCart...');
            const startTime = Date.now();
            const result = await api.addToCart(batch.id, quantity);
            const duration = Date.now() - startTime;
            console.log('[VitrineScreen] ✅ Produto adicionado com sucesso em', duration, 'ms');
            console.log('[VitrineScreen] Resultado:', {
                hasItems: !!result?.items,
                itemsCount: result?.items?.length || 0,
                total: result?.total || 0
            });
            
            // Usar resposta diretamente para atualizar cache (evita requisição extra)
            updateCartCache(result);
            
            // Feedback visual de sucesso
            Alert.alert(
                '✅ Adicionado!',
                'Produto adicionado ao carrinho. A quantidade foi incrementada se o produto já estava no carrinho.',
                [{ text: 'OK' }]
            );
        } catch (error: any) {
            // REVERTER atualização otimista em caso de erro
            incrementCartCount(-quantity);
            
            const errorMessage = error?.message || String(error) || 'Erro desconhecido';
            const statusCode = error?.status || error?.statusCode;
            
            // Verificar se é timeout ou erro de rede
            const isNetworkError = 
                errorMessage.includes('timeout') ||
                errorMessage.includes('Timeout') ||
                errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('Network request failed') ||
                errorMessage.includes('NetworkError');
            
            if (isNetworkError) {
                console.error('[VitrineScreen] ⚠️ Erro de rede/timeout detectado');
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
                console.log('[VitrineScreen] ✅ Erro 409 detectado - Carrinho de outra loja');
                
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
                            onPress: () => {
                                router.push('/(customer)/cart');
                            }
                        },
                        { 
                            text: 'Substituir Carrinho', 
                            style: 'destructive',
                            onPress: async () => {
                                try {
                                    console.log('[VitrineScreen] Substituindo carrinho e adicionando produto...');
                                    const result = await api.addToCart(batch.id, quantity, true); // replaceCart=true
                                    console.log('[VitrineScreen] ✅ Carrinho substituído com sucesso');
                                    // Usar resposta diretamente para atualizar cache
                                    updateCartCache(result);
                                    Alert.alert(
                                        '✅ Adicionado!',
                                        'Carrinho substituído e produto adicionado com sucesso!',
                                        [{ text: 'OK' }]
                                    );
                                } catch (replaceError: any) {
                                    console.error('[VitrineScreen] Erro ao substituir carrinho:', replaceError);
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
            
            // Outros erros - logar como ERROR e mostrar mensagem
            console.error('[VitrineScreen] ========== ERRO AO ADICIONAR ==========');
            console.error('[VitrineScreen] Tipo do erro:', error?.constructor?.name);
            console.error('[VitrineScreen] Mensagem:', errorMessage);
            console.error('[VitrineScreen] Status Code:', statusCode);
            console.error('[VitrineScreen] Stack:', error?.stack);
            
            Alert.alert(
                'Erro', 
                errorMessage || 'Não foi possível adicionar ao carrinho. Tente novamente.'
            );
        }
    };

    const renderCategory = ({ item }: { item: { value: string; label: string } }) => (
        <TouchableOpacity
            style={[
                styles.categoryChip,
                selectedCategory === item.value && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(
                selectedCategory === item.value ? null : item.value
            )}
        >
            <Text style={[
                styles.categoryText,
                selectedCategory === item.value && styles.categoryTextActive,
            ]}>
                {item.label}
            </Text>
        </TouchableOpacity>
    );

    const renderBatch = ({ item }: { item: Batch }) => {
        // Handle both PT-BR and EN field names - backend may return products (plural) or product (singular)
        const productData = (item as any).products || item.product;
        const productName = productData?.nome || productData?.name || 'Produto sem nome';
        const productPhoto = productData?.foto1 || productData?.photo1 || null;
        const productCategory = productData?.categoria || productData?.category || '';
        
        // Prices - handle both PT-BR and EN field names
        const originalPrice = item.original_price ?? item.preco_normal_override ?? productData?.preco_normal ?? 0;
        const promoPrice = item.promo_price ?? item.preco_promocional ?? 0;
        
        // Calcular desconto se não vier do backend ou calcular baseado nos preços
        let discountPercent = item.discount_percent ?? item.desconto_percentual ?? 0;
        
        // Se não tem desconto explícito mas tem diferença de preço, calcular
        if ((discountPercent === 0 || !discountPercent || isNaN(discountPercent)) && originalPrice > 0 && promoPrice > 0 && originalPrice > promoPrice) {
            discountPercent = ((originalPrice - promoPrice) / originalPrice) * 100;
        }
        
        // Garantir que temos um número válido
        discountPercent = Math.max(0, Math.min(100, discountPercent || 0));
        
        // Debug: logar valores para verificar
        if (originalPrice > promoPrice && discountPercent === 0) {
            console.log('[Vitrine] Desconto calculado:', {
                originalPrice,
                promoPrice,
                calculatedDiscount: ((originalPrice - promoPrice) / originalPrice) * 100,
                itemDiscount: item.discount_percent ?? item.desconto_percentual
            });
        }
        
        // Store info
        const storeName = item.store?.name || (item.store as any)?.nome || 'Loja';
        const storeHours = item.store?.hours || (item.store as any)?.horario_funcionamento || '';
        const storeLogo = item.store?.logo_url || null;
        
        // Stock
        const availableStock = item.disponivel ?? item.stock ?? item.estoque_total ?? 0;
        const selectedQuantity = selectedQuantities[item.id] || 1;
        
        // Expiration date and days calculation
        const expirationDate = item.expiration_date || item.data_vencimento || null;
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
        
        const imageKey = item.id;
        const imageError = imageErrors.has(imageKey);
        const imageUri = productPhoto && !imageError ? productPhoto : null;
        
        const handleImageError = (e: NativeSyntheticEvent<ImageErrorEventData>) => {
            console.log('Erro ao carregar imagem do produto:', imageUri);
            setImageErrors(prev => new Set(prev).add(imageKey));
        };

        const storeId = item.store_id || (item.store as any)?.id;
        
        return (
            <View style={styles.productCardHorizontal}>
                {/* Store Logo - Topo centralizado, metade dentro/metade fora - Clicável para ir à loja */}
                {storeLogo && storeId && (
                    <TouchableOpacity
                        style={styles.storeLogoTopContainer}
                        onPress={() => {
                            // Navegar para produtos da loja
                            router.push({
                                pathname: '/(customer)/store-products',
                                params: { storeId }
                            });
                        }}
                        activeOpacity={0.8}
                    >
                        <View style={styles.storeLogoTop}>
                            <Image
                                source={{ uri: storeLogo }}
                                style={styles.storeLogoTopImage}
                                resizeMode="cover"
                            />
                        </View>
                    </TouchableOpacity>
                )}

                {/* Imagem do produto - Clicável para ver detalhes */}
                <TouchableOpacity
                    style={styles.productImageContainerHorizontal}
                    onPress={() => router.push(`/product/${item.id}`)}
                    activeOpacity={0.9}
                >
                    {imageUri ? (
                        <Image
                            source={{ uri: imageUri }}
                            style={styles.productImageHorizontal}
                            resizeMode="cover"
                            onError={handleImageError}
                        />
                    ) : (
                        <View style={styles.imagePlaceholderHorizontal}>
                            <Ionicons name="image-outline" size={40} color={Colors.textMuted} />
                            <Text style={styles.imagePlaceholderText}>Sem imagem</Text>
                        </View>
                    )}
                    
                    {/* Discount badge - porcentagem de desconto grande e visível */}
                    {discountPercent > 0 && (
                        <View style={styles.discountBadgeLarge}>
                            <Text style={styles.discountTextLarge}>-{Math.round(discountPercent)}%</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.productInfoHorizontal}>
                    {/* Store name */}
                    <Text style={styles.storeNameHorizontal} numberOfLines={1}>
                        {storeName}
                    </Text>
                    
                    {/* Product name */}
                    <Text style={styles.productNameHorizontal} numberOfLines={2}>
                        {productName}
                    </Text>
                    
                    {/* Store hours - aumentado tamanho */}
                    {storeHours && (
                        <View style={styles.storeHoursRow}>
                            <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                            <Text style={styles.storeHoursText} numberOfLines={1}>
                                {storeHours}
                            </Text>
                        </View>
                    )}
                    
                    {/* Price row - sem porcentagem (já está na foto) */}
                    <View style={styles.priceRowHorizontal}>
                        <View style={styles.priceContainerHorizontal}>
                            {originalPrice > promoPrice && (
                                <Text style={styles.originalPriceHorizontal}>
                                    R$ {originalPrice.toFixed(2).replace('.', ',')}
                                </Text>
                            )}
                            <Text style={styles.promoPriceHorizontal}>
                                R$ {promoPrice.toFixed(2).replace('.', ',')}
                            </Text>
                        </View>
                    </View>

                    {/* Expiration date - mais visível */}
                    {expirationDate && (
                        <View style={styles.expirationRowHorizontal}>
                            <Ionicons 
                                name="calendar-outline" 
                                size={14} 
                                color={daysToExpire !== null && daysToExpire <= 2 ? Colors.error : Colors.warning} 
                            />
                            <View style={styles.expirationInfo}>
                                <Text style={[
                                    styles.expirationTextHorizontal,
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
                                        handleQuantityChange(item.id, -1);
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
                                        handleQuantityChange(item.id, 1);
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

                    {/* Add button - parte inferior do card */}
                    <TouchableOpacity
                        style={[
                            styles.addButtonHorizontal,
                            availableStock === 0 && styles.addButtonDisabled
                        ]}
                        onPress={(e) => {
                            e.stopPropagation();
                            if (availableStock > 0) {
                                handleAddToCart(item);
                            }
                        }}
                        disabled={availableStock === 0}
                    >
                        <Ionicons 
                            name={availableStock > 0 ? "cart" : "close-circle"} 
                            size={16} 
                            color={Colors.text} 
                        />
                        <Text style={styles.addButtonTextHorizontal}>
                            {availableStock > 0 ? `Adicionar ${selectedQuantity > 1 ? `${selectedQuantity}x` : ''}` : 'Esgotado'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Skeleton loader component
    const renderSkeletonCard = () => (
        <View style={styles.productCardHorizontal}>
            <View style={[styles.productImageContainerHorizontal, styles.skeleton]}>
                <ActivityIndicator size="small" color={Colors.primary} />
            </View>
            <View style={styles.productInfoHorizontal}>
                <View style={[styles.skeleton, styles.skeletonText, { width: '60%', marginBottom: 8 }]} />
                <View style={[styles.skeleton, styles.skeletonText, { width: '100%', marginBottom: 4 }]} />
                <View style={[styles.skeleton, styles.skeletonText, { width: '80%', marginBottom: 12 }]} />
                <View style={[styles.skeleton, { width: '100%', height: 36, borderRadius: 10 }]} />
            </View>
        </View>
    );

    if (loading) {
        return (
            <GradientBackground>
                <View style={styles.container}>
                    {/* Header skeleton */}
                    <View style={styles.header}>
                        <View>
                            <View style={[styles.skeleton, styles.skeletonText, { width: 120, height: 16, marginBottom: 8 }]} />
                            <View style={[styles.skeleton, styles.skeletonText, { width: 180, height: 32 }]} />
                        </View>
                        <View style={[styles.skeleton, { width: 48, height: 48, borderRadius: 14 }]} />
                    </View>
                    
                    {/* Search skeleton */}
                    <View style={styles.searchContainer}>
                        <View style={[styles.skeleton, { width: '100%', height: 48, borderRadius: 14 }]} />
                    </View>
                    
                    {/* Categories skeleton */}
                    <View style={styles.categoriesWrapper}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                            <View style={styles.categoriesContainer}>
                                {[1, 2, 3, 4].map(i => (
                                    <View key={i} style={[styles.skeleton, { width: 80, height: 36, borderRadius: 20, marginRight: 8 }]} />
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                    
                    {/* Products skeleton - lista horizontal */}
                    <View style={styles.productsWrapper}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsContainerHorizontal}>
                            {renderSkeletonCard()}
                            {renderSkeletonCard()}
                            {renderSkeletonCard()}
                        </ScrollView>
                    </View>
                </View>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <View style={styles.container}>
                {/* Header Compacto */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={styles.greeting}>
                            Olá{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
                        </Text>
                        <Text style={styles.title}>Ofertas do dia</Text>
                    </View>
                </View>

                {/* Search Bar Compacto */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={18} color={Colors.textMuted} />
                        <TextInput
                            style={[styles.searchInput, { color: Colors.text }]}
                            placeholder="Buscar..."
                            placeholderTextColor={Colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCorrect={false}
                            autoCapitalize="none"
                            selectionColor={Colors.primary}
                            cursorColor={Colors.primary}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[
                                styles.filterButton,
                                (showFilters || filterMinPrice || filterMaxPrice || filterMaxDaysToExpire) && styles.filterButtonActive
                            ]}
                            onPress={() => setShowFilters(!showFilters)}
                            activeOpacity={0.7}
                        >
                            <Ionicons 
                                name="filter" 
                                size={22} 
                                color={(showFilters || filterMinPrice || filterMaxPrice || filterMaxDaysToExpire) ? Colors.primary : Colors.textMuted} 
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Filtros */}
                {showFilters && (
                    <View style={styles.filtersContainer}>
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Preço (R$)</Text>
                            <View style={styles.priceFilterRow}>
                                <View style={styles.priceInputContainer}>
                                    <Text style={styles.priceInputLabel}>Mín</Text>
                                    <TextInput
                                        style={styles.priceInput}
                                        placeholder="0,00"
                                        placeholderTextColor={Colors.textMuted}
                                        value={filterMinPrice}
                                        onChangeText={(text) => {
                                            // Allow only numbers and comma
                                            const cleaned = text.replace(/[^\d,]/g, '').replace(/,/g, ',');
                                            setFilterMinPrice(cleaned);
                                        }}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <Text style={styles.priceSeparator}>até</Text>
                                <View style={styles.priceInputContainer}>
                                    <Text style={styles.priceInputLabel}>Máx</Text>
                                    <TextInput
                                        style={styles.priceInput}
                                        placeholder="999,99"
                                        placeholderTextColor={Colors.textMuted}
                                        value={filterMaxPrice}
                                        onChangeText={(text) => {
                                            // Allow only numbers and comma
                                            const cleaned = text.replace(/[^\d,]/g, '').replace(/,/g, ',');
                                            setFilterMaxPrice(cleaned);
                                        }}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Vence em (dias)</Text>
                            <View style={styles.daysFilterRow}>
                                {[1, 3, 7, 15, 30].map(days => (
                                    <TouchableOpacity
                                        key={days}
                                        style={[
                                            styles.daysChip,
                                            filterMaxDaysToExpire === days && styles.daysChipActive
                                        ]}
                                        onPress={() => setFilterMaxDaysToExpire(
                                            filterMaxDaysToExpire === days ? null : days
                                        )}
                                    >
                                        <Text style={[
                                            styles.daysChipText,
                                            filterMaxDaysToExpire === days && styles.daysChipTextActive
                                        ]}>
                                            ≤ {days} {days === 1 ? 'dia' : 'dias'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Distância (km)</Text>
                            <View style={styles.radiusFilterRow}>
                                {[2, 5, 10, 15, 20].map(km => (
                                    <TouchableOpacity
                                        key={km}
                                        style={[
                                            styles.radiusChip,
                                            filterRadius === km && styles.radiusChipActive
                                        ]}
                                        onPress={() => {
                                            setFilterRadius(filterRadius === km ? null : km);
                                            // Atualizar o raio do usuário e recarregar
                                            if (filterRadius !== km) {
                                                // Note: Isso atualizaria o raio do usuário permanentemente
                                                // Pode ser melhor apenas filtrar localmente sem salvar
                                            }
                                        }}
                                    >
                                        <Text style={[
                                            styles.radiusChipText,
                                            filterRadius === km && styles.radiusChipTextActive
                                        ]}>
                                            {km} km
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.clearFiltersButton}
                            onPress={() => {
                                setFilterMinPrice('');
                                setFilterMaxPrice('');
                                setFilterMaxDaysToExpire(null);
                                setFilterRadius(null);
                            }}
                        >
                            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                            <Text style={styles.clearFiltersText}>Limpar filtros</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Location Info */}
                {location && (
                    <View style={styles.locationInfo}>
                        <Ionicons name="location" size={14} color={Colors.primary} />
                        <Text style={styles.locationText}>
                            Buscando em um raio de {user?.radius_km || 5}km
                        </Text>
                    </View>
                )}

                {/* Categories - Melhor Visualização */}
                <View style={styles.categoriesWrapper}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoriesContainer}
                        style={styles.categoriesScroll}
                    >
                        {[{ value: '', label: 'Todos' }, ...PRODUCT_CATEGORIES].map((cat) => (
                            <TouchableOpacity
                                key={cat.value || 'all'}
                                style={[
                                    styles.categoryChip,
                                    selectedCategory === cat.value && styles.categoryChipActive,
                                ]}
                                onPress={() => setSelectedCategory(
                                    selectedCategory === cat.value ? null : cat.value
                                )}
                            >
                                <Text style={[
                                    styles.categoryText,
                                    selectedCategory === cat.value && styles.categoryTextActive,
                                ]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Products - Lista Horizontal */}
                {filteredBatches.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="search-outline" size={64} color={Colors.textMuted} />
                        </View>
                        <Text style={styles.emptyText}>
                            {searchQuery ? 'Nenhum resultado' : 'Nenhuma oferta encontrada'}
                        </Text>
                        <Text style={styles.emptySubtext}>
                            {searchQuery
                                ? `Não encontramos produtos para "${searchQuery}"`
                                : selectedCategory
                                    ? 'Tente outra categoria ou aumente o raio de busca'
                                    : 'Não há ofertas disponíveis na sua região ainda'
                            }
                        </Text>
                    </View>
                ) : (
                    <View style={styles.productsWrapper}>
                        {searchQuery && (
                            <Text style={styles.searchResultsText}>
                                {filteredBatches.length} resultado(s) para "{searchQuery}"
                            </Text>
                        )}
                        <FlatList
                            data={filteredBatches}
                            renderItem={renderBatch}
                            keyExtractor={(item) => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.productsContainerHorizontal}
                            style={styles.productsList}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor={Colors.primary}
                                />
                            }
                            onEndReached={loadMoreBatches}
                            onEndReachedThreshold={0.5}
                            ListFooterComponent={
                                loadingMore ? (
                                    <View style={styles.loadingMoreContainer}>
                                        <ActivityIndicator size="small" color={Colors.primary} />
                                    </View>
                                ) : null
                            }
                        />
                    </View>
                )}
            </View>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    loadingText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    header: {
        paddingHorizontal: 20,
        marginBottom: 12,
        paddingTop: 8,
    },
    headerContent: {
        flexDirection: 'column',
    },
    greeting: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16,
        gap: 6,
    },
    locationText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    categoriesWrapper: {
        marginBottom: 16,
    },
    categoriesScroll: {
        maxHeight: 50,
        flexGrow: 0,
    },
    categoriesContainer: {
        paddingHorizontal: 20,
        paddingVertical: 6,
        gap: 8,
        flexDirection: 'row',
    },
    categoryChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.glass,
        borderWidth: 1.5,
        borderColor: Colors.glassBorder,
        marginRight: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    categoryChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    categoryText: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    categoryTextActive: {
        color: Colors.text,
        fontWeight: '700',
    },
    filterButton: {
        padding: 6,
        marginLeft: 4,
        borderRadius: 8,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
    },
    filterButtonActive: {
        backgroundColor: Colors.primary + '20',
    },
    filtersContainer: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        padding: 18,
        marginHorizontal: 20,
        marginBottom: 16,
        borderWidth: 1.5,
        borderColor: Colors.glassBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    filterSection: {
        marginBottom: 20,
    },
    filterLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 12,
    },
    priceFilterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    priceInputContainer: {
        flex: 1,
    },
    priceInputLabel: {
        fontSize: 11,
        color: Colors.textMuted,
        marginBottom: 6,
    },
    priceInput: {
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: Colors.text,
    },
    priceSeparator: {
        fontSize: 13,
        color: Colors.textMuted,
        marginTop: 20,
    },
    daysFilterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    daysChip: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 20,
        backgroundColor: Colors.glass,
        borderWidth: 1.5,
        borderColor: Colors.glassBorder,
    },
    daysChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    daysChipText: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    daysChipTextActive: {
        color: Colors.text,
        fontWeight: '700',
    },
    radiusFilterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    radiusChip: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 20,
        backgroundColor: Colors.glass,
        borderWidth: 1.5,
        borderColor: Colors.glassBorder,
    },
    radiusChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    radiusChipText: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    radiusChipTextActive: {
        color: Colors.text,
        fontWeight: '700',
    },
    clearFiltersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        marginTop: 8,
    },
    clearFiltersText: {
        fontSize: 13,
        color: Colors.textMuted,
        fontWeight: '500',
    },
    productsWrapper: {
        flex: 1,
        paddingBottom: 20,
    },
    productsList: {
        flex: 1,
    },
    productsContainerHorizontal: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        paddingTop: 10,
        paddingBottom: 40,
        gap: 16,
    },
    productCardHorizontal: {
        width: 300,
        minHeight: 460,
        backgroundColor: Colors.backgroundCard,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: Colors.glassBorder,
        overflow: 'visible',
        marginRight: 16,
        marginTop: 25,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        position: 'relative',
    },
    storeLogoTopContainer: {
        position: 'absolute',
        top: -35,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    storeLogoTop: {
        width: 85,
        height: 85,
        borderRadius: 42.5,
        backgroundColor: Colors.backgroundCard,
        borderWidth: 4,
        borderColor: Colors.backgroundCard,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    storeLogoTopImage: {
        width: '100%',
        height: '100%',
    },
    productImageContainerHorizontal: {
        width: '100%',
        height: 180,
        backgroundColor: Colors.glass,
        position: 'relative',
        overflow: 'hidden',
        marginTop: 25,
    },
    productImageHorizontal: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.glass,
    },
    imagePlaceholderHorizontal: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imagePlaceholderText: {
        fontSize: 10,
        color: Colors.textMuted,
        marginTop: 4,
    },
    skeleton: {
        backgroundColor: Colors.glass,
        opacity: 0.5,
    },
    skeletonText: {
        height: 14,
        borderRadius: 4,
    },
    discountBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: Colors.error,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    discountBadgeLarge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: Colors.error,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        shadowColor: Colors.error,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
        elevation: 6,
    },
    discountTextLarge: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.text,
        letterSpacing: 0.5,
    },
    stockBadge: {
        position: 'absolute',
        bottom: 6,
        left: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
    },
    stockText: {
        fontSize: 9,
        fontWeight: '600',
        color: Colors.warning,
    },
    storeLogoBadge: {
        position: 'absolute',
        top: 6,
        left: 6,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.backgroundCard,
        borderWidth: 2,
        borderColor: Colors.backgroundCard,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 3,
    },
    storeLogoImage: {
        width: '100%',
        height: '100%',
    },
    storeNameOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
    },
    storeNameOverlayText: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.text,
    },
    discountText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.text,
    },
    productInfoHorizontal: {
        padding: 12,
        paddingBottom: 10,
        flex: 1,
        justifyContent: 'space-between',
    },
    storeNameHorizontal: {
        fontSize: 11,
        color: Colors.textMuted,
        marginBottom: 4,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    storeHoursRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        marginTop: 2,
    },
    storeHoursText: {
        fontSize: 13,
        color: Colors.textMuted,
        fontWeight: '600',
    },
    productNameHorizontal: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 0,
        minHeight: 32,
        lineHeight: 20,
    },
    priceRowHorizontal: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
        marginTop: 4,
    },
    priceContainerHorizontal: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
        flex: 1,
    },
    originalPriceHorizontal: {
        fontSize: 11,
        color: Colors.textMuted,
        textDecorationLine: 'line-through',
    },
    promoPriceHorizontal: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.success,
    },
    discountTag: {
        backgroundColor: Colors.error + '30',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        marginLeft: 8,
        borderWidth: 1,
        borderColor: Colors.error + '40',
    },
    discountTagText: {
        fontSize: 13,
        fontWeight: '800',
        color: Colors.error,
        letterSpacing: 0.5,
    },
    expirationRowHorizontal: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        marginBottom: 6,
        paddingVertical: 5,
        paddingHorizontal: 8,
        backgroundColor: Colors.glass,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    expirationInfo: {
        flex: 1,
    },
    expirationTextHorizontal: {
        fontSize: 12,
        color: Colors.warning,
        fontWeight: '600',
        marginBottom: 2,
    },
    expirationTextUrgent: {
        color: Colors.error,
        fontWeight: '700',
    },
    expirationDateText: {
        fontSize: 10,
        color: Colors.textMuted,
        fontWeight: '500',
    },
    stockQuantityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
        paddingVertical: 5,
        paddingHorizontal: 8,
        backgroundColor: Colors.glass,
        borderRadius: 8,
    },
    stockInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    stockText: {
        fontSize: 11,
        color: Colors.textMuted,
        fontWeight: '500',
    },
    quantitySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: Colors.backgroundCard,
        borderRadius: 8,
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    quantityButton: {
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: Colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityButtonDisabled: {
        opacity: 0.4,
    },
    quantityText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        minWidth: 24,
        textAlign: 'center',
    },
    addButtonHorizontal: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 11,
        gap: 8,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 5,
        marginTop: 2,
    },
    addButtonDisabled: {
        backgroundColor: Colors.glass,
        opacity: 0.6,
    },
    addButtonTextHorizontal: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        letterSpacing: 0.3,
    },
    loadingMoreContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        width: 100,
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
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.glass,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
        height: 44,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: Colors.text,
        padding: 0,
        margin: 0,
    },
    searchResultsText: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 12,
        paddingHorizontal: 8,
    },
});
