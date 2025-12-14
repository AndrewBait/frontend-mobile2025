import { API_BASE_URL } from '../constants/config';
import { getAccessToken } from './supabase';

// Types based on API contract
export interface User {
    id: string;
    email: string;
    name?: string;
    phone?: string;
    photo_url?: string;
    role?: 'customer' | 'merchant' | 'store_owner';
    lat?: number;
    lng?: number;
    radius_km?: number;
    profile_complete?: boolean;
    created_at?: string;
}

export interface Store {
    id: string;
    merchant_id: string;
    name: string;
    cnpj: string;
    type?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    hours: string;
    pickup_deadline?: string;
    lat?: number;
    lng?: number;
    logo_url?: string;
    is_active: boolean;
    is_premium: boolean;
    created_at?: string;
}

export interface Product {
    id: string;
    store_id: string;
    name: string;
    description?: string;
    category: string;
    original_price?: number;
    photo1?: string;
    photo2?: string;
    is_active: boolean;
    created_at?: string;
}

export interface Batch {
    id: string;
    product_id: string;
    store_id: string;
    // English fields
    original_price?: number;
    promo_price?: number;
    discount_percent?: number;
    expiration_date?: string;
    stock?: number;
    is_active?: boolean;
    // Portuguese fields from backend
    preco_normal_override?: number;
    preco_promocional?: number;
    desconto_percentual?: number;
    data_vencimento?: string;
    estoque_total?: number;
    disponivel?: number;
    active?: boolean;
    status?: string;
    product?: Product & {
        nome?: string;
        foto1?: string;
        foto2?: string;
        preco_normal?: number;
    };
    store?: Store;
}

export interface CartItem {
    batch_id: string;
    quantity: number;
    batch?: Batch;
}

export interface Cart {
    items: CartItem[];
    total: number;
}

export interface Order {
    id: string;
    customer_id: string;
    store_id: string;
    status: 'pending' | 'paid' | 'picked_up' | 'cancelled' | 'expired';
    total_amount: number;
    pickup_code?: string;
    pix_code?: string;
    paid_at?: string;
    picked_up_at?: string;
    created_at?: string;
    store?: Store;
    items?: OrderItem[];
}

export interface OrderItem {
    id: string;
    order_id: string;
    batch_id: string;
    quantity: number;
    unit_price: number;
    batch?: Batch;
}

// API Client
class ApiClient {
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const token = await getAccessToken();

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        };

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `API Error: ${response.status}`);
        }

        return response.json();
    }

    // ==================== USER ====================

    async getMe(): Promise<User> {
        return this.request('/me');
    }

    async getProfile(): Promise<User> {
        const response = await this.request<{ user: any; customer?: any }>('/me/profile');

        // Map backend fields (Portuguese) to frontend fields (English)
        const user = response.user || response;
        const customer = response.customer;

        return {
            id: user.id,
            email: user.email,
            name: user.nome || user.name,
            phone: user.telefone || user.phone,
            photo_url: user.foto_url || user.photo_url,
            role: user.role,
            lat: customer?.location_lat || user.lat,
            lng: customer?.location_lng || user.lng,
            radius_km: customer?.raio_padrao_km || user.radius_km || 5,
            profile_complete: user.profile_complete,
            created_at: user.created_at,
        };
    }

    async updateProfile(data: Partial<User>): Promise<User> {
        return this.request('/me/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async updateLocation(lat: number, lng: number, radius_km: number = 5): Promise<User> {
        return this.request('/me/location', {
            method: 'PUT',
            body: JSON.stringify({ lat, lng, radius_km }),
        });
    }

    // ==================== STORES ====================

    async getMyStores(): Promise<Store[]> {
        return this.request('/stores/me');
    }

    async createStore(data: Partial<Store>): Promise<Store> {
        return this.request('/stores', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateStore(id: string, data: Partial<Store>): Promise<Store> {
        return this.request(`/stores/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async getStore(id: string): Promise<Store> {
        return this.request(`/stores/${id}`);
    }

    async getPublicStore(id: string): Promise<Store> {
        return this.request(`/public/stores/${id}`);
    }

    async getStoreSummary(id: string): Promise<{
        total_sales: number;
        total_paid_today: number;
        pending_pickup: number;
        low_stock: number;
        expiring_soon: number;
        daily_sales: { date: string; total: number; count: number }[];
    }> {
        return this.request(`/stores/${id}/orders/summary`);
    }

    // ==================== PRODUCTS ====================

    async getStoreProducts(storeId: string): Promise<Product[]> {
        return this.request(`/stores/${storeId}/products`);
    }

    async createProduct(storeId: string, data: Partial<Product>): Promise<Product> {
        return this.request(`/stores/${storeId}/products`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
        return this.request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteProduct(id: string): Promise<{ success: boolean; id: string }> {
        return this.request(`/products/${id}`, {
            method: 'DELETE',
        });
    }

    // ==================== BATCHES ====================

    async getStoreBatches(storeId: string): Promise<Batch[]> {
        return this.request(`/stores/${storeId}/batches`);
    }

    async createBatch(storeId: string, data: Partial<Batch>): Promise<Batch> {
        return this.request(`/stores/${storeId}/batches`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateBatch(id: string, data: Partial<Batch>): Promise<Batch> {
        return this.request(`/batches/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async getPublicBatches(params: {
        categoria?: string;
        desconto_min?: number;
        vence_em?: string;
        store_id?: string;
        lat?: number;
        lng?: number;
        raio_km?: number;
    }): Promise<Batch[]> {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) query.append(key, String(value));
        });
        return this.request(`/public/batches?${query}`);
    }

    async getPublicBatch(id: string): Promise<Batch> {
        return this.request(`/public/batches/${id}`);
    }

    // ==================== FAVORITES ====================

    async getFavorites(): Promise<Batch[]> {
        return this.request('/me/favorites');
    }

    async addFavorite(batchId: string): Promise<void> {
        return this.request('/me/favorites', {
            method: 'POST',
            body: JSON.stringify({ batch_id: batchId }),
        });
    }

    async removeFavorite(id: string): Promise<void> {
        return this.request(`/me/favorites/${id}`, {
            method: 'DELETE',
        });
    }

    // ==================== CART ====================

    async getCart(): Promise<Cart> {
        return this.request('/me/cart');
    }

    async addToCart(batchId: string, quantity: number = 1): Promise<Cart> {
        return this.request('/me/cart/add-item', {
            method: 'POST',
            body: JSON.stringify({ batch_id: batchId, quantity }),
        });
    }

    async removeFromCart(batchId: string): Promise<Cart> {
        return this.request('/me/cart/remove-item', {
            method: 'POST',
            body: JSON.stringify({ batch_id: batchId }),
        });
    }

    async clearCart(): Promise<void> {
        return this.request('/me/cart/clear', {
            method: 'POST',
        });
    }

    async reserveCart(): Promise<void> {
        return this.request('/me/cart/reserve', {
            method: 'POST',
        });
    }

    // ==================== ORDERS ====================

    async createOrder(): Promise<Order> {
        return this.request('/me/orders', {
            method: 'POST',
        });
    }

    async getMyOrders(): Promise<Order[]> {
        return this.request('/me/orders');
    }

    async getMyOrder(id: string): Promise<Order> {
        return this.request(`/me/orders/${id}`);
    }

    async getStoreOrders(storeId: string): Promise<Order[]> {
        return this.request(`/stores/${storeId}/orders`);
    }

    async getStoreOrder(storeId: string, orderId: string): Promise<Order> {
        return this.request(`/stores/${storeId}/orders/${orderId}`);
    }

    async confirmPickup(storeId: string, orderId: string): Promise<Order> {
        return this.request(`/stores/${storeId}/orders/${orderId}/pickup`, {
            method: 'POST',
        });
    }

    // ==================== PAYMENTS ====================

    async checkout(orderId: string): Promise<{ pix_code: string; pix_qrcode?: string }> {
        return this.request('/me/payments/checkout', {
            method: 'POST',
            body: JSON.stringify({ order_id: orderId }),
        });
    }

    // ==================== MEDIA ====================

    async getProductMedia(productId: string): Promise<{ id: string; url: string; type: string }[]> {
        return this.request(`/products/${productId}/media`);
    }

    async getUploadUrl(productId: string): Promise<{ upload_url: string; file_path: string }> {
        return this.request(`/products/${productId}/media/upload-url`, {
            method: 'POST',
        });
    }

    async createMedia(productId: string, filePath: string, type: string): Promise<void> {
        return this.request(`/products/${productId}/media`, {
            method: 'POST',
            body: JSON.stringify({ file_path: filePath, type }),
        });
    }

    async deleteMedia(productId: string, mediaId: string): Promise<void> {
        return this.request(`/products/${productId}/media/${mediaId}`, {
            method: 'DELETE',
        });
    }
}

export const api = new ApiClient();
