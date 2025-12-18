import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProfileRequiredModalProps {
    visible: boolean;
    onClose: () => void;
}

export const ProfileRequiredModal: React.FC<ProfileRequiredModalProps> = ({
    visible,
    onClose,
}) => {
    const handleCompleteProfile = () => {
        onClose();
        router.push('/(customer)/setup');
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {/* Icon */}
                    <View style={styles.iconContainer}>
                        <Ionicons name="person-circle-outline" size={64} color={Colors.warning} />
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Complete seu cadastro</Text>

                    {/* Description */}
                    <Text style={styles.description}>
                        Para finalizar sua compra, precisamos de algumas informações adicionais como telefone para contato.
                    </Text>

                    {/* Info Box */}
                    <View style={styles.infoBox}>
                        <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
                        <Text style={styles.infoText}>
                            Seus dados são protegidos e usados apenas para a retirada do pedido.
                        </Text>
                    </View>

                    {/* Buttons */}
                    <TouchableOpacity
                        onPress={handleCompleteProfile}
                        activeOpacity={0.8}
                        style={styles.primaryButton}
                    >
                        <View style={styles.buttonContent}>
                            <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.buttonText}>Completar Cadastro</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.secondaryButton}
                    >
                        <Text style={styles.secondaryButtonText}>Continuar comprando</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modal: {
        width: '100%',
        backgroundColor: Colors.backgroundCard,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.warning15,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.success15,
        borderRadius: 12,
        padding: 14,
        marginBottom: 24,
        gap: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: Colors.success,
        lineHeight: 18,
    },
    primaryButton: {
        width: '100%',
        borderRadius: 14,
        backgroundColor: Colors.primary, // Verde sólido
        marginBottom: 12,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF', // Texto branco
    },
    secondaryButton: {
        paddingVertical: 12,
    },
    secondaryButtonText: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
});
