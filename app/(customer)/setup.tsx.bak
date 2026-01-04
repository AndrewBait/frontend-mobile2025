import { GradientBackground } from '@/components/GradientBackground';
import { useToast } from '@/components/feedback/Toast';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { api } from '@/services/api';
import {
    DEFAULT_PICKUP_RADIUS,
    fetchAddressByCEP,
    formatCEP,
    formatCPF,
    formatPhone,
    RADIUS_OPTIONS,
    validateCEP,
    validateCPF,
    validatePhone,
    validateRequired,
} from '@/utils/validation';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FormErrors {
    phone?: string;
    cpf?: string;
    cep?: string;
}

export default function CustomerSetupScreen() {
    const insets = useSafeAreaInsets();
    const screenPaddingTop = insets.top + DesignTokens.spacing.md;
    const { pendingRole } = useLocalSearchParams<{ pendingRole?: string }>();
    const { user, refreshUser } = useAuth();
    const { showToast } = useToast();
    const { handleError } = useErrorHandler();
    const [loading, setLoading] = useState(false);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [loadingCEP, setLoadingCEP] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});

    // Form fields
    const [phone, setPhone] = useState('');
    const [cpf, setCpf] = useState('');
    const [cep, setCep] = useState('');
    const [address, setAddress] = useState('');
    const [number, setNumber] = useState('');
    const [complement, setComplement] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [radius, setRadius] = useState(DEFAULT_PICKUP_RADIUS);
    const [locationGranted, setLocationGranted] = useState(false);
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const lastCepLookupRef = useRef<string | null>(null);

    const loadExistingData = useCallback(async () => {
        if (!user) return;

        setLoadingLocation(true);
        try {
            // Carregar perfil completo (inclui customer com CPF)
            const profile = await api.getProfile();
            if (profile.phone) setPhone(formatPhone(profile.phone));

            // Carregar CPF do customer se existir
            if (profile.customer?.cpf) {
                setCpf(formatCPF(profile.customer.cpf));
            }

            if (typeof profile.radius_km === 'number' && profile.radius_km > 0) {
                setRadius(profile.radius_km);
            }

            const hasCoords =
                typeof profile.lat === 'number' &&
                typeof profile.lng === 'number' &&
                (profile.lat !== 0 || profile.lng !== 0);

            if (hasCoords) {
                setCoords({ lat: profile.lat as number, lng: profile.lng as number });
                setLocationGranted(true);
            }

            const customerData = (profile.customer || {}) as any;
            const hasSavedAddress = Boolean(customerData.cep);

            // Source of truth: se o banco tem endereço salvo, usa ele e não sobrescreve por GPS.
            if (hasSavedAddress) {
                setCep(formatCEP(customerData.cep));
                setAddress(customerData.endereco || '');
                setNumber(customerData.numero || '');
                setComplement(customerData.complemento || '');
                setNeighborhood(customerData.bairro || '');
                setCity(customerData.cidade || '');
                setState(customerData.estado || '');
                return { hasAddress: true, hasCoords };
            }

            // Se não tem endereço salvo mas tem coords, tenta reverse-geocode do GPS salvo
            if (hasCoords) {
                try {
                    const reverseGeocode = await Location.reverseGeocodeAsync({
                        latitude: profile.lat as number,
                        longitude: profile.lng as number,
                    });
                    if (reverseGeocode.length > 0) {
                        const addr = reverseGeocode[0];
                        setCity(addr.city || '');
                        setState(addr.region || '');
                        setNeighborhood(addr.district || addr.subregion || '');
                        if (addr.postalCode) setCep(formatCEP(addr.postalCode));
                        if (addr.street) setAddress(addr.street);
                    }
                } catch (e) {
                    console.warn('Geocode error', e);
                }
            }

            return { hasAddress: false, hasCoords };
        } catch (error) {
            console.error('Error loading profile:', error);
            return { hasAddress: false, hasCoords: false };
        } finally {
            setLoadingLocation(false);
        }
    }, [user]);

    const requestLocation = useCallback(async () => {
        setLoadingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                setLocationGranted(true);
                const location = await Location.getCurrentPositionAsync({});
                setCoords({
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                });

                const reverseGeocode = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });

                if (reverseGeocode.length > 0) {
                    const addr = reverseGeocode[0];
                    setCity(addr.city || '');
                    setState(addr.region || '');
                    setNeighborhood(addr.district || addr.subregion || '');
                    if (addr.postalCode) {
                        setCep(formatCEP(addr.postalCode));
                    }
                }
            }
        } catch (error) {
            console.error('Error getting location:', error);
        } finally {
            setLoadingLocation(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const result = await loadExistingData();
            if (cancelled) return;

            // Se já temos endereço salvo (ou coords salvas), não força request de GPS aqui
            if (result?.hasAddress || result?.hasCoords) return;

            await requestLocation();
        })();

        return () => {
            cancelled = true;
        };
    }, [loadExistingData, requestLocation]);

    const handleCEPChange = useCallback(async (value: string) => {
        const formatted = formatCEP(value);
        setCep(formatted);

        const cleaned = value.replace(/\D/g, '');
        // Limpa erro anterior enquanto digita
        setErrors((prev) => (prev.cep ? { ...prev, cep: undefined } : prev));

        // Se não tiver 8 dígitos, não busca (e evita aplicar resultado antigo)
        if (cleaned.length !== 8) {
            lastCepLookupRef.current = null;
            setLoadingCEP(false);
            return;
        }

        lastCepLookupRef.current = cleaned;
        setLoadingCEP(true);

        let addressData: Awaited<ReturnType<typeof fetchAddressByCEP>> = null;
        try {
            addressData = await fetchAddressByCEP(cleaned);
        } catch {
            // Segurança/UX: não propagar erro técnico para a UI
            addressData = null;
        } finally {
            if (lastCepLookupRef.current === cleaned) {
                setLoadingCEP(false);
            }
        }

        // Se o usuário mudou o CEP enquanto buscava, ignora este resultado
        if (lastCepLookupRef.current !== cleaned) return;

        if (addressData) {
            setAddress(addressData.logradouro || '');
            setNeighborhood(addressData.bairro || '');
            setCity(addressData.localidade || '');
            setState(addressData.uf || '');
            setErrors((prev) => ({ ...prev, cep: undefined }));
        } else {
            // Falha (timeout/erro/conexão): limpa campos e mostra mensagem amigável
            setAddress('');
            setNeighborhood('');
            setCity('');
            setState('');
            setNumber('');
            setComplement('');
            setErrors((prev) => ({
                ...prev,
                cep: 'CEP não encontrado ou erro de conexão',
            }));
        }
    }, []);

    const validateForm = useCallback((): boolean => {
        const newErrors: FormErrors = {};

        if (!validateRequired(phone)) {
            newErrors.phone = 'Telefone é obrigatório';
        } else if (!validatePhone(phone)) {
            newErrors.phone = 'Telefone inválido';
        }

        // CPF agora é obrigatório
        if (!validateRequired(cpf)) {
            newErrors.cpf = 'CPF é obrigatório';
        } else if (!validateCPF(cpf)) {
            newErrors.cpf = 'CPF inválido. Use o formato: 000.000.000-00';
        }

        if (cep && !validateCEP(cep)) {
            newErrors.cep = 'CEP inválido';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [phone, cpf, cep]);

    const handleSubmit = useCallback(async () => {
        if (!validateForm()) {
            showToast('Por favor, corrija os campos destacados.', 'warning');
            return;
        }

        setLoading(true);
        console.log('Saving customer profile...', pendingRole ? 'with role: customer' : '');

        try {
            // Save profile with role (if coming from select-role)
            // Note: cpf is not stored in the users table
            await api.updateProfile({
                role: pendingRole ? 'customer' : undefined,
                phone: phone.replace(/\D/g, ''),
            });
            console.log('Profile saved');

            // CPF é obrigatório, sempre enviar
            const cleanCpf = cpf.replace(/\D/g, '');
            const cleanedCep = cep.replace(/\D/g, '');

            await api.updateLocation({
                lat: coords?.lat || 0,
                lng: coords?.lng || 0,
                radius_km: radius,
                cpf: cleanCpf,
                cep: cleanedCep.length === 8 ? cleanedCep : undefined,
                address: address || undefined,
                number: number || undefined,
                complement: complement || undefined,
                neighborhood: neighborhood || undefined,
                city: city || undefined,
                state: state && state.trim().length === 2 ? state.trim().toUpperCase() : undefined,
            });
            console.log('Location, CPF and address saved');

            await refreshUser();

            showToast('Cadastro completo! Bem-vindo ao VenceJá.', 'success');
            router.replace('/(customer)');
        } catch (error: any) {
            console.error('Error saving profile:', error);
            handleError(error, { fallbackMessage: 'Não foi possível salvar. Tente novamente.' });
        } finally {
            setLoading(false);
        }
    }, [
        validateForm,
        pendingRole,
        phone,
        cpf,
        coords,
        radius,
        cep,
        address,
        number,
        complement,
        neighborhood,
        city,
        state,
        refreshUser,
        handleError,
        showToast,
    ]);

    // Validar se formulário tem erros críticos (phone e cpf vazios)
    const hasRequiredFields = useMemo(() => {
        return validateRequired(phone) && validateRequired(cpf);
    }, [phone, cpf]);

    return (
        <GradientBackground>
            <KeyboardAvoidingView
                style={[styles.container, { paddingTop: screenPaddingTop }]}
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
                    <Text style={styles.headerTitle}>Completar Perfil</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    style={styles.form}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Location Status */}
                    <View style={[
                        styles.locationCard,
                        locationGranted ? styles.locationGranted : styles.locationDenied
                    ]}>
                        {loadingLocation ? (
                            <ActivityIndicator color={Colors.text} />
                        ) : (
                            <>
                                <Ionicons
                                    name={locationGranted ? 'location' : 'location-outline'}
                                    size={24}
                                    color={locationGranted ? Colors.success : Colors.warning}
                                />
                                <View style={styles.locationInfo}>
                                    <Text style={styles.locationTitle}>
                                        {locationGranted ? 'Localização ativada' : 'Localização desativada'}
                                    </Text>
                                    <Text style={styles.locationText}>
                                        {locationGranted
                                            ? 'Mostraremos lojas próximas a você'
                                            : 'Ative para ver lojas pela proximidade'
                                        }
                                    </Text>
                                </View>
                                {!locationGranted && (
                                    <TouchableOpacity
                                        style={styles.locationButton}
                                        onPress={requestLocation}
                                    >
                                        <Text style={styles.locationButtonText}>Ativar</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>

                    {/* Radius Selector */}
                    <Text style={styles.sectionTitle}>Raio de Busca</Text>
                    <View style={styles.radiusRow}>
                        {RADIUS_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.value}
                                style={[
                                    styles.radiusChip,
                                    radius === opt.value && styles.radiusChipActive,
                                ]}
                                onPress={() => setRadius(opt.value)}
                            >
                                <Text style={[
                                    styles.radiusText,
                                    radius === opt.value && styles.radiusTextActive,
                                ]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.radiusNote}>
                        Veremos lojas em um raio de {radius}km da sua localização
                    </Text>

                    {/* Contact */}
                    <Text style={styles.sectionTitle}>Contato</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Telefone <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.phone && styles.inputError]}
                            value={phone}
                            onChangeText={useCallback((v: string) => setPhone(formatPhone(v)), [])}
                            placeholder="(00) 00000-0000"
                            placeholderTextColor={Colors.textMuted}
                            keyboardType="phone-pad"
                            maxLength={15}
                        />
                        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            CPF <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.cpf && styles.inputError]}
                            value={cpf}
                            onChangeText={useCallback((v: string) => setCpf(formatCPF(v)), [])}
                            placeholder="000.000.000-00"
                            placeholderTextColor={Colors.textMuted}
                            keyboardType="numeric"
                            maxLength={14}
                        />
                        {errors.cpf && <Text style={styles.errorText}>{errors.cpf}</Text>}
                    </View>

                    {/* Address (optional) */}
                    <Text style={styles.sectionTitle}>Endereço (opcional)</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>CEP</Text>
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

                    {address && (
                        <>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Endereço</Text>
                                <TextInput
                                    style={styles.input}
                                    value={address}
                                    onChangeText={setAddress}
                                    placeholder="Rua, Avenida..."
                                    placeholderTextColor={Colors.textMuted}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.label}>Número</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={number}
                                        onChangeText={(v) => setNumber(v.replace(/\D/g, ''))}
                                        placeholder="123"
                                        placeholderTextColor={Colors.textMuted}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <View style={[styles.inputGroup, { flex: 1.5 }]}>
                                    <Text style={styles.label}>Complemento</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={complement}
                                        onChangeText={setComplement}
                                        placeholder="Apto, Bloco..."
                                        placeholderTextColor={Colors.textMuted}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Bairro</Text>
                                <TextInput
                                    style={styles.input}
                                    value={neighborhood}
                                    onChangeText={setNeighborhood}
                                    placeholder="Bairro"
                                    placeholderTextColor={Colors.textMuted}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
                                    <Text style={styles.label}>Cidade</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={city}
                                        onChangeText={setCity}
                                        placeholder="Cidade"
                                        placeholderTextColor={Colors.textMuted}
                                    />
                                </View>

                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>UF</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={state}
                                        onChangeText={(v) => setState(v.toUpperCase().slice(0, 2))}
                                        placeholder="SP"
                                        placeholderTextColor={Colors.textMuted}
                                        maxLength={2}
                                        autoCapitalize="characters"
                                    />
                                </View>
                            </View>
                        </>
                    )}

                    {/* Pickup Info */}
                    <View style={styles.infoBox}>
                        <Ionicons name="time-outline" size={20} color={Colors.primary} />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoTitle}>Prazo de Retirada</Text>
                            <Text style={styles.infoText}>
                                Após o pagamento, você terá 2 horas para retirar seus produtos na loja.
                            </Text>
                        </View>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={loading || !hasRequiredFields}
                        activeOpacity={0.8}
                        style={[styles.submitButton, (!hasRequiredFields && !loading) && styles.submitButtonDisabled]}
                    >
                        <LinearGradient
                            colors={hasRequiredFields ? [Colors.primary, Colors.primaryDark] : [Colors.surfaceMuted, Colors.surfaceMuted]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.submitGradient}
                        >
                            {loading ? (
                                <ActivityIndicator color={Colors.text} />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color={hasRequiredFields ? Colors.text : Colors.textMuted} />
                                    <Text style={[styles.submitText, !hasRequiredFields && styles.submitTextDisabled]}>Salvar Perfil</Text>
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
        ...DesignTokens.typography.h3,
        color: Colors.text,
    },
    form: {
        flex: 1,
        paddingHorizontal: 24,
    },
    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        gap: 12,
    },
    locationGranted: {
        backgroundColor: Colors.success15,
        borderWidth: 1,
        borderColor: Colors.success30,
    },
    locationDenied: {
        backgroundColor: Colors.warning15,
        borderWidth: 1,
        borderColor: Colors.warning30,
    },
    locationInfo: {
        flex: 1,
    },
    locationTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    locationText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    locationButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: Colors.warning,
        borderRadius: 8,
    },
    locationButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginTop: 8,
        marginBottom: 16,
    },
    radiusRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    radiusChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    radiusChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    radiusText: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    radiusTextActive: {
        color: Colors.text,
        fontWeight: '600',
    },
    radiusNote: {
        fontSize: 12,
        color: Colors.textMuted,
        marginBottom: 24,
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
        backgroundColor: Colors.primary15,
        borderRadius: 16,
        padding: 16,
        marginTop: 24,
        marginBottom: 24,
        gap: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
        marginBottom: 4,
    },
    infoText: {
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    submitButton: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    submitButtonDisabled: {
        opacity: 0.6,
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
    submitTextDisabled: {
        color: Colors.textMuted,
    },
});
