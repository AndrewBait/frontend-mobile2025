import { useSessionExpiredModal } from '@/components/feedback/SessionExpiredModal';
import { useToast } from '@/components/feedback/Toast';
import { useCallback } from 'react';

type NormalizedError = {
    message: string;
    statusCode?: number;
    details?: any;
};

const toMessageString = (value: unknown): string | null => {
    if (!value) return null;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    }
    if (Array.isArray(value)) {
        const parts = value
            .map((v) => (typeof v === 'string' ? v.trim() : ''))
            .filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : null;
    }
    if (value instanceof Error) {
        return value.message?.trim() ? value.message.trim() : null;
    }
    return null;
};

const normalizeError = (error: unknown): NormalizedError => {
    const anyErr = error as any;

    const statusCode: number | undefined =
        typeof anyErr?.statusCode === 'number'
            ? anyErr.statusCode
            : typeof anyErr?.status === 'number'
                ? anyErr.status
                : undefined;

    const response = anyErr?.response;
    const details = anyErr?.details ?? response?.details;

    const message =
        toMessageString(anyErr?.message) ||
        toMessageString(response?.message) ||
        toMessageString(response?.error) ||
        toMessageString(response) ||
        'Algo deu errado. Tente novamente.';

    const isNetworkError =
        message.includes('Network request failed') ||
        message.includes('Failed to fetch') ||
        message.toLowerCase().includes('timeout');

    return {
        message: isNetworkError
            ? 'Erro de conexão. Verifique sua internet e tente novamente.'
            : message,
        statusCode,
        details,
    };
};

export const useErrorHandler = () => {
    const { showToast } = useToast();
    const { showSessionExpiredModal } = useSessionExpiredModal();

    const handleError = useCallback(
        (
            error: unknown,
            options?: { fallbackMessage?: string; sessionExpiredMessage?: string }
        ) => {
            const normalized = normalizeError(error);
            const fallbackMessage =
                options?.fallbackMessage || 'Não foi possível concluir. Tente novamente.';

            if (normalized.statusCode === 401) {
                showSessionExpiredModal(
                    options?.sessionExpiredMessage ||
                        'Sua sessão expirou. Faça login novamente para continuar.'
                );
                return;
            }

            const message = normalized.message || fallbackMessage;
            showToast(message, 'error');
        },
        [showSessionExpiredModal, showToast]
    );

    return { handleError };
};
