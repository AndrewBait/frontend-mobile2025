# Análise Completa do Sistema VenceJá

## 📋 Visão Geral

Sistema de marketplace mobile para produtos próximos ao vencimento, composto por:
- **Frontend Mobile**: React Native com Expo Router (TypeScript)
- **Backend**: NestJS (TypeScript) com Supabase como banco de dados
- **Autenticação**: Supabase Auth com Google OAuth
- **Pagamentos**: Integração com Asaas (PIX)

---

## 🏗️ Arquitetura

### Frontend Mobile (`/my-app`)
- **Framework**: Expo Router (file-based routing)
- **Estado Global**: React Context (AuthContext, CartContext)
- **API Client**: Cliente HTTP customizado com mapeamento de campos PT/EN
- **Autenticação**: Supabase Auth com persistência em AsyncStorage (mobile) e localStorage (web)

### Backend (`/backend-venceja2025`)
- **Framework**: NestJS
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: JWT do Supabase via Bearer token
- **Validação**: class-validator e class-transformer
- **Documentação**: Swagger em `/docs`

---

## 🗄️ Schema do Banco de Dados (Supabase)

### Tabelas Principais

#### `users`
- `id` (UUID, PK, FK → auth.users)
- `role` ('customer' | 'store_owner')
- `nome`, `email`, `telefone`, `foto_url`
- `created_at`

#### `customers`
- `user_id` (UUID, PK, FK → users)
- `location_lat`, `location_lng`
- `raio_padrao_km` (default: 5)

#### `stores`
- `id` (UUID, PK)
- `owner_id` (FK → users)
- `cnpj`, `nome`, `tipo`
- `endereco`, `lat`, `lng`
- `horario_abertura`, `horario_fechamento`
- `asaas_wallet_id` (para pagamentos)
- `active` (boolean)

#### `products`
- `id` (UUID, PK)
- `store_id` (FK → stores)
- `nome`, `descricao`, `categoria`
- `preco_normal` (numeric)
- `active` (boolean)

#### `product_batches`
- `id` (UUID, PK)
- `product_id` (FK → products)
- `store_id` (FK → stores)
- `data_vencimento` (date)
- `preco_promocional` (numeric)
- `estoque_total`, `estoque_reservado`, `estoque_vendido`
- `status` ('active' | 'expired' | 'sold_out')
- `disponivel` (generated: estoque_total - estoque_reservado - estoque_vendido)

#### `carts`
- `id` (UUID, PK)
- `customer_id` (FK → customers.user_id)
- `store_id` (FK → stores)
- `status` ('open' | 'reserved' | 'expired' | 'converted')
- `reserved_until` (timestamptz)

#### `cart_items`
- `id` (UUID, PK)
- `cart_id` (FK → carts)
- `product_batch_id` (FK → product_batches)
- `quantity` (int)
- `price_snapshot` (numeric)

#### `orders`
- `id` (UUID, PK)
- `customer_id` (FK → customers.user_id)
- `store_id` (FK → stores)
- `status` ('pending_payment' | 'paid' | 'picked_up' | 'cancelled')
- `total` (numeric)
- `pickup_code`, `pickup_deadline`
- `paid_at` (timestamptz)

#### `order_items`
- `id` (UUID, PK)
- `order_id` (FK → orders)
- `product_batch_id` (FK → product_batches)
- `quantity`, `price` (numeric)

#### `payments`
- `id` (UUID, PK)
- `order_id` (FK → orders)
- `asaas_payment_id`
- `status` ('pending' | 'paid' | 'cancelled')
- `gross_value`, `platform_fee`, `store_value` (numeric)
- `paid_at` (timestamptz)

#### `favorites`
- `id` (UUID, PK)
- `customer_id` (FK → customers.user_id)
- `product_batch_id` (FK → product_batches)
- Unique constraint: (customer_id, product_batch_id)

### Row Level Security (RLS)
- Todas as tabelas têm RLS habilitado
- Policies baseadas em `auth.uid()` e roles
- Service role tem acesso total para operações do backend

---

## 🔐 Autenticação e Autorização

### Fluxo de Autenticação

1. **Login com Google OAuth**:
   - Mobile usa `expo-auth-session` para OAuth
   - Recebe `idToken` do Google
   - Envia para Supabase: `signInWithIdToken({ provider: 'google', token: idToken })`
   - Supabase retorna `access_token` e `refresh_token`

2. **Criação de Usuário no Backend**:
   - Primeira chamada a `/me` cria registro em `users` se não existir
   - Role pode ser definida via header `x-client-role` ou deixada como `null`
   - Role pode ser definida depois via `PUT /me/profile`

3. **Autorização**:
   - Backend valida JWT do Supabase via `AuthGuard`
   - `RolesGuard` verifica role do usuário (`customer` ou `store_owner`)
   - Endpoints específicos requerem roles específicas

### Roles

- **`customer`**: Pode comprar, adicionar ao carrinho, favoritar
- **`store_owner`**: Pode gerenciar lojas, produtos, batches, ver vendas

---

## 🛣️ Rotas do Backend (NestJS)

### Autenticação
- `GET /me` - Obter/criar usuário atual
- `GET /me/profile` - Obter perfil completo (com customer/store_owner data)
- `PUT /me/profile` - Atualizar perfil (incluindo role)
- `PUT /me/location` - Atualizar localização (apenas customer)

### Stores (Store Owner)
- `GET /stores/me` - Listar minhas lojas
- `POST /stores` - Criar loja
- `PUT /stores/:id` - Atualizar loja
- `GET /stores/:id` - Obter loja (owner)
- `GET /stores/:id/orders/summary` - Resumo de vendas
- `GET /public/stores/:id` - Obter loja pública (sem auth)

### Products (Store Owner)
- `GET /stores/:storeId/products` - Listar produtos da loja
- `POST /stores/:storeId/products` - Criar produto
- `PUT /products/:id` - Atualizar produto
- `DELETE /products/:id` - Deletar produto

### Batches (Store Owner)
- `GET /stores/:storeId/batches` - Listar batches da loja
- `POST /stores/:storeId/batches` - Criar batch
- `PUT /batches/:id` - Atualizar batch

### Batches (Público)
- `GET /public/batches` - Listar batches públicos (com filtros)
  - Query params: `categoria`, `desconto_min`, `vence_em`, `store_id`, `lat`, `lng`, `raio_km`
- `GET /public/batches/:id` - Obter batch público

### Favorites (Customer)
- `GET /me/favorites` - Listar favoritos
- `POST /me/favorites` - Adicionar favorito
- `DELETE /me/favorites/:id` - Remover favorito

### Cart (Customer)
- `GET /me/cart` - Obter carrinho atual
- `POST /me/cart/add-item` - Adicionar item ao carrinho
- `PUT /me/cart/items/:batchId/quantity` - Atualizar quantidade
- `POST /me/cart/remove-item` - Remover item
- `POST /me/cart/clear` - Limpar carrinho
- `POST /me/cart/reserve` - Reservar carrinho

### Orders (Customer)
- `POST /me/orders` - Criar pedido a partir do carrinho
- `GET /me/orders` - Listar meus pedidos
- `GET /me/orders/:id` - Obter pedido específico

### Orders (Store Owner)
- `GET /stores/:storeId/orders` - Listar pedidos da loja
- `GET /stores/:storeId/orders/:id` - Obter pedido específico
- `POST /stores/:storeId/orders/:id/pickup` - Confirmar retirada

### Payments
- `POST /me/payments/checkout` - Gerar código PIX para pedido
- `POST /payments/asaas-webhook` - Webhook do Asaas (sem auth)

---

## 📱 Rotas do Mobile (Expo Router)

### Autenticação
- `/` - Tela de login
- `/auth/callback` - Callback do OAuth
- `/select-role` - Seleção de role após primeiro login

### Customer Flow
- `/(customer)/` - Layout com tabs
  - `/(customer)/index` - Home (listagem de batches públicos)
  - `/(customer)/cart` - Carrinho
  - `/(customer)/favorites` - Favoritos
  - `/(customer)/orders` - Meus pedidos
  - `/(customer)/profile` - Perfil
  - `/(customer)/setup` - Setup inicial (localização)
  - `/(customer)/store-products` - Produtos de uma loja

### Merchant Flow
- `/(merchant)/` - Layout com tabs
  - `/(merchant)/index` - Dashboard
  - `/(merchant)/stores` - Minhas lojas
  - `/(merchant)/products` - Produtos
  - `/(merchant)/create-product` - Criar produto
  - `/(merchant)/create-store` - Criar loja
  - `/(merchant)/sales` - Vendas
  - `/(merchant)/profile` - Perfil

### Rotas Dinâmicas
- `/product/[id]` - Detalhes do produto/batch
- `/order/[id]` - Detalhes do pedido
- `/checkout/[storeId]` - Checkout de uma loja específica

---

## 💳 Fluxo de Pagamento (PIX)

1. **Cliente adiciona itens ao carrinho**:
   - `POST /me/cart/add-item` com `batch_id` e `quantity`
   - Backend valida estoque disponível
   - Reserva estoque (`estoque_reservado`)

2. **Cliente vai para checkout**:
   - `GET /me/cart` para ver itens
   - Tela de checkout mostra total por loja

3. **Cliente gera pedido**:
   - `POST /me/orders` - Cria pedido a partir do carrinho
   - Backend:
     - Converte carrinho em pedido
     - Muda status do carrinho para 'converted'
     - Cria `order_items` com snapshot de preços
     - Status inicial: 'pending_payment'

4. **Cliente gera PIX**:
   - `POST /me/payments/checkout` com `order_id`
   - Backend:
     - Cria cobrança no Asaas (ou mock se não configurado)
     - Calcula taxa da plataforma (default: 7%)
     - Cria registro em `payments` com status 'pending'
     - Retorna `pix_code` e `pix_qrcode` (QR code image)

5. **Cliente paga**:
   - Copia código PIX ou escaneia QR code
   - Paga no app do banco

6. **Webhook do Asaas**:
   - `POST /payments/asaas-webhook`
   - Backend:
     - Valida assinatura (se configurado)
     - Se status = 'PAYMENT_CONFIRMED':
       - Atualiza `payments.status` para 'paid'
       - Atualiza `orders.status` para 'paid'
       - Gera `pickup_code` (ex: "VEN-ABC123")
       - Define `pickup_deadline` (2 horas após pagamento)
       - Ajusta estoque: `estoque_vendido += quantity`, `estoque_reservado -= quantity`

7. **Cliente retira**:
   - Store owner confirma retirada: `POST /stores/:storeId/orders/:id/pickup`
   - Backend atualiza `orders.status` para 'picked_up'

---

## 🔄 Mapeamento de Campos PT/EN

O backend usa campos em **português**, enquanto o frontend usa **inglês**. O `api.ts` faz o mapeamento:

### User
- Backend: `nome`, `telefone`, `foto_url`
- Frontend: `name`, `phone`, `photo_url`

### Batch
- Backend: `preco_promocional`, `data_vencimento`, `estoque_total`, `disponivel`
- Frontend: `promo_price`, `expiration_date`, `stock`, `disponivel`

### Product
- Backend: `nome`, `descricao`, `categoria`, `foto1`, `foto2`
- Frontend: `name`, `description`, `category`, `photo1`, `photo2`

### Store
- Backend: `nome`, `endereco`
- Frontend: `name`, `address`

---

## 🎯 Funcionalidades Principais

### Para Customers
- ✅ Login com Google
- ✅ Buscar produtos por localização (raio em km)
- ✅ Filtrar por categoria, desconto, vencimento
- ✅ Adicionar ao carrinho
- ✅ Favoritar produtos
- ✅ Checkout e pagamento PIX
- ✅ Acompanhar pedidos
- ✅ Ver código de retirada

### Para Store Owners
- ✅ Gerenciar lojas (criar, editar)
- ✅ Gerenciar produtos
- ✅ Criar batches (lotes com preço promocional e data de vencimento)
- ✅ Ver vendas e resumo
- ✅ Confirmar retirada de pedidos
- ✅ Dashboard com gráficos de vendas

---

## 🔧 Configuração

### Frontend (`constants/config.ts`)
```typescript
API_BASE_URL: 'http://192.168.10.8:3000'
SUPABASE_URL: 'https://rkmvrfqhcleibdtlcwwh.supabase.co'
SUPABASE_ANON_KEY: '...'
GOOGLE_CLIENT_ID: '...'
```

### Backend (`.env`)
```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ASAAS_API_KEY=...
ASAAS_PLATFORM_WALLET_ID=...
PLATFORM_FEE_PERCENT=7
ASAAS_WEBHOOK_SECRET=...
```

---

## 📊 Contextos React (Frontend)

### AuthContext
- Gerencia sessão do Supabase
- Busca perfil do usuário do backend
- Controla logout e redirecionamento
- Verifica se perfil está completo (tem telefone)

### CartContext
- Cache do carrinho (10 segundos de validade)
- Contador de itens no badge
- Refresh automático quando sessão/user muda
- Só funciona para `role === 'customer'`

---

## 🚨 Pontos de Atenção

1. **Estoque Reservado**: Quando item é adicionado ao carrinho, estoque é reservado. Se não finalizar pedido, precisa expirar/reservar novamente.

2. **Carrinho por Loja**: Cada carrinho é vinculado a uma loja. Cliente pode ter múltiplos carrinhos (um por loja).

3. **Role Nullable**: Role pode ser `null` inicialmente. Frontend deve permitir escolher role após primeiro login.

4. **Mapeamento PT/EN**: Sempre verificar se campos estão sendo mapeados corretamente entre backend e frontend.

5. **RLS**: Backend usa service role para operações administrativas. Frontend usa anon key com RLS.

6. **Pagamento Mock**: Se `ASAAS_API_KEY` não estiver configurado, sistema usa pagamento mock para desenvolvimento.

---

## 🔍 Endpoints Importantes

### Públicos (sem auth)
- `GET /public/stores/:id`
- `GET /public/batches`
- `GET /public/batches/:id`

### Customer (requer role 'customer')
- Todos os endpoints `/me/*` exceto `/me` e `/me/profile` (PUT)

### Store Owner (requer role 'store_owner')
- Todos os endpoints `/stores/*` (exceto `/public/stores/:id`)

---

## 📝 Próximos Passos Sugeridos

1. Implementar expiração automática de carrinhos reservados
2. Notificações push para mudanças de status de pedido
3. Sistema de avaliações/feedback
4. Histórico de preços
5. Relatórios avançados para store owners
6. Sistema de cupons/descontos adicionais

---

**Data da Análise**: 2025-01-XX
**Versão do Sistema**: 1.0
