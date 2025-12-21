import { API_BASE_URL } from '@/constants/config';
import { getAccessToken, refreshAccessToken } from '@/services/supabase';

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
    // IDs/relacionamentos
    merchant_id?: string;
    owner_id?: string;

    // Campos Frontend (EN)
    name?: string;
    type?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
    hours?: string;
    pickup_deadline?: string;

    // Campos Backend (PT-BR / variantes)
    nome?: string;
    tipo?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    telefone?: string;
    horario_funcionamento?: string;
    horario_limite_retirada?: string;

    cnpj?: string;
    lat?: number;
    lng?: number;
    logo_url?: string;
    is_active?: boolean;
    active?: boolean;
    is_premium?: boolean;
    asaas_wallet_id?: string;
    created_at?: string;
}

export interface Product {
    id: string;
    store_id?: string;
    // Campos Frontend (EN)
    name?: string;
    description?: string;
    category?: string;
    original_price?: number;
    photo1?: string;
    photo2?: string;
    // Campos Backend (PT-BR / variantes)
    nome?: string;
    descricao?: string;
    categoria?: string;
    preco_normal?: number;
    foto1?: string;
    foto2?: string;
    image?: string;
    foto?: string;
    is_active?: boolean;
    active?: boolean;
    created_at?: string;
}

export interface Batch {
    id: string;
    product_id: string;
    store_id: string;
    // Campos Backend (Snake Case / PT-BR)
    preco_normal_override?: number;
    preco_promocional?: number;
    desconto_percentual?: number;
    data_vencimento?: string;
    estoque_total?: number;
    disponivel?: number;
    active?: boolean;
    status?: string;
    
    // Campos Frontend (Camel Case - opcionais para compatibilidade)
    promo_price?: number;
    original_price?: number;
    expiration_date?: string;
    stock?: number;
    is_active?: boolean;
    discount_percent?: number;

    // Relacionamentos (o join do Supabase pode vir singular ou plural)
    product?: Product;
    products?: Product;
    store?: Store;
    stores?: Store;
}

// Batch com joins (product/products, store/stores) já populados quando disponível
export interface BatchWithRelations extends Batch {
    product?: Product;
    products?: Product;
    store?: Store;
    stores?: Store;
}

export interface CartItem {
    id?: string;
    quantity: number;
    price_snapshot?: number;
    
    // IDs de referência (podem variar conforme o endpoint)
    batch_id?: string;
    product_batch_id?: string;

    // Objeto populado
    batch?: BatchWithRelations;
    product_batches?: BatchWithRelations;
}

export interface Cart {
    id?: string;
    store_id?: string;
    store?: Store;
    stores?: Store;
    items: CartItem[];
    total: number;
}

// Multi-cart response (quando há carrinhos de múltiplas lojas)
export interface MultiCart {
    carts: Cart[];
    total: number;
}

// Tipos auxiliares para telas que dependem do join (ex: carrinho)
export interface CartItemWithRelations extends Omit<CartItem, 'batch' | 'product_batches'> {
    batch?: BatchWithRelations;
    product_batches?: BatchWithRelations;
}

export interface CartWithRelations extends Omit<Cart, 'items'> {
    items: CartItemWithRelations[];
}

export interface MultiCartWithRelations extends Omit<MultiCart, 'carts'> {
    carts: CartWithRelations[];
}

export interface Favorite {
    id: string; // favorite id
    product_batch_id: string; // batch id
    created_at?: string;
    product_batches: Batch;
}

export interface Payment {
    status?: 'pending' | 'paid' | 'cancelled' | string;
    paid_at?: string;
    pix_copy_paste_code?: string;
    pix_qr_code_image?: string;
    gross_value?: number;
    platform_fee?: number;
    store_value?: number;
}

export interface Order {
    id: string;
    customer_id?: string;
    store_id?: string;
    status: 'pending_payment' | 'paid' | 'picked_up' | 'cancelled' | string;
    total: number;
    total_amount?: number; // compat (algumas telas usam esse nome)
    pickup_code?: string;
    pickup_deadline?: string;
    paid_at?: string;
    picked_up_at?: string;
    cancelled_at?: string;
    created_at?: string;
    store?: Store;
    stores?: Store;
    customer?: User;
    customers?: any;
    payment?: Payment;
    payments?: Payment[];
    items?: OrderItem[];
    order_items?: any[];
}

export interface OrderItem {
    id: string;
    order_id?: string;
    batch_id?: string;
    product_batch_id?: string;
    quantity: number;
    unit_price?: number;
    price?: number;
    batch?: Batch;
    product_batches?: Batch;
}

// API Client
class ApiClient {
    private networkErrorCount: Map<string, number> = new Map();
    private lastNetworkErrorTime: Map<string, number> = new Map();

    private extractApiErrorMessage(payload: any, statusCode: number): string {
        const candidates = [
            payload?.message,
            payload?.error,
            payload?.msg,
            payload?.error_description,
            payload,
        ];

        for (const value of candidates) {
            if (!value) continue;

            if (Array.isArray(value)) {
                const parts = value
                    .map((v) => (typeof v === 'string' ? v : null))
                    .filter(Boolean) as string[];
                if (parts.length > 0) return parts.join(', ');
            }

            if (typeof value === 'string') {
                const trimmed = value.trim();
                if (trimmed) return trimmed;
            }
        }

        if (payload && typeof payload === 'object') {
            try {
                const asString = JSON.stringify(payload);
                if (asString && asString !== '{}') return asString;
            } catch {
                // ignore
            }
        }

        return `API Error: ${statusCode}`;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {},
        retryAuth: boolean = true
    ): Promise<T> {
        const token = await getAccessToken();

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        };

        const fullUrl = `${API_BASE_URL}${endpoint}`;
        const errorKey = `${endpoint}-${options.method || 'GET'}`;
        const now = Date.now();
        
        // Check if we should suppress logs due to repeated network errors
        const lastErrorTime = this.lastNetworkErrorTime.get(errorKey) || 0;
        const errorCount = this.networkErrorCount.get(errorKey) || 0;
        const timeSinceLastError = now - lastErrorTime;
        
        // Only log if it's been more than 5 seconds since last error or if error count is low
        const shouldLog = timeSinceLastError > 5000 || errorCount < 3;

        if (shouldLog) {
            console.log('[API] Fazendo requisição:', {
                method: options.method || 'GET',
                endpoint: fullUrl,
                hasToken: !!token
            });
        }
        
        const startTime = Date.now();
        
        try {
            const response = await fetch(fullUrl, {
                ...options,
                headers,
            });

            // 401 pode acontecer quando o token expira antes do refresh automático do Supabase.
            // Faz 1 tentativa de refresh e repete a requisição para evitar "Invalid token" intermitente.
            if (response.status === 401 && retryAuth && token) {
                const refreshed = await refreshAccessToken();
                if (refreshed && refreshed !== token) {
                    return this.request<T>(endpoint, options, false);
                }
            }
            
            // Reset error count on success
            if (errorCount > 0) {
                this.networkErrorCount.delete(errorKey);
                this.lastNetworkErrorTime.delete(errorKey);
            }
            
            const duration = Date.now() - startTime;
            
            if (shouldLog || response.ok) {
                console.log('[API] Resposta recebida:', {
                    status: response.status,
                    statusText: response.statusText,
                    duration: `${duration}ms`,
                    endpoint
                });
            }

            if (!response.ok) {
                const statusCode = response.status;
                const errorText = await response.text().catch(() => '');
                const errorPayload =
                    errorText && errorText.trim()
                        ? (() => {
                              try {
                                  return JSON.parse(errorText);
                              } catch {
                                  return { message: errorText };
                              }
                          })()
                        : {};

                const errorMessage = this.extractApiErrorMessage(errorPayload, statusCode);
                
                // Erros esperados (409 Conflict, 400 Bad Request, 403 Forbidden para role/permissões)
                // 403 é esperado quando usuário não tem permissão (ex: store_owner tentando acessar /me/cart)
                const isCartEndpoint = endpoint.includes('/cart');
                const isForbiddenRole = statusCode === 403 && (
                    errorMessage.includes('Insufficient role') || 
                    errorMessage.includes('Role not found') ||
                    isCartEndpoint
                );
                const isExpectedError = statusCode === 409 || statusCode === 400 || isForbiddenRole;
                
                if (isExpectedError) {
                    // Log silencioso para erros esperados (não logar como ERROR)
                    if (shouldLog && !isForbiddenRole) {
                        // Apenas logar erros esperados que não sejam 403 de role (para não poluir logs)
                        console.log('[API] Erro esperado na resposta:', {
                            status: statusCode,
                            statusText: response.statusText,
                            message: errorMessage,
                            endpoint
                        });
                    }
                } else if (shouldLog) {
                    console.error('[API] Erro na resposta:', {
                        status: statusCode,
                        statusText: response.statusText,
                        error: errorPayload,
                        endpoint
                    });
                }
                
                // Criar erro customizado que preserva o status code
                const apiError: any = new Error(errorMessage);
                apiError.status = statusCode;
                apiError.statusCode = statusCode;
                apiError.response = errorPayload;
                apiError.details = errorPayload?.details;
                throw apiError;
            }

            // Check if response has content before parsing JSON
            const text = await response.text();
            
            // If response is empty, return empty object/array based on endpoint
            if (!text || text.trim() === '') {
                // For cart endpoint, return empty cart structure
                if (endpoint.includes('/cart')) {
                    return { items: [], total: 0 } as T;
                }
                // For other endpoints, return empty object
                return {} as T;
            }

            // Try to parse JSON, but handle parse errors gracefully
            try {
                return JSON.parse(text) as T;
            } catch (parseError) {
                console.error(`[API] JSON parse error for ${endpoint}:`, parseError);
                console.error(`[API] Response text:`, text.substring(0, 200));
                
                // For cart endpoint, return empty cart on parse error
                if (endpoint.includes('/cart')) {
                    return { items: [], total: 0 } as T;
                }
                
                // Re-throw with more context
                throw new Error(`Failed to parse response from ${endpoint}: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
            }
        } catch (fetchError: any) {
            // Handle network errors (fetch failures, not HTTP errors)
            const isNetworkError = fetchError?.message?.includes('Network request failed') || 
                                 fetchError?.message?.includes('Failed to fetch') ||
                                 fetchError?.name === 'TypeError' ||
                                 fetchError?.message?.includes('timeout');
            
            if (isNetworkError) {
                const newErrorCount = errorCount + 1;
                this.networkErrorCount.set(errorKey, newErrorCount);
                this.lastNetworkErrorTime.set(errorKey, now);
                
                // Only log first few network errors to avoid spam
                // Para /me/cart e /public/batches, reduzir ainda mais os logs
                const isCartEndpoint = endpoint.includes('/cart');
                const isPublicBatches = endpoint.includes('/public/batches');
                const shouldLogError = shouldLog && (
                    isCartEndpoint ? newErrorCount === 1 : 
                    isPublicBatches ? newErrorCount <= 2 : 
                    newErrorCount <= 3
                );
                
                if (shouldLogError) {
                    // Log como informação, não como erro, para não poluir o console
                    console.log('[API] Erro de rede (esperado em conexões instáveis):', {
                        message: fetchError?.message,
                        endpoint,
                        attempt: newErrorCount
                    });
                }
            } else {
                // Verificar se é um erro HTTP esperado (409, 400, 403 para role/permissões)
                const isCartEndpoint = endpoint.includes('/cart');
                const isForbiddenRole = (fetchError?.status === 403 || fetchError?.statusCode === 403) && (
                    fetchError?.message?.includes('Insufficient role') || 
                    fetchError?.message?.includes('Role not found') ||
                    isCartEndpoint
                );
                const isExpectedHttpError = fetchError?.status === 409 || fetchError?.statusCode === 409 ||
                                          fetchError?.status === 400 || fetchError?.statusCode === 400 ||
                                          isForbiddenRole;
                
                if (!isExpectedHttpError) {
                    // Non-network errors should always be logged (exceto erros esperados)
                    console.error('[API] Erro na requisição:', {
                        message: fetchError?.message,
                        endpoint
                    });
                } else {
                    // Erros esperados já foram logados acima, não logar novamente
                    // Especialmente 403 de role não deve ser logado
                    if (!isForbiddenRole) {
                        console.log('[API] Erro esperado capturado (não logando como ERROR):', {
                            status: fetchError?.status || fetchError?.statusCode,
                            endpoint
                        });
                    }
                }
            }
            
            throw fetchError;
        }
    }

    // ==================== USER ====================

    async getMe(): Promise<User> {
        const response = await this.request<any>('/me');
        
        // Map backend fields (Portuguese) to frontend fields (English)
        // Similar to getProfile() but for /me endpoint
        return {
            id: response.id,
            email: response.email,
            name: response.nome || response.name,
            phone: response.telefone || response.phone,
            photo_url: response.foto_url || response.photo_url,
            role: response.role,
            lat: response.lat,
            lng: response.lng,
            radius_km: response.raio_padrao_km || response.radius_km || 5,
            profile_complete: response.profile_complete,
            created_at: response.created_at,
        };
    }

    async getProfile(): Promise<User & { customer?: { cpf?: string } }> {
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
            customer: customer ? { cpf: customer.cpf } : undefined,
        };
    }

    async updateProfile(data: Partial<User>): Promise<User> {
        // Map frontend fields (English) to backend fields (Portuguese)
        const backendData: any = {};
        
        if (data.role !== undefined) backendData.role = data.role;
        if (data.phone !== undefined) {
            // Backend armazena telefone limpo (somente dígitos)
            backendData.telefone = String(data.phone).replace(/\D/g, '');
        }
        if (data.name !== undefined) backendData.nome = data.name; // Map name -> nome
        if (data.photo_url !== undefined) backendData.foto_url = data.photo_url;
        
        return this.request('/me/profile', {
            method: 'PUT',
            body: JSON.stringify(backendData),
        });
    }

    async updateLocation(lat: number, lng: number, radius_km: number = 5, cpf?: string): Promise<User> {
        const body: any = { lat, lng, radius_km };
        if (cpf) {
            body.cpf = cpf;
        }
        return this.request('/me/location', {
            method: 'PUT',
            body: JSON.stringify(body),
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
        const response = await this.request<any>(`/public/stores/${id}`);
        
        // Map backend fields (Portuguese) to frontend fields (English)
        return {
            id: response.id,
            merchant_id: response.owner_id,
            name: response.nome || response.name,
            cnpj: response.cnpj,
            type: response.tipo || response.type,
            address: response.endereco || response.address,
            city: response.cidade || response.city,
            state: response.estado || response.state,
            zip: response.cep || response.zip,
            phone: response.telefone || response.phone,
            hours: response.hours || response.horario_funcionamento || 
                   (response.horario_abertura && response.horario_fechamento 
                    ? `${response.horario_abertura} - ${response.horario_fechamento}` 
                    : ''),
            pickup_deadline: response.horario_limite_retirada || response.pickup_deadline,
            lat: response.lat,
            lng: response.lng,
            logo_url: response.logo_url,
            is_active: response.active ?? response.is_active ?? true,
            is_premium: response.is_premium ?? false,
            asaas_wallet_id: response.asaas_wallet_id,
            created_at: response.created_at,
        };
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
        const batches = await this.request<any[]>(`/stores/${storeId}/batches`);
        return batches.map((batch: any) => this.mapBatchFields(batch));
    }

    async createBatch(storeId: string, data: Partial<Batch>): Promise<Batch> {
        // Mapear campos do frontend (EN) para backend (PT) antes de enviar
        const backendData: any = {
            product_id: data.product_id,
            expiration_date: data.expiration_date,
            promo_price: data.promo_price,
            stock: data.stock ?? data.estoque_total,
            original_price: data.original_price,
            discount_percent: data.discount_percent,
            is_active: data.is_active,
        };
        
        const batch = await this.request<any>(`/stores/${storeId}/batches`, {
            method: 'POST',
            body: JSON.stringify(backendData),
        });
        return this.mapBatchFields(batch);
    }

    async updateBatch(id: string, data: Partial<Batch>): Promise<Batch> {
        // Mapear campos do frontend (EN) para backend (PT) - UpdateBatchDto usa campos PT
        const backendData: any = {};
        if (data.product_id !== undefined) backendData.product_id = data.product_id;
        if (data.expiration_date !== undefined) backendData.data_vencimento = data.expiration_date;
        if (data.data_vencimento !== undefined) backendData.data_vencimento = data.data_vencimento;

        if (data.promo_price !== undefined) backendData.preco_promocional = data.promo_price;
        if (data.preco_promocional !== undefined) backendData.preco_promocional = data.preco_promocional;
        if (data.stock !== undefined || data.estoque_total !== undefined) {
            backendData.estoque_total = data.stock ?? data.estoque_total;
        }
        if (data.estoque_total !== undefined) backendData.estoque_total = data.estoque_total;
        if (data.status !== undefined) backendData.status = data.status;
        if (data.active !== undefined) backendData.active = data.active;
        if (data.is_active !== undefined) backendData.active = data.is_active;
        
        const batch = await this.request<any>(`/batches/${id}`, {
            method: 'PUT',
            body: JSON.stringify(backendData),
        });
        return this.mapBatchFields(batch);
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
        const batches = await this.request<any[]>(`/public/batches?${query}`);
        
        // Mapear campos do backend (português) para frontend (inglês)
        return batches.map((batch: any) => this.mapBatchFields(batch));
    }

    async getPublicBatch(id: string): Promise<Batch> {
        const batch = await this.request<any>(`/public/batches/${id}`);
        return this.mapBatchFields(batch);
    }

    // Helper para mapear campos de batch do backend (PT) para frontend (EN)
    private mapBatchFields(batch: any): Batch {
        // Backend pode retornar products (plural) ou product (singular)
        const products = batch.products || batch.product;
        const stores = batch.stores || batch.store;
        
        // Mapear produto com todos os campos possíveis
        const mappedProduct = products ? {
            ...products,
            id: products.id,
            name: products.nome ?? products.name,
            photo1: products.foto1 ?? products.photo1,
            photo2: products.foto2 ?? products.photo2,
            category: products.categoria ?? products.category,
            description: products.descricao ?? products.description,
            preco_normal: products.preco_normal,
        } : batch.product;
        
        // Mapear loja com todos os campos possíveis
        const mappedStore = stores ? {
            ...stores,
            id: stores.id,
            name: stores.nome ?? stores.name,
            address: stores.endereco ?? stores.address,
            logo_url: stores.logo_url,
            phone: stores.telefone ?? stores.phone,
            city: stores.cidade ?? stores.city,
            state: stores.estado ?? stores.state,
            zip: stores.cep ?? stores.zip,
            hours: stores.horario_funcionamento ?? stores.hours,
        } : batch.store;
        
        return {
            ...batch,
            promo_price: batch.preco_promocional ?? batch.promo_price,
            original_price: batch.preco_normal_override ?? products?.preco_normal ?? batch.original_price,
            expiration_date: batch.data_vencimento ?? batch.expiration_date,
            discount_percent: batch.desconto_percentual ?? batch.discount_percent,
            stock: batch.estoque_total ?? batch.stock,
            disponivel: batch.disponivel ?? batch.stock ?? batch.estoque_total ?? 0,
            estoque_total: batch.estoque_total ?? batch.stock ?? 0,
            is_active: batch.active ?? batch.is_active ?? batch.status === 'active',
            status: batch.status,
            // Manter ambos para compatibilidade
            product: mappedProduct,
            products: products, // Manter original também
            store: mappedStore,
            stores: stores, // Manter original também
        };
    }

    private mapOrderFields(order: any): Order {
        const stores = order?.store || order?.stores;
        const customersRel = order?.customer || order?.customers;
        const customerUser = customersRel?.users;
        const paymentsRaw: any[] = Array.isArray(order?.payments)
            ? order.payments
            : order?.payment
                ? [order.payment]
                : [];

        const primaryPayment = paymentsRaw[0];
        const payment: Payment | undefined = primaryPayment
            ? {
                ...primaryPayment,
                status: primaryPayment.status,
                paid_at: primaryPayment.paid_at,
                pix_copy_paste_code:
                    primaryPayment.pix_copy_paste_code ??
                    primaryPayment.copy_paste_code ??
                    primaryPayment.pix_code,
                pix_qr_code_image:
                    primaryPayment.pix_qr_code_image ??
                    primaryPayment.qr_code_image ??
                    primaryPayment.pix_qrcode,
                gross_value:
                    primaryPayment.gross_value !== undefined
                        ? Number(primaryPayment.gross_value)
                        : primaryPayment.grossValue !== undefined
                            ? Number(primaryPayment.grossValue)
                            : undefined,
                platform_fee:
                    primaryPayment.platform_fee !== undefined
                        ? Number(primaryPayment.platform_fee)
                        : primaryPayment.platformFee !== undefined
                            ? Number(primaryPayment.platformFee)
                            : undefined,
                store_value:
                    primaryPayment.store_value !== undefined
                        ? Number(primaryPayment.store_value)
                        : primaryPayment.storeValue !== undefined
                            ? Number(primaryPayment.storeValue)
                            : undefined,
            }
            : undefined;

        const itemsRaw: any[] = Array.isArray(order?.items)
            ? order.items
            : Array.isArray(order?.order_items)
                ? order.order_items
                : [];

        const mappedItems: OrderItem[] = itemsRaw.map((item: any) => {
            const batchRaw = item.batch || item.product_batches;
            const productBatches = item.product_batches || item.batch;
            const products = productBatches?.products || productBatches?.product;

            return {
                ...item,
                order_id: item.order_id ?? order.id,
                product_batch_id: item.product_batch_id ?? item.batch_id,
                batch_id: item.product_batch_id ?? item.batch_id,
                unit_price: item.unit_price ?? item.price,
                price: item.price ?? item.unit_price,
                batch: batchRaw
                    ? {
                        ...productBatches,
                        id: productBatches.id,
                        promo_price: productBatches.preco_promocional ?? productBatches.promo_price,
                        expiration_date: productBatches.data_vencimento ?? productBatches.expiration_date,
                        store_id: productBatches.store_id,
                        product: products
                            ? {
                                ...products,
                                name: products.nome ?? products.name,
                                photo1: products.foto1 ?? products.photo1 ?? products.foto ?? products.image,
                            }
                            : productBatches.product,
                    }
                    : item.batch,
                product_batches: item.product_batches,
                quantity: item.quantity,
            };
        });

        const mappedStore = stores
            ? {
                ...stores,
                id: stores.id,
                name: stores.nome ?? stores.name,
                address: stores.endereco ?? stores.address,
                city: stores.cidade ?? stores.city,
                state: stores.estado ?? stores.state,
                zip: stores.cep ?? stores.zip,
                phone: stores.telefone ?? stores.phone,
                hours: stores.horario_funcionamento ?? stores.hours,
            }
            : order.store;

        const total = Number(order.total_amount ?? order.total ?? 0);
        const mappedCustomer: User | undefined = customerUser
            ? {
                id: customersRel?.user_id ?? customerUser.id,
                email: customerUser.email,
                name: customerUser.nome ?? customerUser.name,
                phone: customerUser.telefone ?? customerUser.phone,
                photo_url: customerUser.foto_url ?? customerUser.photo_url,
                role: 'customer',
            }
            : undefined;

        return {
            ...order,
            total,
            total_amount: order.total_amount ?? total,
            store: mappedStore,
            stores: stores,
            customer: mappedCustomer,
            customers: customersRel,
            payment,
            payments: paymentsRaw,
            items: mappedItems,
            order_items: order.order_items,
        };
    }

    // ==================== FAVORITES ====================

    async getFavorites(): Promise<Favorite[]> {
        const rows = await this.request<any[]>('/me/favorites');
        return (rows || []).map((row: any) => ({
            id: row.id,
            product_batch_id: row.product_batch_id,
            created_at: row.created_at,
            product_batches: this.mapBatchFields(row.product_batches),
        }));
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

    async removeFavoriteByBatch(batchId: string): Promise<void> {
        return this.request(`/me/favorites/batch/${batchId}`, {
            method: 'DELETE',
        });
    }

    // ==================== CART ====================

    // Helper para mapear items do carrinho
    private mapCartItems(items: any[]): CartItem[] {
        return (items || []).map((item: any) => {
            const productBatches = item.product_batches || item.batch;
            const products = productBatches?.products || productBatches?.product;
            const stores = productBatches?.stores || productBatches?.store;
            
            return {
                ...item,
                batch_id: item.product_batch_id || item.batch_id,
                quantity: item.quantity,
                batch: productBatches ? {
                    ...productBatches,
                    id: productBatches.id,
                    promo_price: productBatches.preco_promocional || productBatches.promo_price,
                    original_price: productBatches.preco_normal_override || productBatches.original_price,
                    expiration_date: productBatches.data_vencimento || productBatches.expiration_date,
                    store_id: productBatches.store_id,
                    stock: productBatches.disponivel ?? productBatches.stock ?? productBatches.estoque_total ?? 0,
                    disponivel: productBatches.disponivel ?? productBatches.stock ?? productBatches.estoque_total ?? 0,
                    estoque_total: productBatches.estoque_total ?? productBatches.stock ?? 0,
                    product: products ? {
                        ...products,
                        name: products.nome || products.name,
                        photo1: products.foto1 || products.photo1 || products.foto || products.image,
                    } : productBatches.product,
                    store: stores ? {
                        ...stores,
                        id: stores.id,
                        name: stores.nome ?? stores.name,
                        address: stores.endereco ?? stores.address,
                    } : productBatches.store,
                } : item.batch,
            };
        });
    }

    // Helper para mapear um carrinho individual
    private mapCart(cart: any): Cart {
        const storeData = cart.stores || cart.store;
        const items = cart.items || [];
        
        // Se não tem items, retornar carrinho vazio
        if (!items || items.length === 0) {
            return {
                id: cart.id,
                store_id: cart.store_id,
                store: storeData ? {
                    id: storeData.id,
                    name: storeData.nome ?? storeData.name,
                    address: storeData.endereco ?? storeData.address,
                    logo_url: storeData.logo_url,
                    phone: storeData.telefone ?? storeData.phone,
                } : undefined,
                items: [],
                total: 0,
            };
        }
        
        return {
            id: cart.id,
            store_id: cart.store_id,
            store: storeData ? {
                id: storeData.id,
                name: storeData.nome ?? storeData.name,
                address: storeData.endereco ?? storeData.address,
                logo_url: storeData.logo_url,
                phone: storeData.telefone ?? storeData.phone,
            } : undefined,
            items: this.mapCartItems(items),
            total: cart.total || 0,
        };
    }

    /**
     * Retorna o carrinho do cliente
     * Pode retornar Cart (único carrinho) ou MultiCart (múltiplos carrinhos de lojas diferentes)
     */
    async getCart(): Promise<Cart | MultiCart> {
        try {
            const response = await this.request<any>('/me/cart');
            
            if (!response || response === null) {
                return { items: [], total: 0 };
            }
            
            // Verificar se é resposta multi-carrinho (tem array 'carts')
            if (response.carts && Array.isArray(response.carts)) {
                return {
                    carts: response.carts.map((cart: any) => this.mapCart(cart)),
                    total: response.total || 0,
                };
            }
            
            // Resposta de carrinho único
            if (!response.items && !response.id) {
                return { items: [], total: 0 };
            }
            
            return this.mapCart(response);
        } catch (error: any) {
            const isForbidden = error?.status === 403 || error?.statusCode === 403;
            const isNetworkError = error?.message?.includes('Network request failed') || 
                                 error?.message?.includes('Failed to fetch');
            
            if (isForbidden) {
                return { items: [], total: 0 };
            }
            
            if (!isNetworkError) {
                console.error('[API] getCart erro:', {
                    message: error?.message,
                    endpoint: '/me/cart'
                });
            }
            throw error;
        }
    }

    /**
     * Helper para verificar se é MultiCart
     */
    isMultiCart(cart: Cart | MultiCart): cart is MultiCart {
        return 'carts' in cart && Array.isArray(cart.carts);
    }

    /**
     * Converte Cart ou MultiCart para array de carrinhos
     */
    getCartsArray(cart: Cart | MultiCart): Cart[] {
        if (this.isMultiCart(cart)) {
            return cart.carts;
        }
        // Se é Cart único com items, retorna como array
        if (cart.items && cart.items.length > 0) {
            return [cart];
        }
        return [];
    }

    /**
     * Achata todos os itens (Cart ou MultiCart) em um array único.
     */
    getAllCartItems(cart: Cart | MultiCart): CartItem[] {
        return this.getCartsArray(cart).flatMap((c) => c.items || []);
    }

    /**
     * Encontra um item no carrinho (Cart ou MultiCart) pelo batchId.
     */
    findCartItem(cart: Cart | MultiCart, batchId: string): CartItem | undefined {
        return this.getAllCartItems(cart).find((item) => {
            const itemBatchId = item.batch_id || item.product_batch_id;
            return itemBatchId === batchId;
        });
    }

    async addToCart(batchId: string, quantity: number = 1, replaceCart: boolean = false): Promise<Cart | MultiCart> {
        console.log('[API] addToCart chamado:', { batchId, quantity, replaceCart });
        try {
            const response = await this.request<any>('/me/cart/add-item', {
                method: 'POST',
                body: JSON.stringify({ 
                    batch_id: batchId, 
                    quantity,
                    replace_cart: replaceCart 
                }),
            });
            
            // Verificar se é resposta multi-carrinho
            if (response.carts && Array.isArray(response.carts)) {
                console.log('[API] addToCart sucesso (multi-cart):', {
                    cartsCount: response.carts.length,
                    total: response.total || 0
                });
                return {
                    carts: response.carts.map((cart: any) => this.mapCart(cart)),
                    total: response.total || 0,
                };
            }
            
            console.log('[API] addToCart sucesso:', {
                hasItems: !!response?.items,
                itemsCount: response?.items?.length || 0,
                total: response?.total || 0
            });
            return this.mapCart(response);
        } catch (error: any) {
            const isExpectedError = error?.status === 409 || error?.statusCode === 409;
            
            if (isExpectedError) {
                console.log('[API] addToCart erro esperado:', {
                    message: error?.message,
                    status: error?.status || error?.statusCode,
                    batchId
                });
            } else {
                console.error('[API] addToCart erro:', {
                    message: error?.message,
                    batchId,
                    quantity,
                    replaceCart
                });
            }
            throw error;
        }
    }

    async updateCartItemQuantity(batchId: string, quantity: number): Promise<Cart | MultiCart> {
        const response = await this.request<any>(`/me/cart/items/${batchId}/quantity`, {
            method: 'PUT',
            body: JSON.stringify({ quantity }),
        });
        
        if (response.carts && Array.isArray(response.carts)) {
            return {
                carts: response.carts.map((cart: any) => this.mapCart(cart)),
                total: response.total || 0,
            };
        }
        return this.mapCart(response);
    }

    async removeFromCart(batchId: string): Promise<Cart | MultiCart> {
        const response = await this.request<any>('/me/cart/remove-item', {
            method: 'POST',
            body: JSON.stringify({ product_batch_id: batchId }),
        });
        
        console.log('[API] removeFromCart response:', {
            hasCarts: !!(response?.carts),
            cartsCount: response?.carts?.length || 0,
            hasItems: !!(response?.items),
            itemsCount: response?.items?.length || 0,
            responseKeys: Object.keys(response || {}),
        });
        
        // Se é multi-cart
        if (response.carts && Array.isArray(response.carts)) {
            // Filtrar carrinhos vazios
            const validCarts = response.carts
                .map((cart: any) => this.mapCart(cart))
                .filter((cart: Cart) => cart.items && cart.items.length > 0);
            
            const total = validCarts.reduce((sum: number, cart: Cart) => sum + (cart.total || 0), 0);
            
            // Se todos os carrinhos foram removidos, retornar vazio
            if (validCarts.length === 0) {
                return { carts: [], total: 0 };
            }
            
            return {
                carts: validCarts,
                total,
            };
        }
        
        // Se retornou vazio ou formato antigo
        if (!response || response.cart === null || (!response.items && !response.carts)) {
            return { items: [], total: 0 };
        }
        
        const mappedCart = this.mapCart(response);
        
        // Se o carrinho mapeado está vazio, retornar formato vazio
        if (!mappedCart.items || mappedCart.items.length === 0) {
            return { items: [], total: 0 };
        }
        
        return mappedCart;
    }

    async clearCart(): Promise<void> {
        return this.request('/me/cart/clear', {
            method: 'POST',
        });
    }

    async reserveCart(storeId?: string): Promise<void> {
        return this.request('/me/cart/reserve', {
            method: 'POST',
            body: storeId ? JSON.stringify({ store_id: storeId }) : undefined,
        });
    }

    // ==================== ORDERS ====================

    async createOrder(storeId?: string): Promise<Order> {
        const order = await this.request<any>('/me/orders', {
            method: 'POST',
            body: storeId ? JSON.stringify({ store_id: storeId }) : undefined,
        });
        return this.mapOrderFields(order);
    }

    async getMyOrders(): Promise<Order[]> {
        const orders = await this.request<any[]>('/me/orders');
        return (orders || []).map((o: any) => this.mapOrderFields(o));
    }

    async getMyOrder(id: string): Promise<Order> {
        const order = await this.request<any>(`/me/orders/${id}`);
        return this.mapOrderFields(order);
    }

    async getStoreOrders(storeId: string): Promise<Order[]> {
        const orders = await this.request<any[]>(`/stores/${storeId}/orders`);
        return (orders || []).map((o: any) => this.mapOrderFields(o));
    }

    async getStoreOrder(storeId: string, orderId: string): Promise<Order> {
        const order = await this.request<any>(`/stores/${storeId}/orders/${orderId}`);
        return this.mapOrderFields(order);
    }

    async confirmPickup(storeId: string, orderId: string, pickupCode: string): Promise<Order> {
        return this.request(`/stores/${storeId}/orders/${orderId}/pickup`, {
            method: 'POST',
            body: JSON.stringify({ pickup_code: pickupCode }),
        });
    }

    // ==================== PAYMENTS ====================

    async checkout(orderId: string): Promise<{
        payment_id: string;
        order_id: string;
        status: string;
        pix: { qr_code_image?: string; copy_paste_code?: string };
    }> {
        return this.request('/me/payments/checkout', {
            method: 'POST',
            body: JSON.stringify({ order_id: orderId }),
        });
    }

    async mockConfirmPayment(orderId: string): Promise<{ ok: boolean }> {
        return this.request('/me/payments/mock-confirm', {
            method: 'POST',
            body: JSON.stringify({ order_id: orderId }),
        });
    }

    // ==================== MEDIA ====================

    async getProductMedia(productId: string): Promise<{ id: string; url: string; type: string }[]> {
        return this.request(`/products/${productId}/media`);
    }

    /**
     * Obtém URL assinada para upload direto ao storage.
     * Retorna { path, signedUrl } onde:
     * - signedUrl: use para fazer PUT do arquivo
     * - path: envie para createMedia após upload
     */
    async getUploadUrl(productId: string, ext: string = 'jpg'): Promise<{ path: string; signedUrl: string }> {
        return this.request(`/products/${productId}/media/upload-url`, {
            method: 'POST',
            body: JSON.stringify({ ext }),
        });
    }

    /**
     * Faz upload direto do arquivo para o storage usando a URL assinada
     */
    async uploadFile(signedUrl: string, file: Blob | File): Promise<void> {
        const response = await fetch(signedUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type || 'image/jpeg',
            },
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }
    }

    /**
     * Cria registro de mídia após upload bem-sucedido.
     * Pode receber path (do storage) ou URL completa.
     * Se enviar path, o backend gera a URL pública automaticamente.
     */
    async createMedia(productId: string, urlOrPath: string, type?: string): Promise<void> {
        return this.request(`/products/${productId}/media`, {
            method: 'POST',
            body: JSON.stringify({
                url: urlOrPath,
                tipo: type,
            }),
        });
    }

    async deleteMedia(productId: string, mediaId: string): Promise<void> {
        return this.request(`/products/${productId}/media/${mediaId}`, {
            method: 'DELETE',
        });
    }

    // ==================== NOTIFICATIONS ====================

    /**
     * Registra token de push notification para o usuário autenticado
     */
    async registerNotificationToken(token: string, platform: 'ios' | 'android' | 'web'): Promise<void> {
        return this.request('/notifications/register', {
            method: 'POST',
            body: JSON.stringify({ token, platform }),
        });
    }

    /**
     * Remove token de push notification
     */
    async unregisterNotificationToken(token: string): Promise<void> {
        return this.request('/notifications/unregister', {
            method: 'DELETE',
            body: JSON.stringify({ token }),
        });
    }
}

export const api = new ApiClient();
