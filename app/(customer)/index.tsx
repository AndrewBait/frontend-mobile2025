import { AdaptiveList } from '@/components/base/AdaptiveList';
import { SkeletonProductCard } from '@/components/base/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/Toast';
import { FilterPanel } from '@/components/FilterPanel';
import { GradientBackground } from '@/components/GradientBackground';
import { AnimatedBatchCard } from '@/components/product/AnimatedBatchCard';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useFilteredBatches } from '@/hooks/useFilteredBatches';
import { api, Batch } from '@/services/api';
import { PRODUCT_CATEGORIES } from '@/utils/validation';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VitrineScreen() {
    const insets = useSafeAreaInsets();
    const screenPaddingTop = insets.top + DesignTokens.spacing.md;
    const { user } = useAuth();
    const { incrementCartCount, updateCartCache } = useCart();
    const { showToast } = useToast();
    const { handleError } = useErrorHandler();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isRevalidating, setIsRevalidating] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [useLocationSearch, setUseLocationSearch] = useState(true);
    const [autoRadiusKm, setAutoRadiusKm] = useState<number | null>(null);
    const [locationNotice, setLocationNotice] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
    const loadBatchesRequestIdRef = useRef(0);
    const loadBatchesRef = useRef<(reset?: boolean) => Promise<void>>(async () => {});
    const focusReloadKeyRef = useRef('');
    const batchesRef = useRef<Batch[]>([]);
    const hasLoadedWithLocationRef = useRef(false);
    const suppressNextLoadBatchesRef = useRef(false);
    const locationToggledByUserRef = useRef(false);
    
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
    const hasActiveFilters = useMemo(() => {
        return !!filterMinPrice || !!filterMaxPrice || filterMaxDaysToExpire !== null;
    }, [filterMinPrice, filterMaxPrice, filterMaxDaysToExpire]);

    useFocusEffect(
        useCallback(() => {
            // Mantém dependências explícitas para recarregar ao mudar filtros/localização.
            focusReloadKeyRef.current = `${selectedCategory ?? ''}|${filterRadius ?? ''}|${
                useLocationSearch ? '1' : '0'
            }|${location?.lat ?? ''},${location?.lng ?? ''}`;

            if (suppressNextLoadBatchesRef.current) {
                suppressNextLoadBatchesRef.current = false;
                return;
            }
            void loadBatchesRef.current(true);
        }, [selectedCategory, location, filterRadius, useLocationSearch, loadBatchesRef])
    );

    useEffect(() => {
        getLocation();
    }, []);

    useEffect(() => {
        batchesRef.current = batches;
    }, [batches]);

    useEffect(() => {
        setAutoRadiusKm(null);
        setLocationNotice(null);
        hasLoadedWithLocationRef.current = false;
    }, [location?.lat, location?.lng]);

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
        const requestId = ++loadBatchesRequestIdRef.current;
        console.log(`[Vitrine] 🔄 loadBatches chamado - requestId: ${requestId}, reset: ${reset}`);

        const hadExistingBatches = batchesRef.current.length > 0;

        // NÃO limpar batches aqui - aguardar resposta da API primeiro
        if (reset) {
            setPage(1);
            setHasMore(true);
            if (hadExistingBatches) {
                setIsRevalidating(true);
            } else {
                setLoading(true);
            }
        }

        console.log('Loading batches...', { page: reset ? 1 : page });
        try {
            const params: any = {};

            if (selectedCategory) {
                params.categoria = selectedCategory;
            }

            const shouldUseLocation = Boolean(location && useLocationSearch);
            const userRadiusKm = user?.radius_km ?? 5;
            const baseRadiusKm = filterRadius ?? userRadiusKm;
            const effectiveRadiusKm = filterRadius ?? autoRadiusKm ?? userRadiusKm;
            const FALLBACK_RADIUS_KM = 20;

            if (shouldUseLocation && location) {
                params.lat = location.lat;
                params.lng = location.lng;
                // Usar raio do filtro se selecionado, senão usar o raio padrão do usuário
                params.raio_km = effectiveRadiusKm;
            }

            console.log('[Vitrine] 📡 Chamando API com params:', params);
            const data = await api.getPublicBatches(params);
            console.log(
                `[Vitrine] ✅ API retornou ${data.length} batches - requestId: ${requestId}, currentRequestId: ${loadBatchesRequestIdRef.current}`
            );

            // CRÍTICO: Verificar se esta requisição ainda é válida ANTES de atualizar o estado
            if (requestId !== loadBatchesRequestIdRef.current) {
                console.log(`[Vitrine] ⚠️ Requisição ${requestId} obsoleta, ignorando (atual: ${loadBatchesRequestIdRef.current})`);
                return;
            }

            let finalData = data;

            if (shouldUseLocation && finalData.length === 0) {
                const canAutoExpand =
                    filterRadius === null &&
                    autoRadiusKm === null &&
                    baseRadiusKm < FALLBACK_RADIUS_KM;

                if (canAutoExpand) {
                    setLocationNotice(
                        `Não há ofertas a ${baseRadiusKm}km. Tentando buscar em ${FALLBACK_RADIUS_KM}km...`
                    );

                    const fallbackParams = { ...params, raio_km: FALLBACK_RADIUS_KM };
                    const fallbackData = await api.getPublicBatches(fallbackParams);

                    if (requestId !== loadBatchesRequestIdRef.current) return;

                    if (fallbackData.length > 0) {
                        setAutoRadiusKm(FALLBACK_RADIUS_KM);
                        setLocationNotice(
                            `Sem ofertas a ${baseRadiusKm}km. Mostrando resultados em ${FALLBACK_RADIUS_KM}km.`
                        );
                        finalData = fallbackData;
                    } else {
                        setLocationNotice(
                            `Nenhuma oferta encontrada em até ${FALLBACK_RADIUS_KM}km.`
                        );
                    }
                } else if (autoRadiusKm) {
                    setLocationNotice(`Nenhuma oferta encontrada em ${effectiveRadiusKm}km.`);
                }

                const canFallbackToOtherRegions =
                    filterRadius === null && !locationToggledByUserRef.current;

                if (finalData.length === 0 && canFallbackToOtherRegions) {
                    const otherRegionsParams: any = { ...params };
                    delete otherRegionsParams.lat;
                    delete otherRegionsParams.lng;
                    delete otherRegionsParams.raio_km;

                    const otherRegionsData = await api.getPublicBatches(otherRegionsParams);

                    if (requestId !== loadBatchesRequestIdRef.current) return;

                    if (otherRegionsData.length > 0) {
                        suppressNextLoadBatchesRef.current = true;
                        setAutoRadiusKm(null);
                        setUseLocationSearch(false);
                        setLocationNotice(
                            'Não há ofertas próximas. Mostrando ofertas de outras regiões.'
                        );
                        finalData = otherRegionsData;
                    }
                }
            } else {
                setLocationNotice(null);
            }

            if (finalData.length > 0) {
                console.log('[Vitrine] Batches loaded:', finalData.length);
                console.log(
                    '[Vitrine] Primeiro batch:',
                    JSON.stringify(finalData[0], null, 2)
                );
            }

            // Só agora atualizar o estado, após garantir que a requisição é válida
            if (reset) {
                const shouldKeepPrevious =
                    shouldUseLocation &&
                    finalData.length === 0 &&
                    !hasLoadedWithLocationRef.current &&
                    hadExistingBatches;

                if (!shouldKeepPrevious) {
                    console.log(`[Vitrine] 💾 Salvando ${finalData.length} batches no estado (reset)`);
                    setBatches(finalData);
                }
            } else {
                console.log(`[Vitrine] 💾 Adicionando ${finalData.length} batches ao estado (append)`);
                setBatches(prev => [...prev, ...finalData]);
            }

            // Verificar se há mais itens para carregar
            setHasMore(finalData.length >= ITEMS_PER_PAGE);
            setImageErrors(new Set()); // Reset image errors on new load

            if (shouldUseLocation && finalData.length > 0) {
                hasLoadedWithLocationRef.current = true;
            }
        } catch (error: any) {
            if (requestId !== loadBatchesRequestIdRef.current) return;
            // Não logar erros de rede como ERROR se já foram tratados no api.ts
            const isNetworkError = error?.message?.includes('Network request failed') ||
                                 error?.message?.includes('Failed to fetch') ||
                                 error?.message?.includes('timeout');
            if (!isNetworkError) {
                console.error('[Vitrine] Erro ao carregar batches:', error?.message || error);
            }
            // Não limpar a vitrine em caso de erro — mantém os dados antigos visíveis
        } finally {
            if (requestId !== loadBatchesRequestIdRef.current) return;
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
            setIsRevalidating(false);
        }
    };
    loadBatchesRef.current = loadBatches;

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

    const filteredBatches = useFilteredBatches(batches, {
        searchQuery,
        minPrice: filterMinPrice,
        maxPrice: filterMaxPrice,
        maxDaysToExpire: filterMaxDaysToExpire,
    });

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

    // Callbacks otimizados para FilterPanel (evitar re-renders)
    const handleToggleFilters = useCallback(() => {
        setShowFilters(prev => !prev);
    }, []);

    const handleMinPriceChange = useCallback((text: string) => {
        const cleaned = text.replace(/[^\d,]/g, '').replace(/,/g, ',');
        setFilterMinPrice(cleaned);
    }, []);

    const handleMaxPriceChange = useCallback((text: string) => {
        const cleaned = text.replace(/[^\d,]/g, '').replace(/,/g, ',');
        setFilterMaxPrice(cleaned);
    }, []);

    const handleDaysSelect = useCallback((days: number | null) => {
        setFilterMaxDaysToExpire(days);
    }, []);

    const handleDistanceSelect = useCallback((km: number | null) => {
        locationToggledByUserRef.current = true;
        setLocationNotice(null);
        setAutoRadiusKm(null);
        setFilterRadius(km);
        setUseLocationSearch(true);
    }, []);

    const handleClearFilters = useCallback(() => {
        setFilterMinPrice('');
        setFilterMaxPrice('');
        setFilterMaxDaysToExpire(null);
        setFilterRadius(null);
        setLocationNotice(null);
        setAutoRadiusKm(null);
    }, []);

    const handleAddToCart = async (batch: Batch) => {
        const quantity = selectedQuantities[batch.id] || 1;
        const availableStock = batch.disponivel ?? batch.stock ?? batch.estoque_total ?? 0;
        
        if (quantity > availableStock) {
            showToast(`Estoque insuficiente: apenas ${availableStock} unidade(s).`, 'warning');
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
            const allItems = api.getAllCartItems(result);
            console.log('[VitrineScreen] Resultado:', {
                hasItems: allItems.length > 0,
                itemsCount: allItems.length,
                total: result?.total || 0
            });
            
            // Usar resposta diretamente para atualizar cache (evita requisição extra)
            updateCartCache(result);
            
            // Feedback visual de sucesso
            showToast('Produto adicionado ao carrinho!', 'success');
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
                showToast(
                    'Erro de conexão. Verifique sua internet e tente novamente.',
                    'error'
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
                                    showToast('Carrinho substituído e produto adicionado!', 'success');
                                } catch (replaceError: any) {
                                    console.error('[VitrineScreen] Erro ao substituir carrinho:', replaceError);
                                    handleError(replaceError, {
                                        fallbackMessage:
                                            'Não foi possível substituir o carrinho. Tente novamente.',
                                    });
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
            
            handleError(error, {
                fallbackMessage:
                    errorMessage || 'Não foi possível adicionar ao carrinho. Tente novamente.',
            });
        }
    };

    const renderBatch = ({ item, index }: { item: Batch; index: number }) => {
        const availableStock = item.disponivel ?? item.stock ?? item.estoque_total ?? 0;
        const selectedQuantity = selectedQuantities[item.id] || 1;
        const imageKey = item.id;
        const imageError = imageErrors.has(imageKey);

        return (
            <AnimatedBatchCard
                batch={item}
                index={index}
                selectedQuantity={selectedQuantity}
                availableStock={availableStock}
                imageError={imageError}
                onQuantityChange={handleQuantityChange}
                onAddToCart={handleAddToCart}
                onImageError={(key) => setImageErrors(prev => new Set(prev).add(key))}
            />
        );
    };

    // Skeleton loader component
    const renderSkeletonCard = () => (
        <SkeletonProductCard style={{ marginRight: DesignTokens.spacing.md }} />
    );

    if (loading) {
        return (
            <GradientBackground>
                <View style={[styles.container, { paddingTop: screenPaddingTop }]}>
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
            <View style={[styles.container, { paddingTop: screenPaddingTop }]}>
                {/* Header Compacto */}
                <Animated.View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={styles.greeting}>
                            Olá{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
                        </Text>
                        <Text style={styles.title}>Ofertas do dia</Text>
                    </View>
                </Animated.View>

                {/* Search Bar Compacto */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={18} color={Colors.textMuted} />
                        <TextInput
                            style={[styles.searchInput, { color: Colors.text }]}
                            placeholder="Buscar produtos, lojas..."
                            placeholderTextColor={Colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCorrect={false}
                            autoCapitalize="none"
                            selectionColor={Colors.primary}
                            cursorColor={Colors.primary}
                            accessibilityLabel="Campo de busca"
                            accessibilityHint="Digite para buscar produtos ou lojas"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity 
                                onPress={() => setSearchQuery('')}
                                accessibilityRole="button"
                                accessibilityLabel="Limpar busca"
                            >
                                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[
                                styles.filterButton,
                                (showFilters || hasActiveFilters) && styles.filterButtonActive
                            ]}
                            onPress={() => setShowFilters(!showFilters)}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="Filtros"
                            accessibilityHint="Abrir ou fechar painel de filtros"
                        >
                            <Ionicons 
                                name={showFilters ? "filter" : "filter-outline"} 
                                size={22} 
                                color={(showFilters || hasActiveFilters) ? Colors.primary : Colors.textMuted} 
                            />
                            {hasActiveFilters && (
                                <View style={styles.filterBadge}>
                                    <Text style={styles.filterBadgeText}>
                                        {[filterMinPrice, filterMaxPrice, filterMaxDaysToExpire, filterRadius].filter(Boolean).length}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Filtros - Usando FilterPanel Component */}
                <FilterPanel
                    isOpen={showFilters}
                    onToggle={handleToggleFilters}
                    activeFiltersCount={[filterMinPrice, filterMaxPrice, filterMaxDaysToExpire, filterRadius].filter(Boolean).length}
                    minPrice={filterMinPrice}
                    maxPrice={filterMaxPrice}
                    onMinPriceChange={handleMinPriceChange}
                    onMaxPriceChange={handleMaxPriceChange}
                    selectedDays={filterMaxDaysToExpire}
                    onDaysSelect={handleDaysSelect}
                    selectedDistance={filterRadius}
                    onDistanceSelect={handleDistanceSelect}
                    onClear={handleClearFilters}
                    hasActiveFilters={hasActiveFilters}
                />

                {/* Location Info */}
                {location && (
                    <View style={styles.locationInfo}>
                        <Ionicons name="location" size={14} color={Colors.primary} />
                        <Text style={styles.locationText}>
                            {useLocationSearch
                                ? `Buscando em um raio de ${filterRadius ?? autoRadiusKm ?? user?.radius_km ?? 5}km`
                                : 'Mostrando ofertas de outras regiões'}
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                locationToggledByUserRef.current = true;
                                setLocationNotice(null);
                                setAutoRadiusKm(null);
                                setUseLocationSearch((prev) => !prev);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={
                                useLocationSearch
                                    ? 'Ver ofertas de outras regiões'
                                    : 'Usar minha localização'
                            }
                        >
                            <Text style={styles.locationActionText}>
                                {useLocationSearch ? 'Outras regiões' : 'Usar localização'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {locationNotice && (
                    <View style={styles.locationNotice}>
                        <Ionicons name="information-circle" size={16} color={Colors.primary} />
                        <Text style={styles.locationNoticeText}>{locationNotice}</Text>
                    </View>
                )}

                {isRevalidating && batches.length > 0 && (
                    <View style={styles.revalidatingBanner}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                        <Text style={styles.revalidatingText}>Atualizando ofertas…</Text>
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
                    <EmptyState
                        icon={searchQuery ? "search-outline" : "storefront-outline"}
                        title={searchQuery ? 'Nenhum resultado' : 'Nenhuma oferta encontrada'}
                        message={
                            searchQuery
                                ? `Não encontramos produtos para "${searchQuery}"`
                                : selectedCategory
                                    ? 'Tente outra categoria ou aumente o raio de busca'
                                    : useLocationSearch && location
                                        ? 'Não encontramos ofertas próximas. Você pode aumentar o raio ou ver ofertas de outras regiões.'
                                        : 'Não há ofertas disponíveis no momento'
                        }
                        actionLabel={
                            !searchQuery && useLocationSearch && location
                                ? 'Ver ofertas de outras regiões'
                                : searchQuery
                                    ? undefined
                                    : 'Ajustar Localização'
                        }
                        onAction={
                            !searchQuery && useLocationSearch && location
                                ? () => {
                                    locationToggledByUserRef.current = true;
                                    setLocationNotice(null);
                                    setAutoRadiusKm(null);
                                    setUseLocationSearch(false);
                                }
                                : searchQuery
                                    ? undefined
                                    : () => router.push('/(customer)/setup')
                        }
                        secondaryActionLabel={
                            !searchQuery && useLocationSearch && location
                                ? 'Ajustar Localização'
                                : undefined
                        }
                        onSecondaryAction={
                            !searchQuery && useLocationSearch && location
                                ? () => router.push('/(customer)/setup')
                                : undefined
                        }
                    />
                ) : (
                    <View style={[styles.productsWrapper, isRevalidating && styles.productsWrapperUpdating]}>
                        {searchQuery && (
                            <Text style={styles.searchResultsText}>
                                {filteredBatches.length} resultado(s) para &quot;{searchQuery}&quot;
                            </Text>
                        )}
                        <AdaptiveList
                            data={filteredBatches}
                            renderItem={renderBatch}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.productsContainerVertical}
                            style={styles.productsList}
                            estimatedItemSize={280}
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
                            removeClippedSubviews={false}
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
        paddingHorizontal: DesignTokens.padding.medium,
        marginBottom: DesignTokens.spacing.md,
    },
    headerContent: {
        flexDirection: 'column',
    },
    greeting: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.text,
        letterSpacing: -0.5,
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: DesignTokens.padding.medium,
        paddingVertical: 8,
        marginBottom: DesignTokens.spacing.sm,
        gap: 6,
        backgroundColor: Colors.primary05,
        marginHorizontal: DesignTokens.padding.medium,
        borderRadius: DesignTokens.borderRadius.md,
    },
    locationText: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.primary,
        flex: 1,
    },
    locationActionText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    locationNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: DesignTokens.padding.medium,
        paddingVertical: 10,
        marginHorizontal: DesignTokens.padding.medium,
        marginBottom: DesignTokens.spacing.sm,
        backgroundColor: Colors.glass,
        borderRadius: DesignTokens.borderRadius.md,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    locationNoticeText: {
        flex: 1,
        fontSize: 12,
        color: Colors.textSecondary,
        lineHeight: 16,
    },
    revalidatingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: DesignTokens.padding.medium,
        paddingVertical: 10,
        marginHorizontal: DesignTokens.padding.medium,
        marginBottom: DesignTokens.spacing.sm,
        backgroundColor: Colors.primary05,
        borderRadius: DesignTokens.borderRadius.md,
        borderWidth: 1,
        borderColor: Colors.primary15,
    },
    revalidatingText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
    productsWrapperUpdating: {
        opacity: 0.7,
    },
    categoriesWrapper: {
        marginBottom: DesignTokens.spacing.md,
    },
    categoriesScroll: {
        maxHeight: 56,
        flexGrow: 0,
    },
    categoriesContainer: {
        paddingHorizontal: DesignTokens.padding.medium,
        paddingVertical: 4,
        gap: DesignTokens.spacing.sm,
        flexDirection: 'row',
    },
    categoryChip: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: DesignTokens.borderRadius.full,
        backgroundColor: Colors.backgroundLight,
        borderWidth: 1.5,
        borderColor: Colors.border,
        marginRight: DesignTokens.spacing.sm,
        ...DesignTokens.shadows.xs,
    },
    categoryChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
        ...DesignTokens.shadows.primary,
    },
    categoryText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    categoryTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    filterButton: {
        padding: 8,
        marginLeft: 4,
        borderRadius: DesignTokens.borderRadius.lg,
        backgroundColor: Colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 44,
        minHeight: 44,
        position: 'relative',
    },
    filterButtonActive: {
        backgroundColor: Colors.primary10,
    },
    filterBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: Colors.error,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    filterBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
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
    },
    productsList: {
        flex: 1,
    },
    productsContainerHorizontal: {
        paddingHorizontal: DesignTokens.padding.medium,
        paddingVertical: 8,
        paddingTop: 10,
        paddingBottom: 100,
        gap: 16,
    },
    productsContainerVertical: {
        paddingHorizontal: DesignTokens.padding.medium,
        paddingTop: DesignTokens.spacing.sm,
        paddingBottom: 100,
    },
    productCardHorizontal: {
        width: 280, // Reduzido de 300 para melhor visualização
        minHeight: 460,
        backgroundColor: Colors.backgroundCard,
        borderRadius: DesignTokens.borderRadius.xl,
        borderWidth: 1.5,
        borderColor: Colors.glassBorder,
        overflow: 'visible',
        marginRight: 16,
        marginTop: 25,
        marginBottom: 30,
        ...DesignTokens.shadows.md,
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
        backgroundColor: Colors.error30,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        marginLeft: 8,
        borderWidth: 1,
        borderColor: Colors.error40,
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
    searchContainer: {
        paddingHorizontal: DesignTokens.padding.medium,
        marginBottom: DesignTokens.spacing.md,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundLight,
        borderRadius: DesignTokens.borderRadius.xl,
        borderWidth: 1.5,
        borderColor: Colors.border,
        paddingHorizontal: DesignTokens.spacing.md,
        paddingVertical: DesignTokens.spacing.sm + 4,
        gap: DesignTokens.spacing.sm,
        minHeight: 52,
        ...DesignTokens.shadows.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
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
