// Validation utilities for forms

// CNPJ Validation
export const validateCNPJ = (cnpj: string): boolean => {
    const cleaned = cnpj.replace(/\D/g, '');

    if (cleaned.length !== 14) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false; // All same digits

    // Calculate first digit
    let sum = 0;
    let weight = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    for (let i = 0; i < 12; i++) {
        sum += parseInt(cleaned[i]) * weight[i];
    }
    let remainder = sum % 11;
    let digit1 = remainder < 2 ? 0 : 11 - remainder;

    // Calculate second digit
    sum = 0;
    weight = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    for (let i = 0; i < 13; i++) {
        sum += parseInt(cleaned[i]) * weight[i];
    }
    remainder = sum % 11;
    let digit2 = remainder < 2 ? 0 : 11 - remainder;

    return cleaned[12] === String(digit1) && cleaned[13] === String(digit2);
};

// CPF Validation
export const validateCPF = (cpf: string): boolean => {
    const cleaned = cpf.replace(/\D/g, '');

    if (cleaned.length !== 11) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleaned[i]) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    let digit1 = remainder === 10 || remainder === 11 ? 0 : remainder;

    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cleaned[i]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    let digit2 = remainder === 10 || remainder === 11 ? 0 : remainder;

    return cleaned[9] === String(digit1) && cleaned[10] === String(digit2);
};

// CEP Validation
export const validateCEP = (cep: string): boolean => {
    const cleaned = cep.replace(/\D/g, '');
    return cleaned.length === 8;
};

// Phone Validation
export const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
};

// Format CNPJ
export const formatCNPJ = (value: string): string => {
    const cleaned = value.replace(/\D/g, '').slice(0, 14);
    return cleaned
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
};

// Format CPF
export const formatCPF = (value: string): string => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    return cleaned
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2');
};

// Format CEP
export const formatCEP = (value: string): string => {
    const cleaned = value.replace(/\D/g, '').slice(0, 8);
    return cleaned.replace(/^(\d{5})(\d)/, '$1-$2');
};

// Format Phone
export const formatPhone = (value: string): string => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    if (cleaned.length <= 10) {
        return cleaned
            .replace(/^(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return cleaned
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
};

// Format phone to backend format: +55 11 99999-9999
export const formatPhoneForBackend = (phone: string): string => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If phone already starts with 55, remove it (will add +55)
    const withoutCountry = cleaned.startsWith('55') ? cleaned.slice(2) : cleaned;
    
    // Must have at least 10 digits (DDD + 8 digits) or 11 digits (DDD + 9 digits)
    if (withoutCountry.length < 10 || withoutCountry.length > 11) {
        return phone; // Return as is if invalid, backend will validate
    }
    
    // Extract DDD (first 2 digits) and number (rest)
    const ddd = withoutCountry.slice(0, 2);
    const number = withoutCountry.slice(2);
    
    // Format number: if 9 digits (celular), format as 99999-9999, else 9999-9999
    let formattedNumber: string;
    if (number.length === 9) {
        // Celular: 99999-9999
        formattedNumber = number.replace(/(\d{5})(\d{4})/, '$1-$2');
    } else if (number.length === 8) {
        // Fixo: 9999-9999
        formattedNumber = number.replace(/(\d{4})(\d{4})/, '$1-$2');
    } else {
        return phone; // Invalid length, return as is
    }
    
    // Return in format: +55 DDD NÚMERO
    return `+55 ${ddd} ${formattedNumber}`;
};

// Sanitize text (remove special chars except allowed)
export const sanitizeText = (text: string, allowNumbers = true): string => {
    if (allowNumbers) {
        return text.replace(/[^\w\sÀ-ÿ\-.,]/gi, '').trim();
    }
    return text.replace(/[^a-zA-ZÀ-ÿ\s\-]/gi, '').trim();
};

// Validate required field
export const validateRequired = (value: string): boolean => {
    return value.trim().length > 0;
};

// Validate min length
export const validateMinLength = (value: string, min: number): boolean => {
    return value.trim().length >= min;
};

// Validate max length
export const validateMaxLength = (value: string, max: number): boolean => {
    return value.trim().length <= max;
};

// Validate time format (HH:MM)
export const validateTime = (time: string): boolean => {
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(time);
};

// Format time input
export const formatTime = (value: string): string => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
        return `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`;
    }
    return cleaned;
};

// Validate date is not in the past
export const validateFutureDate = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
};

// Validate UUID format (for Asaas Wallet ID)
export const validateUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid.trim());
};

// Calculate pickup deadline (1 hour before closing)
export const calculatePickupDeadline = (closingTime: string): string => {
    const [hours, minutes] = closingTime.split(':').map(Number);
    let newHours = hours - 1;
    if (newHours < 0) newHours = 23;
    return `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Store types
export const STORE_TYPES = [
    { value: 'mercado', label: 'Mercado/Supermercado' },
    { value: 'hortifruti', label: 'Hortifruti' },
    { value: 'padaria', label: 'Padaria/Confeitaria' },
    { value: 'acougue', label: 'Açougue' },
    { value: 'peixaria', label: 'Peixaria' },
    { value: 'mercearia', label: 'Mercearia' },
    { value: 'emporio', label: 'Empório' },
    { value: 'lanchonete', label: 'Lanchonete/Restaurante' },
    { value: 'conveniencia', label: 'Conveniência' },
    { value: 'outro', label: 'Outro' },
];

// Product categories based on store type
export const PRODUCT_CATEGORIES = [
    { value: 'mercearia', label: 'Mercearia' },
    { value: 'bebidas', label: 'Bebidas' },
    { value: 'laticinios', label: 'Laticínios' },
    { value: 'padaria', label: 'Padaria' },
    { value: 'frios', label: 'Frios e Embutidos' },
    { value: 'hortifruti', label: 'Hortifruti' },
    { value: 'carnes', label: 'Carnes' },
    { value: 'congelados', label: 'Congelados' },
    { value: 'limpeza', label: 'Limpeza' },
    { value: 'higiene', label: 'Higiene Pessoal' },
    { value: 'outros', label: 'Outros' },
];

// Default pickup radius in km
export const DEFAULT_PICKUP_RADIUS = 5;

// Radius options for filter
export const RADIUS_OPTIONS = [
    { value: 1, label: '1 km' },
    { value: 2, label: '2 km' },
    { value: 5, label: '5 km' },
    { value: 10, label: '10 km' },
    { value: 20, label: '20 km' },
];

// Pickup deadline after payment (in hours)
export const PICKUP_DEADLINE_HOURS = 2;

// CEP API fetch
export const fetchAddressByCEP = async (cep: string): Promise<{
    logradouro: string;
    bairro: string;
    localidade: string;
    uf: string;
    erro?: boolean;
} | null> => {
    try {
        const cleaned = cep.replace(/\D/g, '');
        if (cleaned.length !== 8) return null;

        const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
        const data = await response.json();

        if (data.erro) return null;
        return data;
    } catch (error) {
        console.error('Error fetching CEP:', error);
        return null;
    }
};
