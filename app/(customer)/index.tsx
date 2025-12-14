import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
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
import { api, Batch } from '../../services/api';
import { PRODUCT_CATEGORIES } from '../../utils/validation';

export default function VitrineScreen() {
    const { user, isProfileComplete } = useAuth();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
    
    // Filtros
    const [showFilters, setShowFilters] = useState(false);
    const [filterRadius, setFilterRadius] = useState<number | null>(null);
    const [filterMinPrice, setFilterMinPrice] = useState<string>('');
    const [filterMaxPrice, setFilterMaxPrice] = useState<string>('');
    const [filterMaxDaysToExpire, setFilterMaxDaysToExpire] = useState<number | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadBatches();
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

    const loadBatches = async () => {
        console.log('Loading batches...');
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

            // Add timeout to prevent infinite loading (aumentado para 15 segundos)
            const fetchPromise = api.getPublicBatches(params);
            const timeoutPromise = new Promise<Batch[]>((resolve) =>
                setTimeout(() => {
                    console.log('Batches fetch timeout após 15s');
                    resolve([]);
                }, 15000)
            );

            const data = await Promise.race([fetchPromise, timeoutPromise]);
            console.log('Batches loaded:', data.length);
            if (data.length > 0) {
                console.log('Primeiro batch sample:', JSON.stringify(data[0], null, 2));
            }
            setBatches(data);
            setImageErrors(new Set()); // Reset image errors on new load
        } catch (error) {
            console.error('Error loading batches:', error);
            setBatches([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
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
        loadBatches();
    };

    const handleAddToCart = async (batch: Batch) => {
        try {
            await api.addToCart(batch.id, 1);
            // Show feedback
        } catch (error) {
            console.error('Error adding to cart:', error);
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
        const discountPercent = item.discount_percent ?? item.desconto_percentual ?? 0;
        
        // Store name
        const storeName = item.store?.name || (item.store as any)?.nome || 'Loja';
        
        // Expiration date and days calculation
        const expirationDate = item.expiration_date || item.data_vencimento || null;
        let expirationDisplay = 'N/A';
        let daysToExpire: number | null = null;
        if (expirationDate) {
            const expDate = new Date(expirationDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            expDate.setHours(0, 0, 0, 0);
            const diffTime = expDate.getTime() - today.getTime();
            daysToExpire = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
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

        return (
            <TouchableOpacity
                style={styles.productCard}
                onPress={() => router.push(`/product/${item.id}`)}
                activeOpacity={0.9}
            >
                <View style={styles.productImageContainer}>
                    {imageUri ? (
                        <Image
                            source={{ uri: imageUri }}
                            style={styles.productImage}
                            resizeMode="cover"
                            onError={handleImageError}
                        />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Ionicons name="image-outline" size={48} color={Colors.textMuted} />
                            <Text style={styles.imagePlaceholderText}>Sem imagem</Text>
                        </View>
                    )}
                    
                    {/* Store logo - bolinha com logo do estabelecimento */}
                    {item.store?.logo_url && (
                        <View style={styles.storeLogoBadge}>
                            <Image
                                source={{ uri: item.store.logo_url }}
                                style={styles.storeLogoImage}
                                resizeMode="cover"
                            />
                        </View>
                    )}
                    
                    {/* Discount badge - porcentagem de desconto */}
                    {discountPercent > 0 && (
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>{Math.round(discountPercent)}% OFF</Text>
                        </View>
                    )}
                    
                    {/* Store name overlay na parte inferior */}
                    <View style={styles.storeNameOverlay}>
                        <Text style={styles.storeNameOverlayText} numberOfLines={1}>
                            {storeName}
                        </Text>
                    </View>
                    
                    {/* Stock indicator - apenas se estoque muito baixo */}
                    {(item.stock ?? item.estoque_total ?? 0) > 0 && (item.stock ?? item.estoque_total ?? 0) <= 2 && (
                        <View style={styles.stockBadge}>
                            <Text style={styles.stockText}>Últimas {item.stock ?? item.estoque_total ?? 0} un.</Text>
                        </View>
                    )}
                </View>

                <View style={styles.productInfo}>
                    {/* Product name - mais compacto (removido nome do mercado pois está na imagem) */}
                    <Text style={styles.productName} numberOfLines={2}>
                        {productName}
                    </Text>
                    
                    {/* Price row - mais compacto com desconto visível */}
                    <View style={styles.priceRow}>
                        <View style={styles.priceContainer}>
                            {originalPrice > promoPrice && (
                                <Text style={styles.originalPrice}>R$ {originalPrice.toFixed(2).replace('.', ',')}</Text>
                            )}
                            <Text style={styles.promoPrice}>R$ {promoPrice.toFixed(2).replace('.', ',')}</Text>
                        </View>
                        {discountPercent > 0 && (
                            <View style={styles.discountTag}>
                                <Text style={styles.discountTagText}>-{Math.round(discountPercent)}%</Text>
                            </View>
                        )}
                    </View>

                    {/* Expiration - mais compacto com dias */}
                    <View style={styles.expirationRow}>
                        <Ionicons 
                            name="time-outline" 
                            size={13} 
                            color={daysToExpire !== null && daysToExpire <= 2 ? Colors.error : Colors.warning} 
                        />
                        <Text style={[
                            styles.expirationText,
                            daysToExpire !== null && daysToExpire <= 2 && styles.expirationTextUrgent
                        ]}>
                            {expirationDisplay}
                        </Text>
                    </View>

                    {/* Add button - mais compacto */}
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleAddToCart(item);
                        }}
                    >
                        <Ionicons name="cart" size={14} color={Colors.text} />
                        <Text style={styles.addButtonText}>Adicionar</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    // Skeleton loader component
    const renderSkeletonCard = () => (
        <View style={styles.productCard}>
            <View style={[styles.productImageContainer, styles.skeleton]}>
                <ActivityIndicator size="small" color={Colors.primary} />
            </View>
            <View style={styles.productInfo}>
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
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                        <View style={styles.categoriesContainer}>
                            {[1, 2, 3, 4].map(i => (
                                <View key={i} style={[styles.skeleton, { width: 80, height: 36, borderRadius: 12, marginRight: 8 }]} />
                            ))}
                        </View>
                    </ScrollView>
                    
                    {/* Products skeleton grid */}
                    <View style={styles.productsContainer}>
                        <View style={styles.row}>
                            {renderSkeletonCard()}
                            {renderSkeletonCard()}
                        </View>
                        <View style={styles.row}>
                            {renderSkeletonCard()}
                            {renderSkeletonCard()}
                        </View>
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
                    <View>
                        <Text style={styles.greeting}>
                            Olá{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
                        </Text>
                        <Text style={styles.title}>Ofertas do dia</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.cartButton}
                        onPress={() => router.push('/(customer)/cart')}
                    >
                        <Ionicons name="cart-outline" size={24} color={Colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
                        <Ionicons name="search" size={20} color={Colors.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar produto ou loja..."
                            placeholderTextColor={Colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.filterButton}
                            onPress={() => setShowFilters(!showFilters)}
                        >
                            <Ionicons 
                                name="options-outline" 
                                size={20} 
                                color={showFilters || filterMinPrice || filterMaxPrice || filterMaxDaysToExpire ? Colors.primary : Colors.textMuted} 
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

                {/* Categories */}
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

                {/* Products Grid */}
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
                    <FlatList
                        data={filteredBatches}
                        renderItem={renderBatch}
                        keyExtractor={(item) => item.id}
                        numColumns={2}
                        columnWrapperStyle={styles.row}
                        contentContainerStyle={styles.productsContainer}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={Colors.primary}
                            />
                        }
                        ListHeaderComponent={
                            searchQuery ? (
                                <Text style={styles.searchResultsText}>
                                    {filteredBatches.length} resultado(s) para "{searchQuery}"
                                </Text>
                            ) : null
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
        gap: 16,
    },
    loadingText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    greeting: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
    },
    cartButton: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        alignItems: 'center',
        justifyContent: 'center',
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
    categoriesScroll: {
        maxHeight: 50,
        flexGrow: 0,
    },
    categoriesContainer: {
        paddingHorizontal: 24,
        paddingVertical: 4,
        gap: 8,
        flexDirection: 'row',
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        marginRight: 8,
    },
    categoryChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    categoryText: {
        fontSize: 13,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    categoryTextActive: {
        color: Colors.text,
        fontWeight: '600',
    },
    filterButton: {
        padding: 8,
        marginLeft: 8,
    },
    filtersContainer: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
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
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    daysChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    daysChipText: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    daysChipTextActive: {
        color: Colors.text,
        fontWeight: '600',
    },
    radiusFilterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    radiusChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    radiusChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    radiusChipText: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    radiusChipTextActive: {
        color: Colors.text,
        fontWeight: '600',
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
    productsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    row: {
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    productCard: {
        width: '48%',
        backgroundColor: Colors.backgroundCard,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        overflow: 'hidden',
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    productImageContainer: {
        aspectRatio: 1,
        backgroundColor: Colors.glass,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 14,
    },
    productImage: {
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
    productInfo: {
        padding: 10,
        flex: 1,
    },
    storeName: {
        fontSize: 10,
        color: Colors.textMuted,
        marginBottom: 4,
        fontWeight: '500',
    },
    productName: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
        minHeight: 32,
        lineHeight: 16,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
        flex: 1,
    },
    originalPrice: {
        fontSize: 11,
        color: Colors.textMuted,
        textDecorationLine: 'line-through',
    },
    promoPrice: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.success,
    },
    discountTag: {
        backgroundColor: Colors.error + '20',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    discountTagText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.error,
    },
    expirationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    expirationText: {
        fontSize: 11,
        color: Colors.warning,
        fontWeight: '500',
    },
    expirationTextUrgent: {
        color: Colors.error,
        fontWeight: '600',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        borderRadius: 8,
        paddingVertical: 8,
        gap: 5,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    addButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.text,
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
        paddingHorizontal: 24,
        marginBottom: 12,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 10,
    },
    searchBarFocused: {
        borderColor: Colors.primary,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: Colors.text,
    },
    searchResultsText: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 12,
        paddingHorizontal: 8,
    },
});
