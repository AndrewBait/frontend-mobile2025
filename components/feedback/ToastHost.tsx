import React from 'react';
import { Toast, useToast } from './Toast';

export const ToastHost: React.FC = () => {
    const { toast, hideToast } = useToast();

    return (
        <Toast
            message={toast.message}
            type={toast.type}
            visible={toast.visible}
            onHide={hideToast}
            action={toast.action}
        />
    );
};

