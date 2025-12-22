import { useMemo } from 'react';
import { Batch } from '@/services/api';

export interface BatchFilterParams {
    searchQuery: string;
    minPrice: string;
    maxPrice: string;
    maxDaysToExpire: number | null;
}

const parsePrice = (value: string): number | null => {
    const cleaned = String(value || '').trim();
    if (!cleaned) return null;
    const num = Number.parseFloat(cleaned.replace(',', '.'));
    return Number.isFinite(num) ? num : null;
};

export const useFilteredBatches = (
    batches: Batch[],
    { searchQuery, minPrice, maxPrice, maxDaysToExpire }: BatchFilterParams,
) => {
    return useMemo(() => {
        let filtered = batches;

        // Remove produtos vencidos (não devem aparecer para o cliente)
        filtered = filtered.filter((batch) => {
            const expirationDate = batch.expiration_date || batch.data_vencimento;
            if (!expirationDate) return true;

            const expDate = new Date(expirationDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            expDate.setHours(0, 0, 0, 0);
            const diffTime = expDate.getTime() - today.getTime();
            const daysToExpire = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return daysToExpire >= 0;
        });

        // Busca por texto
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter((batch) => {
                const productData = batch.products || batch.product;
                const storeData = batch.stores || batch.store;
                const productName = (productData?.nome || productData?.name || '').toLowerCase();
                const storeName = (storeData?.nome || storeData?.name || '').toLowerCase();
                const category = (productData?.categoria || productData?.category || '').toLowerCase();
                return (
                    productName.includes(query) ||
                    storeName.includes(query) ||
                    category.includes(query)
                );
            });
        }

        // Filtro de preço
        const min = parsePrice(minPrice) ?? 0;
        const max = parsePrice(maxPrice) ?? Number.POSITIVE_INFINITY;
        if (minPrice || maxPrice) {
            filtered = filtered.filter((batch) => {
                const promoPrice = batch.promo_price ?? batch.preco_promocional ?? 0;
                return promoPrice >= min && promoPrice <= max;
            });
        }

        // Filtro por dias até vencer
        if (maxDaysToExpire !== null) {
            filtered = filtered.filter((batch) => {
                const expirationDate = batch.expiration_date || batch.data_vencimento;
                if (!expirationDate) return false;

                const expDate = new Date(expirationDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                expDate.setHours(0, 0, 0, 0);
                const diffTime = expDate.getTime() - today.getTime();
                const daysToExpire = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                return daysToExpire >= 0 && daysToExpire <= maxDaysToExpire;
            });
        }

        return filtered;
    }, [batches, searchQuery, minPrice, maxPrice, maxDaysToExpire]);
};
