import { GradientBackground } from '@/components/GradientBackground';
import { SelectInput } from '@/components/SelectInput';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { api } from '@/services/api';
import { uploadStoreProfile } from '@/services/storage';
import {
    calculatePickupDeadline,
    fetchAddressByCEP,
    formatCEP,
    formatCNPJ,
    formatPhone,
    formatTime,
    sanitizeText,
    STORE_TYPES,
    validateCEP,
    validateCNPJ,
    validateMaxLength,
    validateMinLength,
    validatePhone,
    validateRequired,
    validateTime,
    validateUUID,
} from '@/utils/validation';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface FormErrors {
    logo?: string;
    name?: string;
    cnpj?: string;
    type?: string;
    cep?: string;
    address?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    phone?: string;
    openTime?: string;
    closeTime?: string;
    asaasWalletId?: string;
}

export default function CreateStoreScreen() {
    const params = useLocalSearchParams<{ pendingRole?: string; editStoreId?: string }>();
    const isEditMode = !!params.editStoreId;
    const editStoreId = params.editStoreId;
    const pendingRole = params.pendingRole;

    const [loading, setLoading] = useState(false);
    const [loadingStore, setLoadingStore] = useState(isEditMode);
    const [loadingCEP, setLoadingCEP] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [logoIsNew, setLogoIsNew] = useState(false);

    // Form fields
    const [name, setName] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [type, setType] = useState('');
    const [cep, setCep] = useState('');
    const [address, setAddress] = useState('');
    const [number, setNumber] = useState('');
    const [complement, setComplement] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [phone, setPhone] = useState('');
    const [openTime, setOpenTime] = useState('');
    const [closeTime, setCloseTime] = useState('');
    const [logoUri, setLogoUri] = useState<string | null>(null);
    const [asaasWalletId, setAsaasWalletId] = useState('');

    useEffect(() => {
        if (isEditMode && editStoreId) {
            loadExistingData();
        } else {
            setLoadingStore(false);
        }
    }, [isEditMode, editStoreId]);

    const loadExistingData = async () => {
        if (!editStoreId) return;

        try {
            console.log('Loading store data for edit...');
            const store = await api.getStore(editStoreId);
            console.log('Store loaded:', store);

            // Map PT-BR fields from backend
            const storeName = (store as any).nome || store.name || '';
            const storeType = (store as any).tipo || store.type || '';
            const storePhone = (store as any).telefone || store.phone || '';
            const storeHours = (store as any).horario_funcionamento || store.hours || '';
            const storeCep = (store as any).cep || store.zip || '';
            const storeAddress = (store as any).endereco || store.address || '';
            const storeCity = (store as any).cidade || store.city || '';
            const storeState = (store as any).estado || store.state || '';
            const storeLogo = store.logo_url || null;
            const storeAsaasWalletId = (store as any).asaas_wallet_id || '';

            setName(storeName);
            setCnpj(formatCNPJ(store.cnpj || ''));
            setType(storeType);
            setPhone(formatPhone(storePhone));
            setCep(formatCEP(storeCep));
            setCity(storeCity);
            setState(storeState);
            setAsaasWalletId(storeAsaasWalletId);

            // Parse address (format: "Rua, Numero - Complemento, Bairro")
            if (storeAddress) {
                const parts = storeAddress.split(',');
                if (parts.length >= 1) setAddress(parts[0].trim());
                if (parts.length >= 2) {
                    const numParts = parts[1].trim().split(' - ');
                    if (numParts.length >= 1) setNumber(numParts[0].trim());
                    if (numParts.length >= 2) setComplement(numParts[1].trim());
                }
                if (parts.length >= 3) setNeighborhood(parts[2].trim());
            }

            // Parse hours (format: "08:00 às 22:00")
            if (storeHours) {
                const hoursParts = storeHours.split(' às ');
                if (hoursParts.length >= 1) setOpenTime(hoursParts[0].trim());
                if (hoursParts.length >= 2) setCloseTime(hoursParts[1].trim());
            }

            if (storeLogo) {
                setLogoUri(storeLogo);
                setLogoIsNew(false);
            }
        } catch (error) {
            console.error('Error loading store:', error);
            Alert.alert('Erro', 'Não foi possível carregar os dados da loja.');
        } finally {
            setLoadingStore(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para selecionar a foto.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setLogoUri(result.assets[0].uri);
            setLogoIsNew(true);
        }
    };

    const handleCEPChange = async (value: string) => {
        const formatted = formatCEP(value);
        setCep(formatted);

        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length === 8) {
            setLoadingCEP(true);
            const addressData = await fetchAddressByCEP(cleaned);
            setLoadingCEP(false);

            if (addressData) {
                setAddress(addressData.logradouro);
                setNeighborhood(addressData.bairro);
                setCity(addressData.localidade);
                setState(addressData.uf);
                setErrors(prev => ({ ...prev, cep: undefined }));
            } else {
                setErrors(prev => ({ ...prev, cep: 'CEP não encontrado' }));
            }
        }
    };

    // Helper para validar horário real (00:00 a 23:59)
    const isValidRealTime = (time: string): boolean => {
        if (!validateTime(time)) return false;
        const [hours, minutes] = time.split(':').map(Number);
        return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
    };

    // Helper para comparar horários (retorna true se time1 < time2)
    const isTimeBefore = (time1: string, time2: string): boolean => {
        const [h1, m1] = time1.split(':').map(Number);
        const [h2, m2] = time2.split(':').map(Number);
        return h1 * 60 + m1 < h2 * 60 + m2;
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        // Logo is optional until Storage is configured
        // if (!logoUri) {
        //     newErrors.logo = 'Foto da loja é obrigatória';
        // }

        if (!validateRequired(name)) {
            newErrors.name = 'Nome é obrigatório';
        } else if (!validateMinLength(name, 3)) {
            newErrors.name = 'Mínimo 3 caracteres';
        } else if (!validateMaxLength(name, 50)) {
            newErrors.name = 'Máximo 50 caracteres';
        }

        if (!validateRequired(cnpj)) {
            newErrors.cnpj = 'CNPJ é obrigatório';
        } else if (!validateCNPJ(cnpj)) {
            newErrors.cnpj = 'CNPJ inválido';
        }

        if (!validateRequired(type)) {
            newErrors.type = 'Tipo é obrigatório';
        }

        if (!validateRequired(cep)) {
            newErrors.cep = 'CEP é obrigatório';
        } else if (!validateCEP(cep)) {
            newErrors.cep = 'CEP inválido';
        }

        if (!validateRequired(address)) {
            newErrors.address = 'Endereço é obrigatório';
        }

        if (!validateRequired(number)) {
            newErrors.number = 'Número é obrigatório';
        }

        if (!validateRequired(neighborhood)) {
            newErrors.neighborhood = 'Bairro é obrigatório';
        }

        if (!validateRequired(city)) {
            newErrors.city = 'Cidade é obrigatória';
        }

        if (!validateRequired(state)) {
            newErrors.state = 'Estado é obrigatório';
        }

        if (!validateRequired(phone)) {
            newErrors.phone = 'Telefone é obrigatório';
        } else if (!validatePhone(phone)) {
            newErrors.phone = 'Telefone inválido';
        }

        if (!validateRequired(openTime)) {
            newErrors.openTime = 'Horário de abertura é obrigatório';
        } else if (!isValidRealTime(openTime)) {
            newErrors.openTime = 'Horário inválido (00:00 a 23:59)';
        }

        if (!validateRequired(closeTime)) {
            newErrors.closeTime = 'Horário de fechamento é obrigatório';
        } else if (!isValidRealTime(closeTime)) {
            newErrors.closeTime = 'Horário inválido (00:00 a 23:59)';
        } else if (openTime && isValidRealTime(openTime) && !isTimeBefore(openTime, closeTime)) {
            newErrors.closeTime = 'Fechamento deve ser após abertura';
        }

        // Validar Wallet ID Asaas (opcional, mas se preenchido deve ser UUID válido)
        // Wallet ID é obrigatório
        if (!validateRequired(asaasWalletId)) {
            newErrors.asaasWalletId = 'Wallet ID é obrigatório para receber pagamentos';
        } else if (!validateUUID(asaasWalletId)) {
            newErrors.asaasWalletId = 'Wallet ID deve ser um UUID válido (ex: 26fde169-838b-4c15-aed9-9ab39701a4c4)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            Alert.alert('Erro', 'Por favor, corrija os campos destacados.');
            return;
        }

        setLoading(true);
        console.log(isEditMode ? 'Updating store...' : 'Creating store...');

        try {
            const fullAddress = `${address}, ${number}${complement ? ` - ${complement}` : ''}, ${neighborhood}`;
            const hours = `${openTime} às ${closeTime}`;
            const pickupDeadline = calculatePickupDeadline(closeTime);

            if (isEditMode && editStoreId) {
                // UPDATE MODE - Enviar apenas campos que podem ser atualizados
                // O backend mapeia de inglês (DTO) para português (banco)
                console.log('Calling API to update store...');

                // Upload new logo if changed
                let uploadedLogoUrl: string | undefined;
                if (logoUri && logoIsNew) {
                    console.log('Uploading new store logo...');
                    try {
                        uploadedLogoUrl = await uploadStoreProfile(logoUri, editStoreId);
                        console.log('Logo uploaded:', uploadedLogoUrl);
                    } catch (uploadError: any) {
                        console.error('Logo upload failed:', uploadError);
                    }
                }

                // Para update, enviar apenas campos que mudaram e são permitidos
                // O UpdateStoreDto espera campos em inglês, mas o backend deve mapear para português
                const updateData: any = {
                    name: sanitizeText(name),
                    cnpj: cnpj.replace(/\D/g, ''),
                    type: type,
                    address: fullAddress,
                    city: sanitizeText(city),
                    state: state.toUpperCase(),
                    zip: cep.replace(/\D/g, ''),
                    phone: phone.replace(/\D/g, ''),
                    hours: hours,
                    pickup_deadline: pickupDeadline,
                    is_active: true,
                };

                // Adicionar asaas_wallet_id se fornecido (validado no validateForm)
                if (asaasWalletId.trim()) {
                    updateData.asaas_wallet_id = asaasWalletId.trim();
                }

                // Adicionar logo se foi feito upload
                if (uploadedLogoUrl) {
                    updateData.logo_url = uploadedLogoUrl;
                }
                
                await api.updateStore(editStoreId, updateData);
                console.log('Store updated successfully');

                Alert.alert(
                    '✅ Loja Atualizada!',
                    'As informações da loja foram atualizadas com sucesso.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            } else {
                // CREATE MODE
                console.log('Calling API to create store...');

                // If this is a new registration, save the role first
                if (pendingRole) {
                    console.log('Setting store_owner role...');
                    await api.updateProfile({ role: 'store_owner' });
                    console.log('Role saved');
                }

                // CREATE MODE - CreateStoreDto espera campos em inglês
                const createData: any = {
                    name: sanitizeText(name),
                    cnpj: cnpj.replace(/\D/g, ''),
                    type: type,
                    address: fullAddress,
                    city: sanitizeText(city),
                    state: state.toUpperCase(),
                    zip: cep.replace(/\D/g, ''),
                    phone: phone.replace(/\D/g, ''),
                    hours: hours,
                    pickup_deadline: pickupDeadline,
                    is_active: true,
                    is_premium: false,
                };

                // Adicionar asaas_wallet_id se fornecido (validado no validateForm)
                if (asaasWalletId.trim()) {
                    createData.asaas_wallet_id = asaasWalletId.trim();
                }

                const createPromise = api.createStore(createData);

                const timeoutPromise = new Promise<any>((_, reject) =>
                    setTimeout(() => reject(new Error('Backend não respondeu. Verifique se o servidor NestJS está rodando.')), 15000)
                );

                const createdStore = await Promise.race([createPromise, timeoutPromise]);
                console.log('Store created successfully:', createdStore?.id);

                // Only upload logo AFTER store is created successfully
                let uploadedLogoUrl: string | undefined;
                if (logoUri && createdStore?.id) {
                    console.log('Uploading store logo...');
                    try {
                        uploadedLogoUrl = await uploadStoreProfile(logoUri, createdStore.id);
                        console.log('Logo uploaded:', uploadedLogoUrl);

                        // Update store with logo URL
                        await api.updateStore(createdStore.id, { logo_url: uploadedLogoUrl } as any);
                        console.log('Store updated with logo');
                    } catch (uploadError: any) {
                        console.error('Logo upload failed:', uploadError);
                        Alert.alert(
                            'Aviso',
                            'Loja criada mas não foi possível fazer upload da foto.\nVocê pode adicionar depois.',
                            [{ text: 'OK' }]
                        );
                    }
                }

                Alert.alert(
                    '✅ Loja Cadastrada!',
                    uploadedLogoUrl
                        ? 'Sua loja foi cadastrada com sucesso. Bem-vindo ao VenceJá!'
                        : 'Sua loja foi cadastrada. Bem-vindo ao VenceJá!',
                    [{ text: 'Continuar', onPress: () => router.replace('/(merchant)') }]
                );
            }
        } catch (error: any) {
            console.error('Error saving store:', error);

            // Mensagens amigáveis baseadas no erro
            let errorMsg = isEditMode
                ? 'Não foi possível atualizar a loja. Tente novamente.'
                : 'Não foi possível cadastrar a loja. Tente novamente.';

            if (error.message.includes('Backend') || error.message.includes('servidor')) {
                errorMsg = 'Servidor temporariamente indisponível. Tente novamente em alguns instantes.';
            } else if (error.message.includes('CNPJ')) {
                errorMsg = 'O CNPJ informado não é válido. Verifique e tente novamente.';
            } else if (error.message.includes('connection') || error.message.includes('network')) {
                errorMsg = 'Sem conexão com a internet. Verifique sua conexão e tente novamente.';
            } else if (error.message.includes('already exists') || error.message.includes('duplicate')) {
                errorMsg = 'Este CNPJ já está cadastrado em nossa plataforma.';
            } else if (error.message.includes('timeout')) {
                errorMsg = 'A conexão demorou muito. Tente novamente.';
            }

            Alert.alert('Ops! Algo deu errado', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (loadingStore) {
        return (
            <GradientBackground>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.secondary} />
                    <Text style={styles.loadingText}>Carregando dados da loja...</Text>
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
                    <Text style={styles.headerTitle}>{isEditMode ? 'Editar Loja' : 'Nova Loja'}</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    style={styles.form}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Basic Info */}
                    <Text style={styles.sectionTitle}>Informações Básicas</Text>

                    {/* Logo Picker */}
                    <View style={styles.logoSection}>
                        <TouchableOpacity
                            style={styles.logoPicker}
                            onPress={pickImage}
                        >
                            {logoUri ? (
                                <Image source={{ uri: logoUri }} style={styles.logoImage} />
                            ) : (
                                <View style={styles.logoPlaceholder}>
                                    <Ionicons name="camera" size={32} color={Colors.textMuted} />
                                    <Text style={styles.logoPlaceholderText}>
                                        Foto da Loja
                                    </Text>
                                </View>
                            )}
                            <View style={styles.logoEditBadge}>
                                <Ionicons name="pencil" size={14} color={Colors.text} />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.logoHint}>Opcional - Aparecerá no perfil da loja</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Nome da Loja <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            value={name}
                            onChangeText={(v) => setName(v.slice(0, 50))}
                            placeholder="Ex: Supermercado Bom Preço"
                            placeholderTextColor={Colors.textMuted}
                            maxLength={50}
                        />
                        <Text style={styles.charCount}>{name.length}/50</Text>
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            CNPJ <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.cnpj && styles.inputError]}
                            value={cnpj}
                            onChangeText={(v) => setCnpj(formatCNPJ(v))}
                            placeholder="00.000.000/0000-00"
                            placeholderTextColor={Colors.textMuted}
                            keyboardType="numeric"
                            maxLength={18}
                        />
                        {errors.cnpj && <Text style={styles.errorText}>{errors.cnpj}</Text>}
                    </View>

                    <SelectInput
                        label="Tipo de Loja"
                        value={type}
                        options={STORE_TYPES}
                        onSelect={setType}
                        placeholder="Selecione o tipo..."
                        error={errors.type}
                        required
                    />

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Telefone <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.phone && styles.inputError]}
                            value={phone}
                            onChangeText={(v) => setPhone(formatPhone(v))}
                            placeholder="(00) 00000-0000"
                            placeholderTextColor={Colors.textMuted}
                            keyboardType="phone-pad"
                            maxLength={15}
                        />
                        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                    </View>

                    {/* Address */}
                    <Text style={styles.sectionTitle}>Endereço</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            CEP <Text style={styles.required}>*</Text>
                        </Text>
                        <View style={styles.cepRow}>
                            <TextInput
                                style={[styles.input, styles.cepInput, errors.cep && styles.inputError]}
                                value={cep}
                                onChangeText={handleCEPChange}
                                placeholder="00000-000"
                                placeholderTextColor={Colors.textMuted}
                                keyboardType="numeric"
                                maxLength={9}
                            />
                            {loadingCEP && <ActivityIndicator color={Colors.primary} style={styles.cepLoader} />}
                        </View>
                        {errors.cep && <Text style={styles.errorText}>{errors.cep}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Endereço <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.address && styles.inputError]}
                            value={address}
                            onChangeText={setAddress}
                            placeholder="Rua, Avenida..."
                            placeholderTextColor={Colors.textMuted}
                        />
                        {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>
                                Número <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={[styles.input, errors.number && styles.inputError]}
                                value={number}
                                onChangeText={(v) => setNumber(v.replace(/\D/g, ''))}
                                placeholder="123"
                                placeholderTextColor={Colors.textMuted}
                                keyboardType="numeric"
                            />
                            {errors.number && <Text style={styles.errorText}>{errors.number}</Text>}
                        </View>

                        <View style={[styles.inputGroup, { flex: 1.5 }]}>
                            <Text style={styles.label}>Complemento</Text>
                            <TextInput
                                style={styles.input}
                                value={complement}
                                onChangeText={setComplement}
                                placeholder="Apto, Sala..."
                                placeholderTextColor={Colors.textMuted}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Bairro <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.neighborhood && styles.inputError]}
                            value={neighborhood}
                            onChangeText={setNeighborhood}
                            placeholder="Bairro"
                            placeholderTextColor={Colors.textMuted}
                        />
                        {errors.neighborhood && <Text style={styles.errorText}>{errors.neighborhood}</Text>}
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
                            <Text style={styles.label}>
                                Cidade <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={[styles.input, errors.city && styles.inputError]}
                                value={city}
                                onChangeText={setCity}
                                placeholder="Cidade"
                                placeholderTextColor={Colors.textMuted}
                            />
                            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
                        </View>

                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>
                                UF <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={[styles.input, errors.state && styles.inputError]}
                                value={state}
                                onChangeText={(v) => setState(v.toUpperCase().slice(0, 2))}
                                placeholder="SP"
                                placeholderTextColor={Colors.textMuted}
                                maxLength={2}
                                autoCapitalize="characters"
                            />
                            {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
                        </View>
                    </View>

                    {/* Hours */}
                    <Text style={styles.sectionTitle}>Horário de Funcionamento</Text>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>
                                Abertura <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={[styles.input, errors.openTime && styles.inputError]}
                                value={openTime}
                                onChangeText={(v) => setOpenTime(formatTime(v))}
                                placeholder="08:00"
                                placeholderTextColor={Colors.textMuted}
                                keyboardType="numeric"
                                maxLength={5}
                            />
                            {errors.openTime && <Text style={styles.errorText}>{errors.openTime}</Text>}
                        </View>

                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>
                                Fechamento <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={[styles.input, errors.closeTime && styles.inputError]}
                                value={closeTime}
                                onChangeText={(v) => setCloseTime(formatTime(v))}
                                placeholder="22:00"
                                placeholderTextColor={Colors.textMuted}
                                keyboardType="numeric"
                                maxLength={5}
                            />
                            {errors.closeTime && <Text style={styles.errorText}>{errors.closeTime}</Text>}
                        </View>
                    </View>

                    {closeTime && validateTime(closeTime) && (
                        <View style={styles.infoBox}>
                            <Ionicons name="time-outline" size={18} color={Colors.warning} />
                            <Text style={styles.infoText}>
                                Retiradas até: <Text style={styles.infoBold}>{calculatePickupDeadline(closeTime)}</Text>
                                {'\n'}(1 hora antes do fechamento)
                            </Text>
                        </View>
                    )}

                    {/* Payment Configuration */}
                    <Text style={styles.sectionTitle}>Configuração de Pagamento</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Wallet ID Asaas <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.asaasWalletId && styles.inputError]}
                            value={asaasWalletId}
                            onChangeText={setAsaasWalletId}
                            placeholder="26fde169-838b-4c15-aed9-9ab39701a4c4"
                            placeholderTextColor={Colors.textMuted}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {errors.asaasWalletId && <Text style={styles.errorText}>{errors.asaasWalletId}</Text>}
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
                            <Text style={styles.infoText}>
                                <Text style={styles.infoBold}>Como obter:</Text>{'\n'}
                                1. Crie uma conta no Asaas (https://www.asaas.com){'\n'}
                                2. Acesse "Carteiras" no painel do Asaas{'\n'}
                                3. Crie uma nova carteira para sua loja{'\n'}
                                4. Copie o Wallet ID (formato UUID){'\n'}
                                5. Cole aqui no cadastro da loja{'\n\n'}
                                <Text style={styles.infoBold}>Importante:</Text> O Wallet ID da loja deve ser diferente do Wallet ID da plataforma. Em produção, não é permitido usar o mesmo wallet para loja e plataforma.
                            </Text>
                        </View>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.8}
                        style={styles.submitButton}
                    >
                        <LinearGradient
                            colors={[Colors.secondary, Colors.secondaryDark]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.submitGradient}
                        >
                            {loading ? (
                                <ActivityIndicator color={Colors.text} />
                            ) : (
                                <>
                                    <Ionicons name={isEditMode ? "checkmark-circle" : "storefront"} size={20} color={Colors.text} />
                                    <Text style={styles.submitText}>{isEditMode ? 'Salvar Alterações' : 'Cadastrar Loja'}</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: DesignTokens.padding.medium, // Responsivo
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
        paddingHorizontal: DesignTokens.padding.medium, // Responsivo
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginTop: 24,
        marginBottom: 16,
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
    cepRow: {
        position: 'relative',
    },
    cepInput: {
        flex: 1,
    },
    cepLoader: {
        position: 'absolute',
        right: 16,
        top: 14,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.warning15,
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
    infoBold: {
        fontWeight: '700',
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
    logoSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logoPicker: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.glass,
        borderWidth: 2,
        borderColor: Colors.glassBorder,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    logoPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoPlaceholderText: {
        fontSize: 12,
        color: Colors.textMuted,
        marginTop: 4,
    },
    logoEditBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoHint: {
        fontSize: 12,
        color: Colors.textMuted,
        marginTop: 8,
    },
    logoPickerError: {
        borderColor: Colors.error,
    },
    logoErrorText: {
        fontSize: 12,
        color: Colors.error,
        marginTop: 8,
    },
});
