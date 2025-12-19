import { useAuth } from '@/contexts/AuthContext';
import React, { useCallback } from 'react';
import { SessionExpiredModal, useSessionExpiredModal } from './SessionExpiredModal';

export const SessionExpiredModalHost: React.FC = () => {
    const { signOut } = useAuth();
    const { modal, hideSessionExpiredModal } = useSessionExpiredModal();

    const handleConfirm = useCallback(async () => {
        hideSessionExpiredModal();
        await signOut();
    }, [hideSessionExpiredModal, signOut]);

    return (
        <SessionExpiredModal
            visible={modal.visible}
            message={modal.message}
            onClose={hideSessionExpiredModal}
            onConfirm={handleConfirm}
        />
    );
};

