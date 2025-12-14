import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    Image,
    Modal,
    Switch,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { GradientBackground } from '../../components/GradientBackground';
import { SelectInput } from '../../components/SelectInput';
import { Colors } from '../../constants/Colors';
import {
    validateRequired,
    validateMinLength,
    validateMaxLength,
    validateFutureDate,
    sanitizeText,
    PRODUCT_CATEGORIES,
} from '../../utils/validation';
import { api, Store } from '../../services/api';
import { uploadProductImage } from '../../services/storage';

interface FormErrors {
    name?: string;
    category?: string;
    originalPrice?: string;
    promoPrice?: string;
    expirationDate?: string;
    stock?: string;
    photo1?: string;
    photo2?: string;
}

export default function CreateProductScreen() {
    // Check for edit mode params
    const params = useLocalSearchParams<{
        editBatchId?: string;
        editProductId?: string;
        storeId?: string;
    }>();

    const isEditMode = !!params.editProductId;
    const editProductId = params.editProductId;
    const editBatchId = params.editBatchId;

    const [loading, setLoading] = useState(false);
    const [loadingStores, setLoadingStores] = useState(true);
    const [loadingEditData, setLoadingEditData] = useState(isEditMode);
    const [errors, setErrors] = useState<FormErrors>({});
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStore, setSelectedStore] = useState<string | null>(params.storeId || null);

    // Form fields
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [originalPrice, setOriginalPrice] = useState('');
    const [promoPrice, setPromoPrice] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [stock, setStock] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [photo1, setPhoto1] = useState<string | null>(null);
    const [photo2, setPhoto2] = useState<string | null>(null);

    // Track if photos are new (local) or existing (URLs)
    const [photo1IsNew, setPhoto1IsNew] = useState(false);
    const [photo2IsNew, setPhoto2IsNew] = useState(false);

    // Reset form when screen focuses (for new product mode)
    const resetForm = () => {
        setName('');
        setDescription('');
        setCategory('');
        setOriginalPrice('');
        setPromoPrice('');
        setExpirationDate('');
        setSelectedDate(null);
        setStock('');
        setIsActive(true);
        setPhoto1(null);
        setPhoto2(null);
        setPhoto1IsNew(false);
        setPhoto2IsNew(false);
        setErrors({});
    };

    // Use useFocusEffect to handle screen focus
    useFocusEffect(
        React.useCallback(() => {
            // Only reset form if NOT in edit mode
            if (!isEditMode) {
                resetForm();
            }
        }, [isEditMode])
    );

    useEffect(() => {
        loadStores();
        if (isEditMode) {
            loadExistingData();
        }
    }, []);

    const loadExistingData = async () => {
        if (!editProductId || !editBatchId) return;

        try {
            console.log('Loading existing product data...');
            // We need to get batch data which includes product info
            const batches = await api.getStoreBatches(params.storeId!);
            const batch = batches.find((b: any) => b.id === editBatchId);

            if (batch) {
                const product = (batch as any).products || batch.product;

                // Fill in product data
                setName(product?.nome || product?.name || '');
                setDescription(product?.descricao || product?.description || '');
                setCategory(product?.categoria || product?.category || '');

                // Prices
                const origPrice = batch.preco_normal_override || product?.preco_normal || 0;
                const promPrice = batch.preco_promocional || batch.promo_price || 0;
                setOriginalPrice(origPrice.toFixed(2).replace('.', ','));
                setPromoPrice(promPrice.toFixed(2).replace('.', ','));

                // Date
                const expDate = batch.data_vencimento || batch.expiration_date;
                if (expDate) {
                    const date = new Date(expDate);
                    setSelectedDate(date);
                    setExpirationDate(formatDisplayDate(date));
                }

                // Stock
                setStock(String(batch.estoque_total || batch.stock || 0));

                // Active
                setIsActive(batch.active ?? batch.is_active ?? true);

                // Photos (these are URLs, not local files)
                if (product?.foto1) {
                    setPhoto1(product.foto1);
                    setPhoto1IsNew(false);
                }
                if (product?.foto2) {
                    setPhoto2(product.foto2);
                    setPhoto2IsNew(false);
                }

                console.log('Product data loaded for editing');
            }
        } catch (error) {
            console.error('Error loading product data:', error);
            Alert.alert('Erro', 'Não foi possível carregar os dados do produto.');
        } finally {
            setLoadingEditData(false);
        }
    };

    const formatDisplayDate = (date: Date): string => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const loadStores = async () => {
        console.log('Loading stores for product creation...');
        try {
            // Add timeout to prevent infinite loading
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 10000)
            );

            const storesData = await Promise.race([
                api.getMyStores(),
                timeoutPromise
            ]);

            console.log('Stores loaded:', storesData?.length ?? 0);
            setStores(storesData || []);

            if (storesData && storesData.length > 0) {
                setSelectedStore(storesData[0].id);
            }
        } catch (error: any) {
            console.error('Error loading stores:', error);
            Alert.alert(
                'Erro ao Carregar',
                'Não foi possível carregar suas lojas. Verifique sua conexão.',
                [{ text: 'Tentar Novamente', onPress: loadStores }]
            );
        } finally {
            setLoadingStores(false);
        }
    };

    const calculateDiscount = (): number => {
        const orig = parseFloat(originalPrice.replace(',', '.'));
        const promo = parseFloat(promoPrice.replace(',', '.'));
        if (orig > 0 && promo > 0 && promo < orig) {
            return Math.round(((orig - promo) / orig) * 100);
        }
        return 0;
    };

    // Formato brasileiro: R$ 9,99 - coloca vírgula automaticamente
    const formatPrice = (value: string): string => {
        // Remove tudo que não é número
        const numbers = value.replace(/\D/g, '');
        if (!numbers) return '';

        // Converte para centavos e formata
        const cents = parseInt(numbers, 10);
        const reais = cents / 100;

        // Formata com 2 casas decimais e vírgula
        return reais.toFixed(2).replace('.', ',');
    };

    const formatDate = (value: string): string => {
        const cleaned = value.replace(/\D/g, '').slice(0, 8);
        if (cleaned.length >= 5) {
            return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
        } else if (cleaned.length >= 3) {
            return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
        }
        return cleaned;
    };

    const parseDate = (dateStr: string): string => {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return '';
    };

    // Gera os próximos 30 dias para o date picker
    const getNextDays = (): Date[] => {
        const days: Date[] = [];
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            days.push(date);
        }
        return days;
    };

    // getNextDays is the only unique function here - formatDisplayDate is defined above

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        setExpirationDate(formatDisplayDate(date));
        setShowDatePicker(false);
    };

    const pickImage = async (slot: 1 | 2) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            if (slot === 1) {
                setPhoto1(result.assets[0].uri);
                setPhoto1IsNew(true);
            } else {
                setPhoto2(result.assets[0].uri);
                setPhoto2IsNew(true);
            }
        }
    };

    const takePhoto = async (slot: 1 | 2) => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permissão necessária', 'Precisamos da permissão da câmera para tirar fotos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            if (slot === 1) {
                setPhoto1(result.assets[0].uri);
                setPhoto1IsNew(true);
            } else {
                setPhoto2(result.assets[0].uri);
                setPhoto2IsNew(true);
            }
        }
    };

    const showImageOptions = (slot: 1 | 2) => {
        Alert.alert(
            slot === 1 ? 'Foto do Produto' : 'Foto da Validade',
            'Escolha uma opção',
            [
                { text: 'Câmera', onPress: () => takePhoto(slot) },
                { text: 'Galeria', onPress: () => pickImage(slot) },
                { text: 'Cancelar', style: 'cancel' },
            ]
        );
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!validateRequired(name)) {
            newErrors.name = 'Nome é obrigatório';
        } else if (!validateMinLength(name, 3)) {
            newErrors.name = 'Mínimo 3 caracteres';
        } else if (!validateMaxLength(name, 80)) {
            newErrors.name = 'Máximo 80 caracteres';
        }

        if (!validateRequired(category)) {
            newErrors.category = 'Categoria é obrigatória';
        }

        const origPrice = parseFloat(originalPrice.replace(',', '.'));
        if (!validateRequired(originalPrice)) {
            newErrors.originalPrice = 'Preço original é obrigatório';
        } else if (isNaN(origPrice) || origPrice <= 0) {
            newErrors.originalPrice = 'Preço inválido';
        }

        const promPrice = parseFloat(promoPrice.replace(',', '.'));
        if (!validateRequired(promoPrice)) {
            newErrors.promoPrice = 'Preço promocional é obrigatório';
        } else if (isNaN(promPrice) || promPrice <= 0) {
            newErrors.promoPrice = 'Preço inválido';
        } else if (promPrice >= origPrice) {
            newErrors.promoPrice = 'Deve ser menor que o original';
        }

        if (!validateRequired(expirationDate)) {
            newErrors.expirationDate = 'Data de validade é obrigatória';
        } else {
            const isoDate = parseDate(expirationDate);
            if (!isoDate || !validateFutureDate(isoDate)) {
                newErrors.expirationDate = 'Data não pode ser anterior a hoje';
            }
        }

        const stockNum = parseInt(stock);
        if (!validateRequired(stock)) {
            newErrors.stock = 'Estoque é obrigatório';
        } else if (isNaN(stockNum) || stockNum < 1) {
            newErrors.stock = 'Mínimo 1 unidade';
        }

        if (!photo1) {
            // Only require photo in create mode, not edit mode
            if (!isEditMode) {
                newErrors.photo1 = 'Foto do produto é obrigatória';
            }
        }
        if (!photo2) {
            if (!isEditMode) {
                newErrors.photo2 = 'Foto da validade é obrigatória';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!selectedStore) {
            Alert.alert('Erro', 'Selecione uma loja primeiro.');
            return;
        }

        if (!validateForm()) {
            Alert.alert('Erro', 'Por favor, corrija os campos destacados.');
            return;
        }

        setLoading(true);
        console.log(isEditMode ? 'Updating product...' : 'Creating product...');

        try {
            const origPrice = parseFloat(originalPrice.replace(',', '.'));
            const promPrice = parseFloat(promoPrice.replace(',', '.'));
            const discountPercent = calculateDiscount();
            const isoDate = parseDate(expirationDate);

            let productId = editProductId;

            if (isEditMode && editProductId) {
                // UPDATE MODE - Use PUT to update existing product
                console.log('Updating existing product:', editProductId);

                // Upload new photos if changed
                let photo1Url: string | undefined;
                let photo2Url: string | undefined;

                if (photo1 && photo1IsNew) {
                    console.log('Uploading new photo 1...');
                    try {
                        photo1Url = await uploadProductImage(photo1, editProductId, 1);
                        console.log('Photo 1 uploaded:', photo1Url);
                    } catch (uploadError) {
                        console.error('Photo 1 upload failed:', uploadError);
                    }
                }

                if (photo2 && photo2IsNew) {
                    console.log('Uploading new photo 2...');
                    try {
                        photo2Url = await uploadProductImage(photo2, editProductId, 2);
                        console.log('Photo 2 uploaded:', photo2Url);
                    } catch (uploadError) {
                        console.error('Photo 2 upload failed:', uploadError);
                    }
                }

                // Update product with all data
                await api.updateProduct(editProductId, {
                    name: sanitizeText(name),
                    description: sanitizeText(description),
                    category,
                    original_price: origPrice,
                    is_active: isActive,
                    ...(photo1Url && { photo1: photo1Url }),
                    ...(photo2Url && { photo2: photo2Url }),
                });
                console.log('Product updated successfully');

                // Update the batch
                if (editBatchId) {
                    await api.updateBatch(editBatchId, {
                        preco_promocional: promPrice,
                        data_vencimento: isoDate,
                        estoque_total: parseInt(stock),
                        status: isActive ? 'active' : 'inactive',
                    });
                    console.log('Batch updated successfully');
                }

                Alert.alert(
                    '✅ Produto Atualizado!',
                    `${name} foi atualizado com sucesso.`,
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            } else {
                // CREATE MODE - Original logic
                const product = await api.createProduct(selectedStore, {
                    name: sanitizeText(name),
                    description: sanitizeText(description),
                    category,
                    original_price: origPrice,
                    is_active: isActive,
                });

                console.log('Product created:', product.id);
                productId = product.id;

                // Upload photos
                let photo1Url: string | undefined;
                let photo2Url: string | undefined;

                if (photo1) {
                    console.log('Uploading photo 1...');
                    try {
                        photo1Url = await uploadProductImage(photo1, product.id, 1);
                        console.log('Photo 1 uploaded:', photo1Url);
                    } catch (uploadError) {
                        console.error('Photo 1 upload failed:', uploadError);
                    }
                }

                if (photo2) {
                    console.log('Uploading photo 2...');
                    try {
                        photo2Url = await uploadProductImage(photo2, product.id, 2);
                        console.log('Photo 2 uploaded:', photo2Url);
                    } catch (uploadError) {
                        console.error('Photo 2 upload failed:', uploadError);
                    }
                }

                // Update product with photo URLs
                if (photo1Url || photo2Url) {
                    await api.updateProduct(product.id, {
                        photo1: photo1Url,
                        photo2: photo2Url,
                    });
                    console.log('Product updated with photo URLs');
                }

                // Create the batch with pricing
                await api.createBatch(selectedStore, {
                    product_id: product.id,
                    original_price: origPrice,
                    promo_price: promPrice,
                    discount_percent: discountPercent,
                    expiration_date: isoDate,
                    stock: parseInt(stock),
                    is_active: isActive,
                });

                console.log('Batch created successfully');

                Alert.alert(
                    '✅ Produto Cadastrado!',
                    `${name} foi adicionado com ${discountPercent}% de desconto.`,
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            }
        } catch (error: any) {
            console.error('Error saving product:', error);
            Alert.alert('Erro', error.message || 'Não foi possível salvar o produto. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (loadingStores || loadingEditData) {
        return (
            <GradientBackground>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={{ color: Colors.textSecondary, marginTop: 12 }}>
                        {loadingEditData ? 'Carregando produto...' : 'Carregando lojas...'}
                    </Text>
                </View>
            </GradientBackground>
        );
    }

    if (stores.length === 0) {
        return (
            <GradientBackground>
                <View style={styles.noStoreContainer}>
                    <Ionicons name="storefront-outline" size={64} color={Colors.textMuted} />
                    <Text style={styles.noStoreTitle}>Cadastre uma loja primeiro</Text>
                    <Text style={styles.noStoreText}>
                        Você precisa ter uma loja para adicionar produtos
                    </Text>
                    <TouchableOpacity
                        style={styles.createStoreButton}
                        onPress={() => router.replace('/(merchant)/create-store')}
                    >
                        <Text style={styles.createStoreButtonText}>Criar Loja</Text>
                    </TouchableOpacity>
                </View>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{isEditMode ? 'Editar Produto' : 'Novo Produto'}</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    style={styles.form}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Store Selector */}
                    {stores.length > 1 && (
                        <SelectInput
                            label="Loja"
                            value={selectedStore || ''}
                            options={stores.map(s => ({ value: s.id, label: s.name }))}
                            onSelect={setSelectedStore}
                            placeholder="Selecione a loja..."
                            required
                        />
                    )}

                    {/* Photos */}
                    <Text style={styles.sectionTitle}>
                        Fotos {isEditMode ? '(toque para alterar)' : '(obrigatórias)'}
                    </Text>

                    <View style={styles.photosRow}>
                        <TouchableOpacity
                            style={[styles.photoBox, errors.photo1 && styles.photoBoxError]}
                            onPress={() => showImageOptions(1)}
                        >
                            {photo1 ? (
                                <Image source={{ uri: photo1 }} style={styles.photoImage} />
                            ) : (
                                <>
                                    <Ionicons name="camera" size={32} color={Colors.textMuted} />
                                    <Text style={styles.photoLabel}>Foto do Produto</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.photoBox, errors.photo2 && styles.photoBoxError]}
                            onPress={() => showImageOptions(2)}
                        >
                            {photo2 ? (
                                <Image source={{ uri: photo2 }} style={styles.photoImage} />
                            ) : (
                                <>
                                    <Ionicons name="calendar" size={32} color={Colors.textMuted} />
                                    <Text style={styles.photoLabel}>Foto da Validade</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                    {(errors.photo1 || errors.photo2) && (
                        <Text style={styles.errorText}>As duas fotos são obrigatórias</Text>
                    )}

                    {/* Basic Info */}
                    <Text style={styles.sectionTitle}>Informações do Produto</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Nome do Produto <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            value={name}
                            onChangeText={(v) => setName(v.slice(0, 80))}
                            placeholder="Ex: Leite Integral 1L"
                            placeholderTextColor={Colors.textMuted}
                            maxLength={80}
                        />
                        <Text style={styles.charCount}>{name.length}/80</Text>
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Descrição (opcional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={description}
                            onChangeText={(v) => setDescription(v.slice(0, 200))}
                            placeholder="Breve descrição do produto..."
                            placeholderTextColor={Colors.textMuted}
                            maxLength={200}
                            multiline
                            numberOfLines={3}
                        />
                        <Text style={styles.charCount}>{description.length}/200</Text>
                    </View>

                    <SelectInput
                        label="Categoria"
                        value={category}
                        options={PRODUCT_CATEGORIES}
                        onSelect={setCategory}
                        placeholder="Selecione a categoria..."
                        error={errors.category}
                        required
                    />

                    {/* Pricing */}
                    <Text style={styles.sectionTitle}>Preços</Text>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>
                                Preço Original <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={styles.priceInputContainer}>
                                <Text style={styles.currencyLabel}>R$</Text>
                                <TextInput
                                    style={[styles.input, styles.priceInput, errors.originalPrice && styles.inputError]}
                                    value={originalPrice}
                                    onChangeText={(v) => setOriginalPrice(formatPrice(v))}
                                    placeholder="0,00"
                                    placeholderTextColor={Colors.textMuted}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                            {errors.originalPrice && <Text style={styles.errorText}>{errors.originalPrice}</Text>}
                        </View>

                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>
                                Preço Promo <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={styles.priceInputContainer}>
                                <Text style={styles.currencyLabel}>R$</Text>
                                <TextInput
                                    style={[styles.input, styles.priceInput, errors.promoPrice && styles.inputError]}
                                    value={promoPrice}
                                    onChangeText={(v) => setPromoPrice(formatPrice(v))}
                                    placeholder="0,00"
                                    placeholderTextColor={Colors.textMuted}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                            {errors.promoPrice && <Text style={styles.errorText}>{errors.promoPrice}</Text>}
                        </View>
                    </View>

                    {calculateDiscount() > 0 && (
                        <View style={styles.discountBadge}>
                            <Ionicons name="pricetag" size={18} color={Colors.success} />
                            <Text style={styles.discountText}>
                                Desconto de {calculateDiscount()}%
                            </Text>
                        </View>
                    )}

                    {/* Expiration & Stock */}
                    <Text style={styles.sectionTitle}>Validade e Estoque</Text>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>
                                Data de Validade <Text style={styles.required}>*</Text>
                            </Text>
                            <TouchableOpacity
                                style={[styles.input, styles.dateInput, errors.expirationDate && styles.inputError]}
                                onPress={() => setShowDatePicker(true)}
                                activeOpacity={0.7}
                            >
                                <Text style={expirationDate ? styles.dateText : styles.datePlaceholder}>
                                    {expirationDate || 'Selecionar data'}
                                </Text>
                                <Ionicons name="calendar-outline" size={20} color={Colors.textMuted} />
                            </TouchableOpacity>
                            {errors.expirationDate && <Text style={styles.errorText}>{errors.expirationDate}</Text>}
                        </View>

                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>
                                Estoque <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={[styles.input, errors.stock && styles.inputError]}
                                value={stock}
                                onChangeText={(v) => setStock(v.replace(/\D/g, ''))}
                                placeholder="Unidades"
                                placeholderTextColor={Colors.textMuted}
                                keyboardType="number-pad"
                            />
                            {errors.stock && <Text style={styles.errorText}>{errors.stock}</Text>}
                        </View>
                    </View>

                    {/* Active Toggle */}
                    <View style={styles.switchRow}>
                        <View style={styles.switchLabel}>
                            <Ionicons name="toggle" size={20} color={Colors.primary} />
                            <Text style={styles.switchLabelText}>Produto Ativo</Text>
                        </View>
                        <Switch
                            value={isActive}
                            onValueChange={setIsActive}
                            trackColor={{ false: Colors.glass, true: Colors.primary }}
                            thumbColor={isActive ? Colors.text : Colors.textMuted}
                        />
                    </View>
                    <Text style={styles.switchHint}>
                        {isActive
                            ? 'O produto ficará visível para os clientes'
                            : 'O produto ficará oculto até ser ativado'}
                    </Text>

                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={18} color={Colors.warning} />
                        <Text style={styles.infoText}>
                            A data de validade não pode ser anterior a hoje e os clientes terão 2h para retirar após o pagamento.
                        </Text>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.8}
                        style={styles.submitButton}
                    >
                        <LinearGradient
                            colors={[Colors.primary, Colors.primaryDark]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.submitGradient}
                        >
                            {loading ? (
                                <ActivityIndicator color={Colors.text} />
                            ) : (
                                <>
                                    <Ionicons name="add-circle" size={20} color={Colors.text} />
                                    <Text style={styles.submitText}>Cadastrar Produto</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Date Picker Modal */}
            <Modal
                visible={showDatePicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDatePicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowDatePicker(false)}
                >
                    <View style={styles.datePickerContainer}>
                        <View style={styles.datePickerHeader}>
                            <Text style={styles.datePickerTitle}>Selecione a Data de Validade</Text>
                            <TouchableOpacity
                                style={styles.datePickerClose}
                                onPress={() => setShowDatePicker(false)}
                            >
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            <View style={styles.dateGrid}>
                                {getNextDays().map((date, index) => {
                                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                                    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                                    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

                                    return (
                                        <View key={index} style={styles.dateItem}>
                                            <TouchableOpacity
                                                style={[styles.dateItemButton, isSelected && styles.dateItemSelected]}
                                                onPress={() => handleDateSelect(date)}
                                            >
                                                <Text style={styles.dateItemDay}>{date.getDate()}</Text>
                                                <Text style={styles.dateItemMonth}>{months[date.getMonth()]}</Text>
                                                <Text style={styles.dateItemWeekday}>{weekdays[date.getDay()]}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </GradientBackground >
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
    },
    noStoreContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 48,
    },
    noStoreTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.text,
        marginTop: 24,
        marginBottom: 8,
    },
    noStoreText: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    createStoreButton: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        backgroundColor: Colors.secondary,
    },
    createStoreButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
    },
    form: {
        flex: 1,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginTop: 24,
        marginBottom: 16,
    },
    photosRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    photoBox: {
        flex: 1,
        aspectRatio: 1,
        backgroundColor: Colors.glass,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: Colors.glassBorder,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    photoBoxError: {
        borderColor: Colors.error,
    },
    photoImage: {
        width: '100%',
        height: '100%',
    },
    photoLabel: {
        fontSize: 12,
        color: Colors.textMuted,
        marginTop: 8,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    required: {
        color: Colors.error,
    },
    input: {
        backgroundColor: Colors.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: Colors.text,
    },
    inputError: {
        borderColor: Colors.error,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 11,
        color: Colors.textMuted,
        textAlign: 'right',
        marginTop: 4,
    },
    errorText: {
        fontSize: 12,
        color: Colors.error,
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
    },
    priceInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currencyLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginRight: 8,
    },
    priceInput: {
        flex: 1,
    },
    discountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.success + '15',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        gap: 8,
    },
    discountText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.success,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.warning + '15',
        borderRadius: 12,
        padding: 12,
        marginBottom: 24,
        gap: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: Colors.warning,
        lineHeight: 18,
    },
    submitButton: {
        marginTop: 8,
        borderRadius: 14,
        overflow: 'hidden',
    },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    submitText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    dateInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateText: {
        fontSize: 15,
        color: Colors.text,
    },
    datePlaceholder: {
        fontSize: 15,
        color: Colors.textMuted,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    datePickerContainer: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingBottom: 40,
        maxHeight: '60%',
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    datePickerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    datePickerClose: {
        padding: 8,
    },
    dateGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
    },
    dateItem: {
        width: '25%',
        padding: 8,
    },
    dateItemButton: {
        backgroundColor: Colors.glass,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    dateItemSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    dateItemDay: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    dateItemMonth: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    dateItemWeekday: {
        fontSize: 10,
        color: Colors.textMuted,
        marginTop: 2,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.glass,
        borderRadius: 14,
        padding: 16,
        marginTop: 16,
    },
    switchLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    switchLabelText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    switchHint: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 8,
        marginBottom: 16,
    },
});
