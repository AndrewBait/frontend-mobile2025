import { Button } from '@/components/base/Button';
import { Colors } from '@/constants/Colors';
import { DesignTokens } from '@/constants/designTokens';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

interface SessionExpiredModalProps {
    visible: boolean;
    message?: string;
    onClose: () => void;
    onConfirm: () => void;
}

export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
    visible,
    message,
    onClose,
    onConfirm,
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="log-out-outline" size={56} color={Colors.warning} />
                    </View>

                    <Text style={styles.title}>Sessão expirada</Text>
                    <Text style={styles.description}>
                        {message ||
                            'Sua sessão expirou ou você não tem permissão. Faça login novamente para continuar.'}
                    </Text>

                    <Button
                        title="Fazer login novamente"
                        onPress={onConfirm}
                        variant="primary"
                        size="lg"
                        fullWidth
                        style={styles.primaryButton}
                    />
                    <Button
                        title="Fechar"
                        onPress={onClose}
                        variant="ghost"
                        size="md"
                        fullWidth
                    />
                </View>
            </View>
        </Modal>
    );
};

interface SessionExpiredState {
    visible: boolean;
    message: string;
}

let sessionExpiredState: SessionExpiredState = {
    visible: false,
    message: 'Sua sessão expirou. Faça login novamente para continuar.',
};

let sessionExpiredListeners: ((state: SessionExpiredState) => void)[] = [];

export const useSessionExpiredModal = () => {
    const [state, setState] = React.useState<SessionExpiredState>(sessionExpiredState);

    useEffect(() => {
        const listener = (newState: SessionExpiredState) => setState(newState);
        sessionExpiredListeners.push(listener);
        return () => {
            sessionExpiredListeners = sessionExpiredListeners.filter((l) => l !== listener);
        };
    }, []);

    const showSessionExpiredModal = (message?: string) => {
        sessionExpiredState = {
            visible: true,
            message: message || sessionExpiredState.message,
        };
        sessionExpiredListeners.forEach((listener) => listener(sessionExpiredState));
    };

    const hideSessionExpiredModal = () => {
        sessionExpiredState = { ...sessionExpiredState, visible: false };
        sessionExpiredListeners.forEach((listener) => listener(sessionExpiredState));
    };

    return {
        modal: state,
        showSessionExpiredModal,
        hideSessionExpiredModal,
    };
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: DesignTokens.spacing.lg,
    },
    modal: {
        width: '100%',
        backgroundColor: Colors.backgroundCard,
        borderRadius: 24,
        padding: DesignTokens.spacing.lg,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        ...DesignTokens.shadows.lg,
    },
    iconContainer: {
        width: 92,
        height: 92,
        borderRadius: 46,
        backgroundColor: Colors.warning15,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: DesignTokens.spacing.lg,
    },
    title: {
        ...DesignTokens.typography.h3,
        color: Colors.text,
        textAlign: 'center',
        marginBottom: DesignTokens.spacing.sm,
    },
    description: {
        ...DesignTokens.typography.body,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: DesignTokens.spacing.lg,
    },
    primaryButton: {
        marginBottom: DesignTokens.spacing.sm,
    },
});

