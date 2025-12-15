# 📱 Análise Completa do Sistema VenceJá

## 🏗️ Arquitetura Geral

O sistema é composto por **dois componentes principais**:

1. **Mobile App (React Native + Expo)**: `/Users/andrewoliveira/.gemini/antigravity/playground/my-app`
2. **Backend API (NestJS)**: `/Users/andrewoliveira/.gemini/antigravity/playground/backend/backend-venceja2025`

### Stack Tecnológica

**Mobile:**
- React Native 0.81.5
- Expo Router (file-based routing)
- TypeScript
- Supabase Client (autenticação)
- Context API (AuthContext, CartContext)

**Backend:**
- NestJS 10.x
- TypeScript
- Supabase (banco de dados PostgreSQL)
- Asaas (gateway de pagamento PIX)
- Swagger (documentação API)

**Banco de Dados:**
- PostgreSQL (Supabase)
- Row Level Security (RLS) habilitado
- Políticas de segurança por tabela

---

## 🔐 Autenticação e Autorização

### Fluxo de Autenticação

1. **Login via Google OAuth**:
   - Mobile usa `expo-auth-session` para autenticar com Google
   - Recebe `idToken` do Google
   - Envia para Supabase: `supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })`
   - Supabase retorna `session` com JWT

2. **Primeira vez no sistema**:
   - Backend cria usuário em `users` (role = `null` inicialmente)
   - Mobile redireciona para `/select-role`
   - Usuário escolhe: `customer` ou `store_owner`
   - Mobile chama `PUT /me/profile` com `role`
   - Backend atualiza `users.role` e cria perfil específico:
     - Se `customer`: cria registro em `customers`
     - Se `store_owner`: apenas atualiza `users.role`

3. **Autenticação em requisições**:
   - Mobile envia JWT no header: `Authorization: Bearer <token>`
   - Backend `AuthGuard` valida token via `SupabaseService.validateToken()`
   - Backend busca role do usuário em `users` e adiciona ao `request.user`

### Roles e Permissões

- **`customer`**: Pode comprar, adicionar ao carrinho, favoritar
- **`store_owner`**: Pode criar lojas, produtos, batches, ver vendas
- **`null`**: Usuário novo sem role definido (redirecionado para `/select-role`)

### Guards do Backend

- **`AuthGuard`**: Valida JWT do Supabase (obrigatório em todas as rotas protegidas)
- **`RolesGuard`**: Verifica se `request.user.role` corresponde ao role requerido
- Decorator `@Roles('customer')` ou `@Roles('store_owner')` aplica verificação

---

## 🗄️ Schema do Banco de Dados

### Tabelas Principais

#### `users`
```sql
- id (uuid, PK, FK -> auth.users)
- role (text: 'customer' | 'store_owner' | null)
- nome (text)
- email (text, not null)
- telefone (text)
- foto_url (text)
- created_at (timestamptz)
```

#### `customers`
```sql
- user_id (uuid, PK, FK -> users.id)
- location_lat (float8)
- location_lng (float8)
- raio_padrao_km (int, default: 5)
- created_at (timestamptz)
```

#### `stores`
```sql
- id (uuid, PK)
- owner_id (uuid, FK -> users.id)
- cnpj (text, unique)
- nome (text, not null)
- tipo (text)
- endereco (text)
- lat (float8)
- lng (float8)
- horario_abertura (time)
- horario_fechamento (time)
- asaas_wallet_id (text) -- ID da carteira Asaas para recebimentos
- active (boolean, default: true)
- created_at (timestamptz)
```

#### `products`
```sql
- id (uuid, PK)
- store_id (uuid, FK -> stores.id)
- nome (text, not null)
- descricao (text)
- categoria (text)
- preco_normal (numeric(10,2), not null)
- active (boolean, default: true)
- created_at (timestamptz)
```

#### `product_media`
```sql
- id (uuid, PK)
- product_id (uuid, FK -> products.id)
- tipo (text)
- url (text, not null)
- created_at (timestamptz)
```

#### `product_batches` (Lotes de produtos com validade)
```sql
- id (uuid, PK)
- product_id (uuid, FK -> products.id)
- store_id (uuid, FK -> stores.id)
- data_vencimento (date, not null)
- preco_promocional (numeric(10,2), not null)
- estoque_total (int, not null)
- estoque_reservado (int, default: 0) -- Itens no carrinho
- estoque_vendido (int, default: 0) -- Itens já vendidos
- status (text: 'active' | 'expired' | 'sold_out')
- disponivel (int, GENERATED) -- estoque_total - estoque_reservado - estoque_vendido
- created_at (timestamptz)
```

#### `favorites`
```sql
- id (uuid, PK)
- customer_id (uuid, FK -> customers.user_id)
- product_batch_id (uuid, FK -> product_batches.id)
- created_at (timestamptz)
- UNIQUE (customer_id, product_batch_id)
```

#### `carts`
```sql
- id (uuid, PK)
- customer_id (uuid, FK -> customers.user_id)
- store_id (uuid, FK -> stores.id) -- Um carrinho por loja
- status (text: 'open' | 'reserved' | 'expired' | 'converted')
- reserved_until (timestamptz) -- Para reservas temporárias
- created_at (timestamptz)
```

#### `cart_items`
```sql
- id (uuid, PK)
- cart_id (uuid, FK -> carts.id)
- product_batch_id (uuid, FK -> product_batches.id)
- quantity (int, not null)
- price_snapshot (numeric(10,2), not null) -- Preço no momento da adição
- created_at (timestamptz)
- UNIQUE (cart_id, product_batch_id)
```

#### `orders`
```sql
- id (uuid, PK)
- customer_id (uuid, FK -> customers.user_id)
- store_id (uuid, FK -> stores.id)
- status (text: 'pending_payment' | 'paid' | 'picked_up' | 'cancelled')
- total (numeric(10,2), not null)
- pickup_code (text) -- Código para retirada (ex: "VEN-ABC123")
- pickup_deadline (timestamptz) -- Prazo para retirada (2h após pagamento)
- created_at (timestamptz)
- paid_at (timestamptz)
```

#### `order_items`
```sql
- id (uuid, PK)
- order_id (uuid, FK -> orders.id)
- product_batch_id (uuid, FK -> product_batches.id)
- quantity (int, not null)
- price (numeric(10,2), not null) -- Snapshot do preço
- created_at (timestamptz)
```

#### `payments`
```sql
- id (uuid, PK)
- order_id (uuid, FK -> orders.id)
- asaas_payment_id (text) -- ID do pagamento no Asaas
- status (text: 'pending' | 'paid' | 'cancelled')
- gross_value (numeric(10,2), not null) -- Valor bruto
- platform_fee (numeric(10,2), not null) -- Taxa da plataforma (7%)
- store_value (numeric(10,2), not null) -- Valor para a loja
- paid_at (timestamptz)
- created_at (timestamptz)
```

### Row Level Security (RLS)

Todas as tabelas têm RLS habilitado com políticas específicas:

- **Usuários**: Podem ver apenas seus próprios dados
- **Stores**: Públicas se `active = true`, ou se for o owner
- **Products/Batches**: Públicos se store está ativa, ou se for o owner
- **Carts/Orders**: Apenas o próprio customer
- **Service Role**: Bypass completo (usado pelo backend)

---

## 🔌 Rotas da API Backend

### Base URL
- **Desenvolvimento**: `http://192.168.10.7:3000` (configurado em `constants/config.ts`)
- **Produção**: Configurar via variável de ambiente

### Autenticação
Todas as rotas protegidas requerem header:
```
Authorization: Bearer <supabase_jwt_token>
```

### Rotas Públicas (sem autenticação)

- `GET /public/stores/:id` - Detalhes de uma loja
- `GET /public/batches` - Listar batches públicos (com filtros)
- `GET /public/batches/:id` - Detalhes de um batch
- `POST /payments/asaas-webhook` - Webhook do Asaas

### Rotas de Usuário

#### `GET /me`
- Retorna dados do usuário autenticado
- Cria usuário se não existir (com role hint opcional via header `x-client-role`)
- Auto-cria perfil (`customers` ou verifica `store_owner`)

#### `GET /me/profile`
- Retorna perfil completo (user + customer data)
- Requer: `AuthGuard` + `RolesGuard` (qualquer role)

#### `PUT /me/profile`
- Atualiza perfil (nome, telefone, foto_url, **role**)
- Usado para definir role na primeira vez
- Requer: `AuthGuard` (sem RolesGuard - permite definir role)

#### `PUT /me/location`
- Atualiza localização do customer (lat, lng, raio_km)
- Requer: `AuthGuard` + `RolesGuard('customer')`

### Rotas de Stores (Store Owner)

#### `GET /stores/me`
- Lista todas as lojas do store owner
- Requer: `AuthGuard` + `RolesGuard('store_owner')`

#### `POST /stores`
- Cria nova loja
- Body: `CreateStoreDto` (nome, cnpj, endereco, lat, lng, etc.)
- Requer: `AuthGuard` + `RolesGuard('store_owner')`

#### `PUT /stores/:id`
- Atualiza loja
- Requer: `AuthGuard` + `RolesGuard('store_owner')` + ser owner

#### `GET /stores/:id`
- Detalhes da loja (apenas owner)
- Requer: `AuthGuard` + `RolesGuard('store_owner')` + ser owner

#### `GET /stores/:id/orders/summary`
- Resumo de vendas da loja (gráficos, totais)
- Requer: `AuthGuard` + `RolesGuard('store_owner')` + ser owner

### Rotas de Products (Store Owner)

#### `GET /stores/:storeId/products`
- Lista produtos de uma loja
- Requer: `AuthGuard` + `RolesGuard('store_owner')` + ser owner

#### `POST /stores/:storeId/products`
- Cria produto
- Body: `CreateProductDto` (nome, descricao, categoria, preco_normal)
- Requer: `AuthGuard` + `RolesGuard('store_owner')` + ser owner

#### `PUT /products/:id`
- Atualiza produto
- Requer: `AuthGuard` + `RolesGuard('store_owner')` + ser owner

#### `DELETE /products/:id`
- Deleta produto (soft delete: `active = false`)
- Requer: `AuthGuard` + `RolesGuard('store_owner')` + ser owner

### Rotas de Batches (Store Owner)

#### `GET /stores/:storeId/batches`
- Lista batches de uma loja
- Requer: `AuthGuard` + `RolesGuard('store_owner')` + ser owner

#### `POST /stores/:storeId/batches`
- Cria batch (lote promocional)
- Body: `CreateBatchDto` (product_id, expiration_date, promo_price, stock)
- Requer: `AuthGuard` + `RolesGuard('store_owner')` + ser owner

#### `PUT /batches/:id`
- Atualiza batch
- Body: `UpdateBatchDto` (campos em português)
- Requer: `AuthGuard` + `RolesGuard('store_owner')` + ser owner

### Rotas de Favorites (Customer)

#### `GET /me/favorites`
- Lista favoritos do customer
- Retorna batches completos com produtos e lojas
- Requer: `AuthGuard` + `RolesGuard('customer')`

#### `POST /me/favorites`
- Adiciona batch aos favoritos
- Body: `{ batch_id: string }`
- Requer: `AuthGuard` + `RolesGuard('customer')`

#### `DELETE /me/favorites/:id`
- Remove favorito (id do favorito, não batch_id)
- Requer: `AuthGuard` + `RolesGuard('customer')`

### Rotas de Cart (Customer)

#### `GET /me/cart`
- Retorna carrinho completo com items, batches, produtos e lojas
- Se carrinho vazio, retorna `{ items: [], total: 0 }`
- Requer: `AuthGuard` + `RolesGuard('customer')`

#### `POST /me/cart/add-item`
- Adiciona item ao carrinho
- Body: `{ batch_id: string, quantity: number, replace_cart?: boolean }`
- Valida estoque disponível
- Reserva estoque (`estoque_reservado += quantity`)
- Requer: `AuthGuard` + `RolesGuard('customer')`

#### `PUT /me/cart/items/:batchId/quantity`
- Atualiza quantidade de um item
- Body: `{ quantity: number }`
- Requer: `AuthGuard` + `RolesGuard('customer')`

#### `POST /me/cart/remove-item`
- Remove item do carrinho
- Body: `{ product_batch_id: string }`
- Libera estoque reservado
- Requer: `AuthGuard` + `RolesGuard('customer')`

#### `POST /me/cart/clear`
- Limpa carrinho completamente
- Libera todo estoque reservado
- Requer: `AuthGuard` + `RolesGuard('customer')`

#### `POST /me/cart/reserve`
- Reserva carrinho temporariamente (para evitar expiração)
- Requer: `AuthGuard` + `RolesGuard('customer')`

### Rotas de Orders (Customer)

#### `POST /me/orders`
- Cria pedido a partir do carrinho
- Converte carrinho em pedido
- Status inicial: `pending_payment`
- Requer: `AuthGuard` + `RolesGuard('customer')`

#### `GET /me/orders`
- Lista todos os pedidos do customer
- Requer: `AuthGuard` + `RolesGuard('customer')`

#### `GET /me/orders/:id`
- Detalhes de um pedido específico
- Requer: `AuthGuard` + `RolesGuard('customer')` + ser o owner

### Rotas de Orders (Store Owner)

#### `GET /stores/:storeId/orders`
- Lista pedidos de uma loja
- Requer: `AuthGuard` + `RolesGuard('store_owner')` + ser owner

#### `GET /stores/:storeId/orders/:id`
- Detalhes de um pedido
- Requer: `AuthGuard` + `RolesGuard('store_owner')` + ser owner

#### `POST /stores/:storeId/orders/:id/pickup`
- Confirma retirada do pedido
- Atualiza status para `picked_up`
- Requer: `AuthGuard` + `RolesGuard('store_owner')` + ser owner

### Rotas de Payments

#### `POST /me/payments/checkout`
- Gera código PIX para um pedido
- Body: `{ order_id: string }`
- Cria cobrança no Asaas (ou mock)
- Calcula taxa da plataforma (7%)
- Retorna: `{ pix_code: string, pix_qrcode?: string }`
- Requer: `AuthGuard` + `RolesGuard('customer')`

#### `POST /payments/asaas-webhook`
- Webhook do Asaas (sem autenticação)
- Recebe notificação de pagamento
- Atualiza status do pedido e payment
- Gera `pickup_code` e `pickup_deadline`

### Rotas de Media

#### `GET /products/:productId/media`
- Lista mídias de um produto
- Requer: `AuthGuard` + `RolesGuard('store_owner')` + ser owner

#### `POST /products/:productId/media/upload-url`
- Gera URL de upload para Supabase Storage
- Requer: `AuthGuard` + `RolesGuard('store_owner')` + ser owner

#### `POST /products/:productId/media`
- Cria registro de mídia após upload
- Body: `{ file_path: string, type: string }`
- Requer: `AuthGuard` + `RolesGuard('store_owner')` + ser owner

#### `DELETE /products/:productId/media/:mediaId`
- Remove mídia
- Requer: `AuthGuard` + `RolesGuard('store_owner')` + ser owner

---

## 📱 Rotas do Mobile (Expo Router)

### Estrutura de Rotas

O Expo Router usa **file-based routing**:

```
app/
├── index.tsx                    # Tela de login
├── _layout.tsx                 # Layout raiz (providers)
├── auth/
│   └── callback.tsx            # Callback OAuth
├── select-role.tsx             # Seleção de role
├── (customer)/                 # Grupo de rotas do customer
│   ├── _layout.tsx             # Layout com tabs
│   ├── index.tsx               # Home (batches públicos)
│   ├── cart.tsx                # Carrinho
│   ├── favorites.tsx           # Favoritos
│   ├── orders.tsx              # Meus pedidos
│   ├── profile.tsx             # Perfil
│   ├── setup.tsx                # Setup inicial (localização)
│   └── store-products.tsx      # Produtos de uma loja
├── (merchant)/                 # Grupo de rotas do merchant
│   ├── _layout.tsx             # Layout com tabs
│   ├── index.tsx               # Dashboard
│   ├── stores.tsx              # Minhas lojas
│   ├── products.tsx            # Produtos
│   ├── create-product.tsx      # Criar produto
│   ├── create-store.tsx        # Criar loja
│   ├── sales.tsx               # Vendas
│   └── profile.tsx             # Perfil
├── product/
│   └── [id].tsx                # Detalhes do produto/batch
├── order/
│   └── [id].tsx                # Detalhes do pedido
└── checkout/
    └── [storeId].tsx           # Checkout de uma loja
```

### Fluxo de Navegação

1. **Login** (`/`):
   - Verifica sessão existente
   - Se não houver, mostra tela de login
   - Login via Google OAuth
   - Redireciona para `/auth/callback`

2. **Callback** (`/auth/callback`):
   - Processa token do Google
   - Autentica no Supabase
   - Chama `GET /me` no backend
   - Se `role === null`, redireciona para `/select-role`
   - Se `role === 'customer'`, redireciona para `/(customer)/`
   - Se `role === 'store_owner'`, redireciona para `/(merchant)/`

3. **Select Role** (`/select-role`):
   - Usuário escolhe role
   - Chama `PUT /me/profile` com role
   - Redireciona para o fluxo correspondente

4. **Customer Flow**:
   - Home: Lista batches públicos (`GET /public/batches`)
   - Filtros: categoria, desconto, vencimento, localização
   - Carrinho: Gerencia itens (`GET /me/cart`, `POST /me/cart/add-item`)
   - Checkout: Cria pedido e gera PIX
   - Pedidos: Lista e visualiza pedidos

5. **Merchant Flow**:
   - Dashboard: Resumo de vendas
   - Lojas: CRUD de lojas
   - Produtos: CRUD de produtos
   - Batches: CRUD de batches promocionais
   - Vendas: Lista pedidos e confirma retiradas

---

## 💳 Fluxo de Pagamento (PIX via Asaas)

### 1. Adicionar ao Carrinho
```
Customer → POST /me/cart/add-item { batch_id, quantity }
Backend:
  - Valida estoque disponível (disponivel >= quantity)
  - Reserva estoque (estoque_reservado += quantity)
  - Adiciona item ao carrinho
  - Retorna carrinho atualizado
```

### 2. Checkout
```
Customer → GET /me/cart (ver itens)
Customer → POST /me/orders (criar pedido)
Backend:
  - Valida carrinho não vazio
  - Cria order com status 'pending_payment'
  - Cria order_items com snapshot de preços
  - Muda status do cart para 'converted'
  - Retorna order
```

### 3. Gerar PIX
```
Customer → POST /me/payments/checkout { order_id }
Backend:
  - Busca order e order_items
  - Calcula total
  - Calcula taxa da plataforma (7% do total)
  - Calcula valor para loja (total - taxa)
  - Cria cobrança no Asaas:
    - Valor: total
    - Cliente: dados do customer
    - Descrição: "Pedido #order_id"
  - Cria registro em payments:
    - status: 'pending'
    - gross_value: total
    - platform_fee: 7%
    - store_value: total - taxa
  - Retorna { pix_code, pix_qrcode }
```

### 4. Pagamento
```
Customer copia código PIX ou escaneia QR code
Paga no app do banco
Asaas processa pagamento
```

### 5. Webhook do Asaas
```
Asaas → POST /payments/asaas-webhook
Backend:
  - Valida assinatura (se configurado)
  - Se status = 'PAYMENT_CONFIRMED':
    - Atualiza payments.status = 'paid'
    - Atualiza orders.status = 'paid'
    - Gera pickup_code (ex: "VEN-ABC123")
    - Define pickup_deadline (2h após pagamento)
    - Ajusta estoque:
      - estoque_vendido += quantity (de cada order_item)
      - estoque_reservado -= quantity
    - Envia notificação push (se configurado)
```

### 6. Retirada
```
Store Owner → POST /stores/:storeId/orders/:id/pickup
Backend:
  - Valida que order.status = 'paid'
  - Atualiza orders.status = 'picked_up'
  - Atualiza orders.picked_up_at = now()
  - Envia notificação push (se configurado)
```

---

## 🔄 Mapeamento de Campos PT/EN

O backend usa campos em **português**, enquanto o frontend usa **inglês**. O `services/api.ts` faz o mapeamento automático:

### User
- Backend: `nome`, `telefone`, `foto_url`
- Frontend: `name`, `phone`, `photo_url`

### Batch
- Backend: `preco_promocional`, `data_vencimento`, `estoque_total`, `disponivel`, `preco_normal_override`
- Frontend: `promo_price`, `expiration_date`, `stock`, `disponivel`, `original_price`

### Product
- Backend: `nome`, `descricao`, `categoria`, `foto1`, `foto2`, `preco_normal`
- Frontend: `name`, `description`, `category`, `photo1`, `photo2`, `original_price`

### Store
- Backend: `nome`, `endereco`, `cidade`, `estado`, `cep`, `telefone`, `horario_funcionamento`
- Frontend: `name`, `address`, `city`, `state`, `zip`, `phone`, `hours`

### Cart
- Backend: `product_batches` (relação), `items` (array de cart_items)
- Frontend: `batch` (objeto), `items` (array de CartItem)

---

## 🎯 Contextos React (Mobile)

### AuthContext
- Gerencia autenticação e sessão
- Fornece: `user`, `session`, `loading`, `isProfileComplete`, `signOut()`, `refreshUser()`
- Escuta mudanças de auth do Supabase
- Busca perfil do backend via `api.getProfile()`

### CartContext
- Gerencia estado do carrinho
- Cache de 10 segundos para reduzir requisições
- Debounce de 500ms
- Fornece: `cartItemCount`, `cachedCart`, `refreshCartCount()`, `updateCartCache()`
- Só funciona para `customer` (ignora para `store_owner`)

---

## 🔧 Configuração

### Mobile (`constants/config.ts`)
```typescript
export const API_BASE_URL = 'http://192.168.10.7:3000';
export const SUPABASE_URL = 'https://rkmvrfqhcleibdtlcwwh.supabase.co';
export const SUPABASE_ANON_KEY = '...';
export const GOOGLE_CLIENT_ID = '...';
```

### Backend (`.env`)
```env
SUPABASE_URL=https://rkmvrfqhcleibdtlcwwh.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ASAAS_API_KEY=...
ASAAS_WEBHOOK_TOKEN=...
```

---

## 📊 Fluxos Principais

### Fluxo Customer: Buscar Produtos e Comprar

1. Customer abre app → Home (`/(customer)/index`)
2. App busca batches: `GET /public/batches?lat=...&lng=...&raio_km=5`
3. Customer clica em batch → `/product/[id]`
4. Customer adiciona ao carrinho → `POST /me/cart/add-item`
5. Customer vai ao carrinho → `/(customer)/cart`
6. Customer faz checkout → `/checkout/[storeId]`
7. App cria pedido → `POST /me/orders`
8. App gera PIX → `POST /me/payments/checkout`
9. Customer paga PIX
10. Webhook atualiza pedido → `paid`
11. Customer retira na loja
12. Store owner confirma → `POST /stores/:storeId/orders/:id/pickup`

### Fluxo Merchant: Criar Loja e Vender

1. Merchant abre app → Dashboard (`/(merchant)/index`)
2. Merchant cria loja → `POST /stores`
3. Merchant cria produto → `POST /stores/:storeId/products`
4. Merchant cria batch → `POST /stores/:storeId/batches`
5. Batch aparece na busca pública
6. Customer compra (fluxo acima)
7. Merchant vê pedido → `GET /stores/:storeId/orders`
8. Merchant confirma retirada → `POST /stores/:storeId/orders/:id/pickup`

---

## 🚨 Tratamento de Erros

### Mobile
- Erros de rede: Log silencioso após 3 tentativas
- Erros 403 (role): Tratados como esperados (não logados como ERROR)
- Erros 409 (conflict): Logados como informação
- Timeout de 1s para requisições de carrinho

### Backend
- Validação via `class-validator`
- Erros retornados como JSON: `{ message: string, statusCode: number }`
- Swagger documenta todos os endpoints

---

## 📝 Notas Importantes

1. **Um carrinho por loja**: Cada customer pode ter múltiplos carrinhos (um por loja)
2. **Reserva de estoque**: Ao adicionar ao carrinho, estoque é reservado (`estoque_reservado`)
3. **Expiração de batches**: Batches com `data_vencimento < current_date` não aparecem na busca pública
4. **Status de batches**: `active` (disponível), `expired` (vencido), `sold_out` (esgotado)
5. **Taxa da plataforma**: 7% do valor total (configurável no backend)
6. **Pickup deadline**: 2 horas após pagamento (configurável)
7. **RLS**: Todas as queries do backend usam `service_role` para bypass de RLS

---

## 🔍 Pontos de Atenção

1. **Role null**: Usuários novos têm `role = null` até escolherem no `/select-role`
2. **Profile completo**: Customer precisa ter `telefone` para fazer checkout
3. **Estoque disponível**: Calculado como `estoque_total - estoque_reservado - estoque_vendido`
4. **Múltiplos carrinhos**: Um customer pode ter carrinhos de lojas diferentes simultaneamente
5. **Mapeamento PT/EN**: Sempre verificar se campos estão sendo mapeados corretamente
6. **Cache do carrinho**: Mobile usa cache de 10s para reduzir requisições
7. **Webhook Asaas**: Deve ser configurado na URL pública do backend

---

## 📚 Arquivos Principais

### Mobile
- `services/api.ts` - Cliente API com mapeamento PT/EN
- `services/supabase.ts` - Cliente Supabase
- `contexts/AuthContext.tsx` - Context de autenticação
- `contexts/CartContext.tsx` - Context do carrinho
- `constants/config.ts` - Configurações

### Backend
- `src/main.ts` - Bootstrap da aplicação
- `src/app.module.ts` - Módulo raiz
- `src/auth/auth.guard.ts` - Guard de autenticação
- `src/supabase/supabase.service.ts` - Serviço Supabase
- `supabase/migrations/` - Migrações do banco

---

Este documento cobre toda a arquitetura, rotas, banco de dados e fluxos do sistema VenceJá.
