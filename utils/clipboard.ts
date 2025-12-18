import { Platform } from 'react-native';

export const copyToClipboard = async (text: string): Promise<boolean> => {
    const value = String(text ?? '');
    if (!value) return false;

    if (Platform.OS === 'web') {
        try {
            const clipboard = (globalThis as any)?.navigator?.clipboard;
            if (clipboard?.writeText) {
                await clipboard.writeText(value);
                return true;
            }
        } catch {
            // ignore
        }
    }

    // RN Clipboard não existe em algumas versões do React Native; tenta sem quebrar.
    try {
        const rn: any = require('react-native');
        if (rn?.Clipboard?.setString) {
            rn.Clipboard.setString(value);
            return true;
        }
    } catch {
        // ignore
    }

    return false;
};

