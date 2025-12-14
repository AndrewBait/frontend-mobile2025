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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { GradientBackground } from '../../components/GradientBackground';
import { Colors } from '../../constants/Colors';
import {
    validateRequired,
    validatePhone,
    validateCPF,
    validateCEP,
    formatPhone,
    formatCPF,
    formatCEP,
    fetchAddressByCEP,
    RADIUS_OPTIONS,
    DEFAULT_PICKUP_RADIUS,
} from '../../utils/validation';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface FormErrors {
    phone?: string;
    cpf?: string;
    cep?: string;
}

export default function CustomerSetupScreen() {
    const { pendingRole } = useLocalSearchParams<{ pendingRole?: string }>();
    const { user, refreshUser } = useAuth();
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

    useEffect(() => {
        if (user) {
            if (user.phone) setPhone(formatPhone(user.phone));
        }
        requestLocation();
    }, [user]);

    const requestLocation = async () => {
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

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!validateRequired(phone)) {
            newErrors.phone = 'Telefone é obrigatório';
        } else if (!validatePhone(phone)) {
            newErrors.phone = 'Telefone inválido';
        }

        if (cpf && !validateCPF(cpf)) {
            newErrors.cpf = 'CPF inválido';
        }

        if (cep && !validateCEP(cep)) {
            newErrors.cep = 'CEP inválido';
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
        console.log('Saving customer profile...', pendingRole ? 'with role: customer' : '');

        try {
            // Save profile with role (if coming from select-role)
            // Note: cpf is not stored in the users table
            await api.updateProfile({
                role: pendingRole ? 'customer' : undefined,
                phone: phone.replace(/\D/g, ''),
            });
            console.log('Profile saved');

            if (coords) {
                await api.updateLocation(coords.lat, coords.lng, radius);
                console.log('Location saved');
            }

            await refreshUser();

            Alert.alert(
                '✅ Cadastro Completo!',
                'Suas informações foram salvas. Bem-vindo ao VenceJá!',
                [{ text: 'Continuar', onPress: () => router.replace('/(customer)') }]
            );
        } catch (error: any) {
            console.error('Error saving profile:', error);
            Alert.alert('Erro', error.message || 'Não foi possível salvar. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

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
                            onChangeText={(v) => setPhone(formatPhone(v))}
                            placeholder="(00) 00000-0000"
                            placeholderTextColor={Colors.textMuted}
                            keyboardType="phone-pad"
                            maxLength={15}
                        />
                        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>CPF (opcional)</Text>
                        <TextInput
                            style={[styles.input, errors.cpf && styles.inputError]}
                            value={cpf}
                            onChangeText={(v) => setCpf(formatCPF(v))}
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
                                    <Ionicons name="checkmark-circle" size={20} color={Colors.text} />
                                    <Text style={styles.submitText}>Salvar Perfil</Text>
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
    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        gap: 12,
    },
    locationGranted: {
        backgroundColor: Colors.success + '15',
        borderWidth: 1,
        borderColor: Colors.success + '30',
    },
    locationDenied: {
        backgroundColor: Colors.warning + '15',
        borderWidth: 1,
        borderColor: Colors.warning + '30',
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
        backgroundColor: Colors.primary + '15',
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
});
