import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
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
import { api, Batch, Store } from '../../services/api';

export default function StoreProductsScreen() {
    const { storeId } = useLocalSearchParams<{ storeId?: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const [store, setStore] = useState<Store | null>(null);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [allStores, setAllStores] = useState<Store[]>([]); // Todas as lojas carregadas
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'store'>(storeId ? 'store' : 'list');
    
    // Filtros
    const [showFilters, setShowFilters] = useState(false);
    const [filterRadius, setFilterRadius] = useState<number | null>(null);
    const [filterStoreType, setFilterStoreType] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    
    // Paginação
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const STORES_PER_PAGE = 10;

    useEffect(() => {
        if (storeId) {
            setViewMode('store');
            loadStoreData();
        } else {
            setViewMode('list');
            getLocation();
            loadStoresList(true);
        }
    }, [storeId]);

    useEffect(() => {
        if (viewMode === 'list' && (filterRadius !== null || filterStoreType !== null || location)) {
            setPage(1); // Reset página ao mudar filtros
            loadStoresList(true);
        }
    }, [filterRadius, filterStoreType, location]);

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
            console.error('[StoreProducts] Erro ao obter localização:', error);
        }
    };

    const loadStoresList = async (reset: boolean = false) => {
        if (reset) {
            setAllStores([]);
            setHasMore(true);
            setPage(1);
        }

        if (loadingMore && !reset) return; // Evitar múltiplas chamadas simultâneas

        try {
            if (reset) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            // Preparar parâmetros de filtro
            const params: any = {};
            
            if (filterStoreType) {
                // Filtrar por tipo de loja - vamos fazer isso localmente após carregar
            }
            
            if (location) {
                params.lat = location.lat;
                params.lng = location.lng;
                params.raio_km = filterRadius ?? user?.radius_km ?? 5;
            }

            // Buscar batches públicos com filtros
            const fetchPromise = api.getPublicBatches(params);
            const timeoutPromise = new Promise<Batch[]>((resolve) =>
                setTimeout(() => {
                    console.log('[StoreProducts] Timeout ao buscar lojas após 10s');
                    resolve([]);
                }, 10000)
            );

            const batchesData = await Promise.race([fetchPromise, timeoutPromise]);
            const uniqueStores = new Map<string, Store>();
            
            if (batchesData && batchesData.length > 0) {
                batchesData.forEach((batch: Batch) => {
                    if (batch.store && !uniqueStores.has(batch.store.id)) {
                        // Aplicar filtro de tipo de loja se selecionado
                        if (!filterStoreType || batch.store.type === filterStoreType) {
                            uniqueStores.set(batch.store.id, batch.store);
                        }
                    }
                });
                
                const newStores = Array.from(uniqueStores.values());
                
                if (reset) {
                    setAllStores(newStores);
                } else {
                    setAllStores(prev => {
                        const existingIds = new Set(prev.map(s => s.id));
                        const uniqueNew = newStores.filter(s => !existingIds.has(s.id));
                        return [...prev, ...uniqueNew];
                    });
                }
                
                // Verificar se há mais lojas (se retornou menos que o esperado, não há mais)
                setHasMore(newStores.length >= STORES_PER_PAGE);
            } else {
                if (reset) {
                    setAllStores([]);
                }
                setHasMore(false);
            }
        } catch (error: any) {
            const isNetworkError = error?.message?.includes('Network request failed') || 
                                 error?.message?.includes('Failed to fetch');
            if (!isNetworkError) {
                console.error('[StoreProducts] Erro ao carregar lojas:', error?.message || error);
            }
            if (reset) {
                setAllStores([]);
            }
            setHasMore(false);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    };

    const loadMoreStores = () => {
        // Se ainda há lojas filtradas para mostrar, apenas incrementar página
        if (!loadingMore && hasMoreStores && !loading) {
            setPage(prev => prev + 1);
        }
        // Se já mostrou todas as lojas filtradas mas ainda há mais no servidor, buscar mais
        else if (!loadingMore && hasMore && !loading && allStores.length > 0 && !hasMoreStores) {
            setPage(prev => prev + 1);
            loadStoresList(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setPage(1);
        loadStoresList(true);
    }, []);

    // Filtrar lojas localmente (busca por nome)
    const filteredStores = useMemo(() => {
        let filtered = allStores;

        // Filtro de busca por texto
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(store => {
                const name = (store.name || '').toLowerCase();
                const address = (store.address || '').toLowerCase();
                const type = (store.type || '').toLowerCase();
                return name.includes(query) || address.includes(query) || type.includes(query);
            });
        }

        return filtered;
    }, [allStores, searchQuery]);

    // Resetar página quando busca ou filtros mudarem
    useEffect(() => {
        setPage(1);
    }, [searchQuery]);

    // Paginação local (mostrar apenas STORES_PER_PAGE por vez)
    const paginatedStores = useMemo(() => {
        return filteredStores.slice(0, page * STORES_PER_PAGE);
    }, [filteredStores, page]);

    const hasMoreStores = filteredStores.length > paginatedStores.length;

    // Obter tipos de loja únicos para o filtro
    const storeTypes = useMemo(() => {
        const types = new Set<string>();
        allStores.forEach(store => {
            if (store.type) {
                types.add(store.type);
            }
        });
        return Array.from(types).sort();
    }, [allStores]);

    const loadStoreData = async () => {
        try {
            setLoading(true);
            
            // Carregar dados da loja com timeout
            const storePromise = api.getPublicStore(storeId!);
            const storeTimeout = new Promise<any>((resolve) =>
                setTimeout(() => {
                    console.log('[StoreProducts] Timeout ao buscar dados da loja após 8s');
                    resolve(null);
                }, 8000)
            );
            const storeData = await Promise.race([storePromise, storeTimeout]);
            
            if (storeData) {
                setStore(storeData);
            }
            
            // Carregar batches da loja com timeout
            const batchesPromise = api.getPublicBatches({ store_id: storeId });
            const batchesTimeout = new Promise<Batch[]>((resolve) =>
                setTimeout(() => {
                    console.log('[StoreProducts] Timeout ao buscar batches após 10s');
                    resolve([]);
                }, 10000)
            );
            const batchesData = await Promise.race([batchesPromise, batchesTimeout]);
            
            if (batchesData) {
                setBatches(batchesData);
            } else {
                setBatches([]);
            }
        } catch (error: any) {
            // Não logar erros de rede como ERROR se já foram tratados
            const isNetworkError = error?.message?.includes('Network request failed') || 
                                 error?.message?.includes('Failed to fetch');
            if (!isNetworkError) {
                console.error('[StoreProducts] Erro ao carregar dados da loja:', error?.message || error);
            }
            // Manter store se já foi carregado, mas limpar batches
            if (!store) {
                setStore(null);
            }
            setBatches([]);
        } finally {
            setLoading(false);
        }
    };

    const renderStore = ({ item }: { item: Store }) => {
        return (
            <TouchableOpacity
                style={styles.storeCard}
                onPress={() => {
                    router.push({
                        pathname: '/(customer)/store-products',
                        params: { storeId: item.id }
                    });
                }}
                activeOpacity={0.9}
            >
                {item.logo_url && (
                    <Image
                        source={{ uri: item.logo_url }}
                        style={styles.storeCardLogo}
                        resizeMode="cover"
                    />
                )}
                <View style={styles.storeCardInfo}>
                    <Text style={styles.storeCardName} numberOfLines={2}>
                        {item.name}
                    </Text>
                    {item.hours && (
                        <View style={styles.storeCardHoursRow}>
                            <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                            <Text style={styles.storeCardHours} numberOfLines={1}>
                                {item.hours}
                            </Text>
                        </View>
                    )}
                    {item.address && (
                        <Text style={styles.storeCardAddress} numberOfLines={1}>
                            {item.address}
                        </Text>
                    )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
        );
    };

    const renderBatch = ({ item }: { item: Batch }) => {
        // Handle both PT-BR and EN field names - backend may return products (plural) or product (singular)
        // O mapBatchFields já mapeou, mas ainda pode ter products (plural) do backend
        const productData = (item as any).products || item.product;
        const productName = productData?.name || productData?.nome || 'Produto sem nome';
        const productPhoto = productData?.photo1 || productData?.foto1 || null;
        const productCategory = productData?.category || productData?.categoria || '';
        const originalPrice = item.original_price ?? item.preco_normal_override ?? productData?.preco_normal ?? 0;
        const promoPrice = item.promo_price ?? item.preco_promocional ?? 0;
        
        // Calcular desconto
        let discountPercent = item.discount_percent ?? item.desconto_percentual ?? 0;
        if ((discountPercent === 0 || !discountPercent) && originalPrice > 0 && promoPrice > 0 && originalPrice > promoPrice) {
            discountPercent = ((originalPrice - promoPrice) / originalPrice) * 100;
        }
        
        const availableStock = item.disponivel ?? item.stock ?? item.estoque_total ?? 0;
        
        // Expiration date
        const expirationDate = item.expiration_date || item.data_vencimento || null;
        let expirationDisplay = '';
        if (expirationDate) {
            const expDate = new Date(expirationDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            expDate.setHours(0, 0, 0, 0);
            const diffTime = expDate.getTime() - today.getTime();
            const daysToExpire = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
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

        return (
            <TouchableOpacity
                style={styles.batchCard}
                onPress={() => router.push(`/product/${item.id}`)}
                activeOpacity={0.9}
            >
                <View style={styles.batchImageContainer}>
                    {productPhoto ? (
                        <Image
                            source={{ uri: productPhoto }}
                            style={styles.batchImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.batchImage, styles.imagePlaceholder]}>
                            <Ionicons name="image-outline" size={40} color={Colors.textMuted} />
                        </View>
                    )}
                    
                    {/* Discount badge */}
                    {discountPercent > 0 && (
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>
                                -{Math.round(discountPercent)}%
                            </Text>
                        </View>
                    )}
                    
                    {/* Stock badge se baixo */}
                    {availableStock > 0 && availableStock <= 3 && (
                        <View style={styles.stockBadge}>
                            <Text style={styles.stockBadgeText}>
                                Últimas {availableStock}
                            </Text>
                        </View>
                    )}
                </View>
                
                <View style={styles.batchInfo}>
                    {/* Category */}
                    {productCategory && (
                        <Text style={styles.batchCategory} numberOfLines={1}>
                            {productCategory}
                        </Text>
                    )}
                    
                    {/* Product name */}
                    <Text style={styles.batchName} numberOfLines={2}>
                        {productName}
                    </Text>
                    
                    {/* Price row */}
                    <View style={styles.batchPriceRow}>
                        <View style={styles.priceContainer}>
                            {originalPrice > promoPrice && (
                                <Text style={styles.originalPrice}>
                                    R$ {originalPrice.toFixed(2).replace('.', ',')}
                                </Text>
                            )}
                            <Text style={styles.batchPrice}>
                                R$ {promoPrice.toFixed(2).replace('.', ',')}
                            </Text>
                        </View>
                    </View>
                    
                    {/* Expiration */}
                    {expirationDate && (
                        <View style={styles.expirationRow}>
                            <Ionicons 
                                name="calendar-outline" 
                                size={12} 
                                color={expirationDisplay.includes('hoje') || expirationDisplay.includes('Vencido') ? Colors.error : Colors.warning} 
                            />
                            <Text style={[
                                styles.expirationText,
                                (expirationDisplay.includes('hoje') || expirationDisplay.includes('Vencido')) && styles.expirationTextUrgent
                            ]}>
                                {expirationDisplay}
                            </Text>
                        </View>
                    )}
                    
                    {/* Stock */}
                    <View style={styles.stockRow}>
                        <Ionicons name="cube-outline" size={12} color={Colors.textMuted} />
                        <Text style={[
                            styles.stockText,
                            availableStock === 0 && styles.stockTextEmpty
                        ]}>
                            {availableStock > 0 ? `${availableStock} disponível(eis)` : 'Esgotado'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <GradientBackground>
                <View style={styles.container}>
                    <View style={styles.header}>
                        {viewMode === 'store' && (
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => router.back()}
                            >
                                <Ionicons name="arrow-back" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        )}
                        <Text style={styles.headerTitle}>
                            {viewMode === 'store' ? 'Produtos da Loja' : 'Lojas'}
                        </Text>
                    </View>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                </View>
            </GradientBackground>
        );
    }

    // Lista de lojas
    if (viewMode === 'list') {
        return (
            <GradientBackground>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Lojas Disponíveis</Text>
                    </View>

                    {/* Barra de busca */}
                    <View style={styles.searchContainer}>
                        <View style={styles.searchBar}>
                            <Ionicons name="search" size={18} color={Colors.textMuted} />
                            <TextInput
                                style={[styles.searchInput, { color: Colors.text }]}
                                placeholder="Buscar loja..."
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
                                    (showFilters || filterRadius !== null || filterStoreType !== null) && styles.filterButtonActive
                                ]}
                                onPress={() => setShowFilters(!showFilters)}
                            >
                                <Ionicons 
                                    name="filter" 
                                    size={20} 
                                    color={(showFilters || filterRadius !== null || filterStoreType !== null) ? Colors.primary : Colors.textMuted} 
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Filtros */}
                    {showFilters && (
                        <View style={styles.filtersContainer}>
                            <View style={styles.filterSection}>
                                <Text style={styles.filterLabel}>Distância (km)</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                                    <View style={styles.filterChipsRow}>
                                        {[2, 5, 10, 15, 20, 30].map(km => (
                                            <TouchableOpacity
                                                key={km}
                                                style={[
                                                    styles.filterChip,
                                                    filterRadius === km && styles.filterChipActive
                                                ]}
                                                onPress={() => setFilterRadius(filterRadius === km ? null : km)}
                                            >
                                                <Text style={[
                                                    styles.filterChipText,
                                                    filterRadius === km && styles.filterChipTextActive
                                                ]}>
                                                    {km} km
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>

                            {storeTypes.length > 0 && (
                                <View style={styles.filterSection}>
                                    <Text style={styles.filterLabel}>Tipo de Loja</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                                        <View style={styles.filterChipsRow}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.filterChip,
                                                    filterStoreType === null && styles.filterChipActive
                                                ]}
                                                onPress={() => setFilterStoreType(null)}
                                            >
                                                <Text style={[
                                                    styles.filterChipText,
                                                    filterStoreType === null && styles.filterChipTextActive
                                                ]}>
                                                    Todos
                                                </Text>
                                            </TouchableOpacity>
                                            {storeTypes.map(type => (
                                                <TouchableOpacity
                                                    key={type}
                                                    style={[
                                                        styles.filterChip,
                                                        filterStoreType === type && styles.filterChipActive
                                                    ]}
                                                    onPress={() => setFilterStoreType(filterStoreType === type ? null : type)}
                                                >
                                                    <Text style={[
                                                        styles.filterChipText,
                                                        filterStoreType === type && styles.filterChipTextActive
                                                    ]}>
                                                        {type}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.clearFiltersButton}
                                onPress={() => {
                                    setFilterRadius(null);
                                    setFilterStoreType(null);
                                }}
                            >
                                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                                <Text style={styles.clearFiltersText}>Limpar filtros</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Info de localização */}
                    {location && (
                        <View style={styles.locationInfo}>
                            <Ionicons name="location" size={14} color={Colors.primary} />
                            <Text style={styles.locationText}>
                                Buscando em um raio de {filterRadius ?? user?.radius_km ?? 5}km
                            </Text>
                        </View>
                    )}

                    {loading && allStores.length === 0 ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                        </View>
                    ) : filteredStores.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="storefront-outline" size={64} color={Colors.textMuted} />
                            <Text style={styles.emptyText}>
                                {searchQuery ? 'Nenhuma loja encontrada' : 'Nenhuma loja disponível'}
                            </Text>
                            <Text style={styles.emptySubtext}>
                                {searchQuery
                                    ? `Não encontramos lojas para "${searchQuery}"`
                                    : 'Não há lojas com produtos disponíveis no momento'
                                }
                            </Text>
                        </View>
                    ) : (
                        <>
                            {(searchQuery || filterRadius !== null || filterStoreType !== null) && (
                                <Text style={styles.resultsText}>
                                    {filteredStores.length} loja(s) encontrada(s)
                                    {paginatedStores.length < filteredStores.length && ` (mostrando ${paginatedStores.length})`}
                                </Text>
                            )}
                            <FlatList
                                data={paginatedStores}
                                renderItem={renderStore}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.storesList}
                                showsVerticalScrollIndicator={false}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={onRefresh}
                                        tintColor={Colors.primary}
                                    />
                                }
                                onEndReached={loadMoreStores}
                                onEndReachedThreshold={0.5}
                                ListFooterComponent={
                                    loadingMore ? (
                                        <View style={styles.loadingMoreContainer}>
                                            <ActivityIndicator size="small" color={Colors.primary} />
                                        </View>
                                    ) : hasMoreStores || hasMore ? (
                                        <View style={styles.loadingMoreContainer}>
                                            <Text style={styles.loadMoreText}>Carregando mais lojas...</Text>
                                        </View>
                                    ) : null
                                }
                            />
                        </>
                    )}
                </View>
            </GradientBackground>
        );
    }

    // Detalhes da loja
    if (!store) {
        return (
            <GradientBackground>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={24} color={Colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Produtos da Loja</Text>
                    </View>
                    <View style={styles.emptyContainer}>
                        <Ionicons name="storefront-outline" size={64} color={Colors.textMuted} />
                        <Text style={styles.emptyText}>Loja não encontrada</Text>
                    </View>
                </View>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => {
                            router.push('/(customer)/store-products');
                        }}
                    >
                        <Ionicons name="arrow-back" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Produtos da Loja</Text>
                </View>

                {/* Store Info - Melhorado */}
                <View style={styles.storeHeader}>
                    {store.logo_url ? (
                        <Image
                            source={{ uri: store.logo_url }}
                            style={styles.storeLogo}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.storeLogo, styles.storeLogoPlaceholder]}>
                            <Ionicons name="storefront-outline" size={40} color={Colors.textMuted} />
                        </View>
                    )}
                    <View style={styles.storeInfo}>
                        <Text style={styles.storeName}>{store.name || 'Loja'}</Text>
                        
                        {store.type && (
                            <View style={styles.storeTypeRow}>
                                <Ionicons name="pricetag-outline" size={12} color={Colors.primary} />
                                <Text style={styles.storeType}>{store.type}</Text>
                            </View>
                        )}
                        
                        {store.hours && (
                            <View style={styles.storeHoursRow}>
                                <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                                <Text style={styles.storeHours}>{store.hours}</Text>
                            </View>
                        )}
                        
                        {store.address && (
                            <View style={styles.storeAddressRow}>
                                <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                                <Text style={styles.storeAddress} numberOfLines={2}>
                                    {store.address}
                                    {store.city && store.state ? `, ${store.city} - ${store.state}` : ''}
                                    {store.zip ? ` - ${store.zip}` : ''}
                                </Text>
                            </View>
                        )}
                        
                        {store.phone && (
                            <View style={styles.storePhoneRow}>
                                <Ionicons name="call-outline" size={14} color={Colors.textMuted} />
                                <Text style={styles.storePhone}>{store.phone}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Products List */}
                {batches.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="cube-outline" size={64} color={Colors.textMuted} />
                        <Text style={styles.emptyText}>Nenhum produto disponível</Text>
                        <Text style={styles.emptySubtext}>
                            Esta loja ainda não possui produtos em promoção
                        </Text>
                    </View>
                ) : (
                    <View style={styles.productsContainer}>
                        <Text style={styles.productsTitle}>
                            {batches.length} produto(s) disponível(eis)
                        </Text>
                        <FlatList
                            data={batches}
                            renderItem={renderBatch}
                            keyExtractor={(item) => item.id}
                            numColumns={2}
                            columnWrapperStyle={styles.row}
                            contentContainerStyle={styles.productsList}
                            showsVerticalScrollIndicator={false}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
        flex: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    storeHeader: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 20,
        marginBottom: 20,
        backgroundColor: Colors.backgroundCard,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: Colors.glassBorder,
        marginHorizontal: 20,
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    storeLogo: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.glass,
        borderWidth: 4,
        borderColor: Colors.backgroundCard,
    },
    storeLogoPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    storeInfo: {
        flex: 1,
        justifyContent: 'center',
        gap: 10,
    },
    storeName: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 6,
    },
    storeTypeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    storeType: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    storeHoursRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    storeHours: {
        fontSize: 14,
        color: Colors.textMuted,
        fontWeight: '500',
    },
    storeAddressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
    },
    storeAddress: {
        fontSize: 13,
        color: Colors.textMuted,
        flex: 1,
        lineHeight: 18,
    },
    storePhoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    storePhone: {
        fontSize: 13,
        color: Colors.textMuted,
        fontWeight: '500',
    },
    productsContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    productsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 16,
    },
    productsList: {
        paddingBottom: 20,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    batchCard: {
        width: '48%',
        backgroundColor: Colors.backgroundCard,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: Colors.glassBorder,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 4,
    },
    batchImageContainer: {
        width: '100%',
        height: 160,
        backgroundColor: Colors.glass,
        position: 'relative',
        overflow: 'hidden',
    },
    batchImage: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.glass,
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.glass,
        alignItems: 'center',
        justifyContent: 'center',
    },
    discountBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: Colors.error,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        shadowColor: Colors.error,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 3,
        elevation: 5,
    },
    discountText: {
        fontSize: 12,
        fontWeight: '800',
        color: Colors.text,
        letterSpacing: 0.5,
    },
    stockBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
    },
    stockBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.warning,
    },
    batchInfo: {
        padding: 14,
    },
    batchCategory: {
        fontSize: 10,
        color: Colors.primary,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    batchName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 10,
        minHeight: 38,
        lineHeight: 20,
    },
    batchPriceRow: {
        marginBottom: 8,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    originalPrice: {
        fontSize: 11,
        color: Colors.textMuted,
        textDecorationLine: 'line-through',
    },
    batchPrice: {
        fontSize: 19,
        fontWeight: '700',
        color: Colors.success,
    },
    expirationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 6,
        paddingVertical: 4,
        paddingHorizontal: 6,
        backgroundColor: Colors.glass,
        borderRadius: 6,
    },
    expirationText: {
        fontSize: 11,
        color: Colors.warning,
        fontWeight: '600',
    },
    expirationTextUrgent: {
        color: Colors.error,
        fontWeight: '700',
    },
    stockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    stockText: {
        fontSize: 12,
        color: Colors.textMuted,
        fontWeight: '500',
    },
    stockTextEmpty: {
        color: Colors.error,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 48,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.textMuted,
        textAlign: 'center',
    },
    storesList: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    storeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: Colors.glassBorder,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        gap: 12,
    },
    storeCardLogo: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.glass,
    },
    storeCardInfo: {
        flex: 1,
        gap: 4,
    },
    storeCardName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    storeCardHoursRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    storeCardHours: {
        fontSize: 12,
        color: Colors.textMuted,
    },
    storeCardAddress: {
        fontSize: 11,
        color: Colors.textMuted,
        marginTop: 2,
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
        padding: 0, // Remove padding padrão
        margin: 0, // Remove margin padrão
    },
    filterButton: {
        padding: 4,
        marginLeft: 4,
        borderRadius: 8,
        backgroundColor: 'transparent',
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
    filterScroll: {
        maxHeight: 50,
    },
    filterChipsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 20,
        backgroundColor: Colors.glass,
        borderWidth: 1.5,
        borderColor: Colors.glassBorder,
    },
    filterChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    filterChipText: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    filterChipTextActive: {
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
    resultsText: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 12,
        paddingHorizontal: 20,
        fontWeight: '500',
    },
    loadingMoreContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadMoreText: {
        fontSize: 12,
        color: Colors.textMuted,
        fontWeight: '500',
    },
});
