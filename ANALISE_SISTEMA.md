# Análise Completa do Sistema VenceJá

## 📱 Visão Geral

Sistema de marketplace mobile para produtos próximos do vencimento, composto por:
- **Frontend Mobile**: React Native com Expo Router (TypeScript)
- **Backend**: NestJS (TypeScript) com API REST
- **Banco de Dados**: Supabase (PostgreSQL) com Row Level Security (RLS)

---

## 🏗️ Arquitetura

### Frontend Mobile (`/my-app`)
- **Framework**: Expo Router (file-based routing)
- **Estado Global**: React Context (AuthContext, CartContext)
- **Autenticação**: Supabase Auth (Google OAuth)
- **API Client**: Cliente REST customizado (`services/api.ts`)
- **Configuração**: `constants/config.ts` - API_BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY

### Backend (`/backend-venceja2025`)
- **Framework**: NestJS
- **Porta**: 3000 (0.0.0.0 - aceita conexões de qualquer IP)
- **Autenticação**: JWT do Supabase via `Authorization: Bearer <token>`
- **CORS**: Habilitado para todos os origins
- **Swagger**: Disponível em `/docs`

---

## 🗄️ Banco de Dados (Supabase)

### Tabelas Principais

#### 1. `users`
- `id` (uuid, PK, FK → auth.users)
- `role` ('customer' | 'store_owner' | null)
- `nome`, `email`, `telefone`, `foto_url`
- `created_at`

#### 2. `customers`
- `user_id` (uuid, PK, FK → users)
- `location_lat`, `location_lng`
- `raio_padrao_km` (default: 5)

#### 3. `stores`
- `id` (uuid, PK)
- `owner_id` (FK → users)
- `cnpj` (unique)
- `nome`, `tipo`, `endereco`
- `lat`, `lng`
- `horario_abertura`, `horario_fechamento`
- `asaas_wallet_id`
- `active` (boolean)

#### 4. `products`
- `id` (uuid, PK)
- `store_id` (FK → stores)
- `nome`, `descricao`, `categoria`
- `preco_normal`
- `active` (boolean)

#### 5. `product_media`
- `id` (uuid, PK)
- `product_id` (FK → products)
- `tipo`, `url`

#### 6. `product_batches` (Lotes de produtos)
- `id` (uuid, PK)
- `product_id` (FK → products)
- `store_id` (FK → stores)
- `data_vencimento` (date)
- `preco_promocional`
- `estoque_total`, `estoque_reservado`, `estoque_vendido`
- `status` ('active' | 'expired' | 'sold_out')
- `disponivel` (generated: estoque_total - estoque_reservado - estoque_vendido)

#### 7. `favorites`
- `id` (uuid, PK)
- `customer_id` (FK → customers)
- `product_batch_id` (FK → product_batches)
- Unique: (customer_id, product_batch_id)

#### 8. `carts`
- `id` (uuid, PK)
- `customer_id` (FK → customers)
- `store_id` (FK → stores)
- `status` ('open' | 'reserved' | 'expired' | 'converted')
- `reserved_until` (timestamptz)

#### 9. `cart_items`
- `id` (uuid, PK)
- `cart_id` (FK → carts)
- `product_batch_id` (FK → product_batches)
- `quantity`
- `price_snapshot`
- Unique: (cart_id, product_batch_id)

#### 10. `orders`
- `id` (uuid, PK)
- `customer_id` (FK → customers)
- `store_id` (FK → stores)
- `status` ('pending_payment' | 'paid' | 'picked_up' | 'cancelled')
- `total`
- `pickup_code`, `pickup_deadline`
- `paid_at`

#### 11. `order_items`
- `id` (uuid, PK)
- `order_id` (FK → orders)
- `product_batch_id` (FK → product_batches)
- `quantity`, `price`

#### 12. `payments`
- `id` (uuid, PK)
- `order_id` (FK → orders)
- `asaas_payment_id`
- `status` ('pending' | 'paid' | 'cancelled')
- `gross_value`, `platform_fee`, `store_value`
- `paid_at`

### Row Level Security (RLS)
- Todas as tabelas têm RLS habilitado
- Usuários só podem acessar seus próprios dados
- Service role tem acesso total
- Stores/products/batches públicos quando `active = true`

---

## 🔐 Autenticação

### Fluxo de Autenticação
1. Usuário faz login com Google OAuth via Supabase
2. Supabase retorna JWT token
3. Frontend armazena token no AsyncStorage (mobile) ou localStorage (web)
4. Backend valida token via `AuthGuard` em cada requisição
5. Backend busca role do usuário na tabela `users`

### Endpoints de Auth
- **Frontend**: `/app/index.tsx` (LoginScreen)
- **Callback**: `/app/auth/callback.tsx` (processa OAuth callback)
- **Select Role**: `/app/select-role.tsx` (escolhe customer ou merchant)

---

## 📍 Rotas do Backend (NestJS)

### Base URL: `http://192.168.10.7:3000`

#### 👤 Usuários (`UsersController`)
- `GET /me` - Obter usuário atual (cria se não existir)
- `GET /me/profile` - Obter perfil completo
- `PUT /me/profile` - Atualizar perfil (inclui role)
- `PUT /me/location` - Atualizar localização (customer only)

#### 🏪 Lojas (`StoresController`)
- `GET /stores/me` - Listar minhas lojas (store_owner)
- `POST /stores` - Criar loja (store_owner)
- `PUT /stores/:id` - Atualizar loja (store_owner)
- `GET /stores/:id` - Obter loja (store_owner)
- `GET /stores/:id/orders/summary` - Resumo de pedidos (store_owner)
- `GET /public/stores/:id` - Obter loja pública (sem auth)

#### 📦 Produtos (`ProductsController`)
- `GET /stores/:storeId/products` - Listar produtos da loja (store_owner)
- `POST /stores/:storeId/products` - Criar produto (store_owner)
- `PUT /products/:id` - Atualizar produto (store_owner)
- `DELETE /products/:id` - Deletar produto (store_owner)

#### 📊 Lotes (`BatchesController`)
- `GET /stores/:storeId/batches` - Listar lotes da loja (store_owner)
- `POST /stores/:storeId/batches` - Criar lote (store_owner)
- `PUT /batches/:id` - Atualizar lote (store_owner)
- `GET /public/batches` - Listar lotes públicos (filtros: categoria, desconto_min, vence_em, store_id, lat, lng, raio_km)
- `GET /public/batches/:id` - Obter lote público

#### 🛒 Carrinho (`CartsController`) - Customer only
- `GET /me/cart` - Obter carrinho
- `POST /me/cart/add-item` - Adicionar item
- `PUT /me/cart/items/:batchId/quantity` - Atualizar quantidade
- `POST /me/cart/remove-item` - Remover item
- `POST /me/cart/clear` - Limpar carrinho
- `POST /me/cart/reserve` - Reservar carrinho

#### ❤️ Favoritos (`FavoritesController`) - Customer only
- `GET /me/favorites` - Listar favoritos
- `POST /me/favorites` - Adicionar favorito
- `DELETE /me/favorites/:id` - Remover favorito

#### 📋 Pedidos (`OrdersController`)
- `POST /me/orders` - Criar pedido do carrinho (customer)
- `GET /me/orders` - Listar meus pedidos (customer)
- `GET /me/orders/:id` - Obter pedido (customer)
- `GET /stores/:storeId/orders` - Listar pedidos da loja (store_owner)
- `GET /stores/:storeId/orders/:id` - Obter pedido da loja (store_owner)
- `POST /stores/:storeId/orders/:id/pickup` - Confirmar retirada (store_owner)

#### 💳 Pagamentos (`PaymentsController`)
- `POST /me/payments/checkout` - Criar checkout PIX (customer)
- `POST /payments/asaas-webhook` - Webhook do Asaas (público)

#### 🖼️ Mídia (`MediaController`) - Store owner only
- `GET /products/:productId/media` - Listar mídias
- `POST /products/:productId/media` - Criar mídia
- `POST /products/:productId/media/upload-url` - Obter URL de upload
- `DELETE /products/:productId/media/:id` - Remover mídia

---

## 📱 Rotas do Frontend (Expo Router)

### Estrutura de Rotas

```
app/
├── index.tsx                    # Login Screen
├── select-role.tsx              # Seleção de role (customer/merchant)
├── auth/
│   └── callback.tsx            # OAuth callback handler
├── (customer)/                  # Grupo de rotas do cliente
│   ├── _layout.tsx             # Tab Navigator
│   ├── index.tsx               # Vitrine (lista de batches)
│   ├── cart.tsx                # Carrinho
│   ├── favorites.tsx           # Favoritos
│   ├── orders.tsx              # Pedidos
│   ├── profile.tsx             # Perfil
│   └── setup.tsx               # Setup inicial
├── (merchant)/                  # Grupo de rotas do merchant
│   ├── _layout.tsx             # Tab Navigator
│   ├── index.tsx               # Dashboard
│   ├── stores.tsx              # Lista de lojas
│   ├── products.tsx            # Lista de produtos
│   ├── sales.tsx               # Vendas
│   ├── profile.tsx             # Perfil
│   ├── create-store.tsx        # Criar loja (modal)
│   └── create-product.tsx      # Criar produto (modal)
├── product/
│   └── [id].tsx                # Detalhes do produto/batch
├── checkout/
│   └── [storeId].tsx           # Checkout do carrinho
└── order/
    └── [id].tsx                # Detalhes do pedido
```

### Navegação
- **Customer**: Tab Navigator com 5 tabs (Vitrine, Carrinho, Favoritos, Pedidos, Perfil)
- **Merchant**: Tab Navigator com 4 tabs (Dashboard, Vendas, Lojas, Perfil)
- **Modais**: create-store, create-product (não aparecem na tab bar)

---

## 🔄 Fluxos Principais

### 1. Fluxo de Login
1. Usuário acessa `/` (LoginScreen)
2. Clica em "Entrar com Google"
3. Redireciona para OAuth do Google
4. Google retorna para `/auth/callback`
5. Callback processa token e cria sessão
6. Se role não definido → `/select-role`
7. Se role definido → redireciona para grupo apropriado

### 2. Fluxo de Compra (Customer)
1. **Vitrine** (`/(customer)/index.tsx`): Lista batches públicos com filtros
2. **Produto** (`/product/[id].tsx`): Detalhes do batch
3. **Adicionar ao Carrinho**: `POST /me/cart/add-item`
4. **Carrinho** (`/(customer)/cart.tsx`): Ver itens, atualizar quantidades
5. **Checkout** (`/checkout/[storeId].tsx`): Criar pedido
6. **Pagamento**: `POST /me/payments/checkout` → retorna PIX code
7. **Pedidos** (`/(customer)/orders.tsx`): Listar pedidos
8. **Detalhes** (`/order/[id].tsx`): Ver pedido, código PIX, status

### 3. Fluxo de Venda (Merchant)
1. **Dashboard** (`/(merchant)/index.tsx`): Resumo de vendas
2. **Criar Loja** (`/(merchant)/create-store.tsx`): Cadastrar loja
3. **Criar Produto** (`/(merchant)/create-product.tsx`): Cadastrar produto
4. **Criar Lote** (via produtos): Criar batch com preço promocional
5. **Vendas** (`/(merchant)/sales.tsx`): Listar pedidos da loja
6. **Confirmar Retirada**: `POST /stores/:storeId/orders/:id/pickup`

### 4. Fluxo de Carrinho
- **Cache**: 10 segundos de validade
- **Debounce**: 500ms entre requisições
- **Estados**: open → reserved → converted
- **Reserva**: Reserva estoque por tempo limitado
- **Expiração**: Carrinhos expirados são limpos automaticamente

---

## 🔧 Serviços e Contextos

### Frontend

#### `AuthContext` (`contexts/AuthContext.tsx`)
- Gerencia sessão do usuário
- Busca perfil do backend
- Refresh automático de token
- Logout com limpeza de estado

#### `CartContext` (`contexts/CartContext.tsx`)
- Cache de carrinho (10s)
- Contador de itens (badge)
- Debounce de requisições
- Otimistic updates

#### `services/api.ts`
- Cliente HTTP centralizado
- Mapeamento de campos PT ↔ EN
- Tratamento de erros
- Logging inteligente (evita spam)

#### `services/supabase.ts`
- Cliente Supabase configurado
- Storage customizado (AsyncStorage/LocalStorage)
- Funções de auth (signIn, signOut, getSession)

### Backend

#### `SupabaseService`
- Cliente Supabase (anon + service role)
- Validação de JWT tokens

#### `AuthGuard`
- Valida token em todas as rotas protegidas
- Adiciona `user` ao request com role do banco

#### `RolesGuard`
- Verifica role do usuário
- Usado junto com `@Roles()` decorator

---

## 🎨 UI/UX

### Design System
- **Cores**: `constants/Colors.ts`
- **Tema**: `constants/theme.ts`
- **Componentes**: Glass morphism (GlassInput, GradientBackground, GradientButton)
- **Ícones**: Ionicons (@expo/vector-icons)

### Componentes Reutilizáveis
- `ProductCard.tsx` - Card de produto/batch
- `SalesChart.tsx` - Gráfico de vendas
- `ProfileRequiredModal.tsx` - Modal de perfil incompleto
- `SelectInput.tsx` - Select customizado

---

## 🔌 Integrações

### Supabase
- **Auth**: Google OAuth
- **Database**: PostgreSQL com RLS
- **Storage**: Product images (bucket: `product-images`)

### Asaas (Pagamentos)
- **Checkout**: Gera código PIX
- **Webhook**: Recebe confirmações de pagamento
- **Wallet ID**: Armazenado em `stores.asaas_wallet_id`

---

## 📝 Observações Importantes

### Mapeamento de Campos
- **Backend usa português**: `nome`, `telefone`, `preco_promocional`, `data_vencimento`, etc.
- **Frontend usa inglês**: `name`, `phone`, `promo_price`, `expiration_date`, etc.
- **Mapeamento**: Feito em `services/api.ts` (método `mapBatchFields`)

### Estados de Pedidos
- `pending_payment` → Aguardando pagamento
- `paid` → Pago (aguardando retirada)
- `picked_up` → Retirado
- `cancelled` → Cancelado

### Estados de Batches
- `active` → Ativo e disponível
- `expired` → Expirado
- `sold_out` → Esgotado

### Reserva de Estoque
- Quando item é adicionado ao carrinho, `estoque_reservado` aumenta
- Quando pedido é criado, `estoque_reservado` → `estoque_vendido`
- `disponivel = estoque_total - estoque_reservado - estoque_vendido`

### Cache e Performance
- Carrinho tem cache de 10s
- Debounce de 500ms em atualizações
- Logging reduzido para evitar spam
- Timeout de 1s em requisições de carrinho

---

## 🚀 Configuração

### Frontend (`constants/config.ts`)
```typescript
API_BASE_URL = 'http://192.168.10.7:3000'
SUPABASE_URL = 'https://rkmvrfqhcleibdtlcwwh.supabase.co'
SUPABASE_ANON_KEY = '...'
GOOGLE_CLIENT_ID = '...'
```

### Backend (`.env`)
```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STORAGE_BUCKET=product-images
```

---

## 📊 Resumo de Endpoints

### Públicos (sem auth)
- `GET /public/stores/:id`
- `GET /public/batches`
- `GET /public/batches/:id`
- `POST /payments/asaas-webhook`

### Customer (role: customer)
- Todos os endpoints `/me/*`
- `/me/cart/*`
- `/me/favorites/*`
- `/me/orders/*`
- `/me/payments/*`

### Store Owner (role: store_owner)
- `/stores/*`
- `/products/*`
- `/batches/*`
- `/stores/:id/orders/*`

---

## ✅ Checklist de Funcionalidades

### Customer
- [x] Login com Google
- [x] Seleção de role
- [x] Vitrine de produtos
- [x] Filtros (categoria, desconto, vencimento, localização)
- [x] Detalhes do produto
- [x] Adicionar ao carrinho
- [x] Gerenciar carrinho
- [x] Favoritos
- [x] Checkout
- [x] Pagamento PIX
- [x] Listar pedidos
- [x] Ver detalhes do pedido
- [x] Perfil e localização

### Merchant
- [x] Login com Google
- [x] Dashboard com resumo
- [x] Criar/editar loja
- [x] Criar/editar produtos
- [x] Criar/editar lotes
- [x] Listar vendas
- [x] Confirmar retirada
- [x] Perfil

---

**Última atualização**: Análise completa do sistema VenceJá
**Data**: 2025-01-15
