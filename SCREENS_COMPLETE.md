# CATÁLOGO COMPLETO DE TELAS - Frontend Mobile VenceJá

**Data:** 01/01/2026
**Versão:** 1.0
**Total de Telas:** 16
**Framework:** React Native + Expo 54 + Expo Router v6

---

## SUMÁRIO

**Telas Públicas (2):**
1. Onboarding
2. Select Role

**Telas Customer (6):**
3. Vitrine (Home)
4. Favoritos
5. Lojas
6. Carrinho (não catalogado separadamente - via tab)
7. Pedidos
8. Perfil
9. Setup

**Telas Merchant (5):**
10. Dashboard (não encontrado - via tab)
11. Produtos
12. Criar Loja
13. Vendas
14. Criar Produto (não catalogado - via navegação)
15. Premium (não catalogado - via tab)

**Telas Compartilhadas (3):**
16. Detalhes do Produto
17. Detalhes do Pedido
18. Checkout

---

## TELAS PÚBLICAS

### 1. Onboarding Screen

**Arquivo:** `app/onboarding.tsx`
**Linhas:** 249
**Role:** Público (primeira abertura)

#### Informações Básicas
- Nome: Onboarding
- Acesso: Primeira vez que abre o app
- Tamanho: 249 linhas de código

#### Componentes Usados
- `GradientBackground` - Fundo com gradiente
- `Animated.FlatList` - Carousel horizontal animado
- Ionicons - Ícones (shield-checkmark, calendar, time)
- AsyncStorage - Persistência de flag

#### Hooks Usados
- `useRef` - Referência do FlatList para controle
- `useState` - Controle de índice atual do slide

#### Funcionalidades
- 3 slides informativos sobre o app
- Paginação automática com indicadores (dots)
- Botão "Pular" para avançar direto
- Salva flag no AsyncStorage após conclusão
- Redirecionamento automático para login

#### Estado e Dados
- `currentIndex` - Slide atual (0-2)
- Flag `@venceja:hasSeenOnboarding` em AsyncStorage

#### UX/UI Atual
- Slides com ícones grandes (80px) em containers coloridos
- Títulos em h1 (28px, bold, white)
- Descrições em gray-600 (16px)
- Dots indicadores (8px → 24px no ativo)
- Botões com ícones + texto
- Background gradiente (primary.500 → secondary.500)

#### Navegação
- **De:** Primeira abertura do app
- **Para:** `/` (login) após conclusão

#### Sugestões de Melhorias Visuais
- Adicionar animações de transição entre slides
- Botão "Começar" mais destacado no último slide
- Preview de funcionalidades com mini screenshots
- Swipe gestures mais responsivos

#### Sugestões de Performance
- Lazy loading de imagens dos slides
- Memoização dos componentes de slide
- useCallback para handlers de navegação

---

### 2. Select Role Screen

**Arquivo:** `app/select-role.tsx`
**Linhas:** 174
**Role:** Público (após login sem role)

#### Informações Básicas
- Nome: Seleção de Perfil
- Acesso: Após login com role indefinido
- Tamanho: 174 linhas

#### Componentes Usados
- `GradientBackground`
- Ionicons (cart, storefront)
- ActivityIndicator - Loading states

#### Hooks Usados
- `useState` - Loading por role selecionado
- `useEffect` - Carregamento do nome do usuário

#### Funcionalidades
- Carrega primeiro nome do Supabase auth
- 2 cards: Consumidor e Lojista
- Loading state diferenciado por seleção
- Navegação com param `pendingRole`

#### Estado e Dados
- `userName` - Primeiro nome extraído de user_metadata
- `loading` - "customer" | "store_owner" | null

#### UX/UI Atual
- Greeting personalizado com nome + emoji 👋
- 2 cards brancos com borders
- Ícones em containers coloridos (green/yellow)
- Chevron icons indicando navegação
- Footer com dica visual

#### Navegação
- **De:** `/` (após auth)
- **Para:** `/(customer)/setup` ou `/(merchant)/create-store`

#### Sugestões de Melhorias Visuais
- Animação de entrada dos cards (stagger)
- Preview de cada perfil (screenshots)
- Badges com funcionalidades principais
- Botão "Ajuda" para explicar diferenças

#### Sugestões de Performance
- Pré-carregar dados de setup enquanto decide
- Prefetch de rotas de destino

---

## TELAS CUSTOMER

### 3. Vitrine (Home) Screen

**Arquivo:** `app/(customer)/index.tsx`
**Linhas:** 1472
**Role:** Customer

#### Informações Básicas
- Nome: Vitrine / Ofertas do Dia
- Tab: Home (1ª aba)
- Tamanho: 1472 linhas

#### Componentes Usados
- `GradientBackground`
- `AdaptiveList` (FlashList otimizada)
- `AnimatedBatchCard` - Cards de produtos
- `FilterPanel` - Painel de filtros
- `EmptyState`
- Ionicons
- `Image` (expo-image com cache)

#### Hooks Usados
- `useState` - batches, filtros, location, selectedQuantities
- `useEffect` - Geolocalização, carregamento
- `useFocusEffect` - Revalidação ao focar
- `useMemo` - Batches filtrados
- `useCallback` - Handlers otimizados
- `useRef` - Controle de load function

#### API Calls
- `api.getPublicBatches(params)` - Busca produtos
- `api.addToCart(batchId, quantity, replaceCart?)` - Adiciona ao carrinho

#### Contexts
- `useAuth` - Usuário, sessão
- `useCart` - incrementCartCount, updateCartCache
- `useErrorHandler` - Tratamento de erros
- `useToast` - Toast notifications

#### Estado Local
- `batches` - Lista de produtos
- `loading`, `refreshing` - Estados de carregamento
- `selectedCategory` - Filtro de categoria
- `location` - {lat, lng} do usuário
- `filterRadius`, `filterMinPrice`, `filterMaxPrice`, `filterMaxDaysToExpire`
- `searchQuery` - Busca por texto
- `selectedQuantities` - Quantidade por produto
- `autoRadiusKm` - Raio auto-expandido
- `page`, `hasMore` - Paginação (preparado)

#### Funcionalidades
- Busca com geolocalização
- Filtros: preço, vencimento, distância, categoria
- Busca textual
- Auto-expand de raio se sem resultados
- Carrinho com update otimista
- Gestão de conflitos (409)
- Animação de entrada
- Pull-to-refresh

#### UX/UI Atual
- Header com greeting personalizado
- Search bar com ícone de filtros
- Cards com imagens grandes (280px)
- Store logo sobreposto
- Badges de desconto e estoque
- Info de expiração colorida
- Location banner com raio
- Skeleton loaders

#### Navegação
- **De:** Tab navigation
- **Para:** `/product/[id]`, `/(customer)/setup`, `/(customer)/cart`

#### Sugestões de Melhorias Visuais
- Implementar infinite scroll real
- Cache local de batches visitados
- Trending/Featured section no topo
- Recent searches
- Quick filters como chips
- Modo grid/lista toggle
- Preview ao pressionar card (haptic)

#### Sugestões de Performance
- Paginação real (não apenas preparada)
- Virtual scrolling otimizado
- Image lazy loading com blur hash
- Debounce no search
- Memoização de filtered batches
- Background fetch de próxima página

---

### 4. Favoritos Screen

**Arquivo:** `app/(customer)/favorites.tsx`
**Linhas:** 508
**Role:** Customer

#### Informações Básicas
- Nome: Meus Favoritos
- Tab: 2ª aba
- Tamanho: 508 linhas

#### Componentes Usados
- `GradientBackground`
- `AdaptiveList`
- `FavoriteItem` (componente interno memoizado)
- `Badge`, `Button`, `EmptyState`
- Ionicons, `Image`

#### Hooks Usados
- `useCallback`, `useMemo` - Otimizações
- `useFocusEffect` - Invalidação ao focar
- `useQuery` - Lista favoritos
- `useMutation` - Remove favorito
- `memo` - FavoriteItem memoizado

#### API Calls
- `api.getFavorites()` - Lista
- `api.removeFavorite(favoriteId)` - Remove

#### Contexts
- `useAuth`, `useCart`

#### Funcionalidades
- Listagem com imagem, nome, preço
- Remove com otimistic update
- Adiciona ao carrinho
- Pull-to-refresh
- Animação de entrada (stagger)

#### UX/UI Atual
- Cards horizontais (100px imagem + info)
- Nome com 2 linhas máx
- Preço strikethrough + promo
- Badges de desconto
- Botões "Adicionar" e "Remover"
- Haptic feedback

#### Navegação
- **De:** Tab navigation
- **Para:** `/product/[id]`, carrinho

#### Sugestões de Melhorias Visuais
- Ordenação (preço, desconto, recência)
- Filtros (categoria, preço)
- Share favorito
- Comparar preços entre lojas
- Notificação quando desconto muda
- Swipe para remover

#### Sugestões de Performance
- Pagination para muitos favoritos
- Cache de imagens otimizado
- Skeleton durante loading

---

### 5. Lojas Screen

**Arquivo:** `app/(customer)/store-products.tsx`
**Linhas:** 1264
**Role:** Customer

#### Informações Básicas
- Nome: Lojas Disponíveis
- Tab: 3ª aba
- Tamanho: 1264 linhas

#### Componentes Usados
- `GradientBackground`
- `AdaptiveList`
- `Image`, Ionicons, `EmptyState`

#### Hooks Usados
- `useState` - Stores, batches, filtros, viewMode
- `useEffect` - Location, loading
- `useMemo` - Lojas filtradas
- `useCallback` - Refresh

#### API Calls
- `api.getPublicBatches(params)` - Lojas via batches
- `api.getPublicStore(storeId)` - Detalhes
- `api.getPublicBatches({store_id})` - Produtos da loja

#### Funcionalidades
- 2 modos: lista de lojas + detalhe
- Filtro por distância (2-30km)
- Filtro por tipo
- Busca textual
- Produtos em grid 2 colunas

#### UX/UI Atual
- Cards de loja com logo circular (100px)
- Info: nome, tipo, horário, endereço, telefone
- Cards de produtos em 2 colunas
- Badges coloridos

#### Navegação
- **De:** Tab navigation
- **Para:** `/product/[id]`, back para lista

#### Sugestões de Melhorias Visuais
- Ordenação (distância, relevância)
- Avaliações de lojas ⭐
- Horário em tempo real (aberto/fechado)
- Favoritar lojas
- Mapa com pins de lojas
- Fotos da loja

#### Sugestões de Performance
- Cache de lojas visitadas
- Lazy loading de produtos
- Skeleton para lojas

---

### 6. Pedidos Screen

**Arquivo:** `app/(customer)/orders.tsx`
**Linhas:** 318
**Role:** Customer

#### Informações Básicas
- Nome: Meus Pedidos
- Tab: 5ª aba
- Tamanho: 318 linhas

#### Componentes Usados
- `GradientBackground`
- `AdaptiveList`
- `Badge`, `EmptyState`
- OrderItem (interno)

#### Hooks Usados
- `useState` - Orders, loading
- `useFocusEffect` - Load ao focar

#### API Calls
- `api.getMyOrders()` - Lista com timeout 5s

#### Funcionalidades
- Lista com status
- Código de retirada (se paid)
- Pull-to-refresh
- Animação stagger

#### Status/Cores
- pending_payment: warning ⏱️
- paid: success ✓ "Retirar"
- picked_up: primary 🎒
- cancelled: error ✗
- expired: default ?

#### UX/UI Atual
- Cards simples
- Número (últimos 6 chars CAPS)
- Data formatada PT-BR
- Badge com status
- Código em box verde (monospace)

#### Navegação
- **De:** Tab navigation
- **Para:** `/order/[id]`

#### Sugestões de Melhorias Visuais
- Timeline de status
- Rastreamento em tempo real
- Botão "Reordenar"
- Cancelar pedido
- Chat com loja
- Push notification (pronto)

#### Sugestões de Performance
- Pagination
- Cache de pedidos

---

### 7. Perfil Screen

**Arquivo:** `app/(customer)/profile.tsx`
**Linhas:** 330
**Role:** Customer

#### Informações Básicas
- Nome: Perfil do Cliente
- Tab: 6ª aba
- Tamanho: 330 linhas

#### Componentes Usados
- `GradientBackground`
- `Image`, Ionicons, ScrollView

#### Hooks Usados
- `useAuth` - User, signOut

#### Funcionalidades
- Display: nome, email, foto
- Menu: Editar, Endereços, Notificações
- Preferências: Trocar perfil, Ajuda, Termos
- Logout com confirmação

#### UX/UI Atual
- Avatar circular (72px)
- Nome, email, role badge
- Menu items com ícones coloridos
- Logout em red
- Version no footer

#### Navegação
- **De:** Tab navigation
- **Para:** `/(customer)/setup`, `/select-role`

#### Sugestões de Melhorias Visuais
- Editar foto (camera picker)
- Histórico de lojas visitadas
- Preferências de notificação
- Dados e privacidade
- Exclusão de conta
- Push toggle

#### Sugestões de Performance
- Lazy loading de menu items

---

### 8. Setup Screen

**Arquivo:** `app/(customer)/setup.tsx`
**Linhas:** 803
**Role:** Customer

#### Informações Básicas
- Nome: Completar Perfil
- Acesso: Onboarding / Edit profile
- Tamanho: 803 linhas

#### Componentes Usados
- `GradientBackground`
- `KeyboardAvoidingView`, ScrollView
- TextInput, LinearGradient
- Ionicons

#### Hooks Usados
- `useState` - Form fields, errors, loading
- `useEffect` - Load existing data
- `useRef` - Last CEP lookup

#### API Calls
- `api.getProfile()` - Dados existentes
- `api.updateProfile()` - Salva role + phone
- `api.updateLocation()` - Endereço + CPF + raio
- `fetchAddressByCEP()` - ViaCEP
- `Location.reverseGeocodeAsync()` - Geocode GPS

#### Validações
- Phone: (00) 00000-0000
- CPF: 000.000.000-00 + check digit
- CEP: 00000-000 (opcional)
- Address, number, neighborhood, city, state

#### Funcionalidades
- Request localização GPS
- Seletor de raio (2-30km)
- Busca por CEP
- Auto-preenchimento
- Validação campos obrigatórios
- Info box com prazo retirada (2h)

#### UX/UI Atual
- Location status card (green/yellow)
- Radius chips
- Glass effect inputs
- Error messages em red
- Character count

#### Navegação
- **De:** `/select-role`, perfil
- **Para:** `/(customer)` após conclusão

#### Sugestões de Melhorias Visuais
- Multi-step form com progress
- Address autocomplete (Google Places)
- Múltiplos endereços
- Confirmação antes de salvar
- Estado de sucesso/erro

#### Sugestões de Performance
- Debounce no CEP input
- Cache de endereço por CEP

---

## TELAS MERCHANT

### 9. Produtos Screen

**Arquivo:** `app/(merchant)/products.tsx`
**Linhas:** 652
**Role:** Merchant

#### Informações Básicas
- Nome: Gerenciamento de Produtos
- Tab: 2ª aba merchant
- Tamanho: 652 linhas

#### Componentes Usados
- `GradientBackground`
- `AdaptiveList`
- LinearGradient - FAB
- Ionicons, Image

#### Hooks Usados
- `useState`, `useFocusEffect`, `useCallback`

#### API Calls
- `api.getMyStores()` - Lojas do merchant
- `api.getStoreBatches(storeId)` - Produtos
- `api.deleteProduct(productId)` - Deleta

#### Contexts
- `useAuth`

#### Funcionalidades
- Seletor de loja (tabs horizontais)
- Listagem de produtos/batches
- Ações: Editar, Deletar
- FAB para criar produto
- Pull-to-refresh

#### Status Visual
- Ativo: Normal
- Desativado: gray badge
- Esgotado: warning badge
- Vencido: error badge

#### UX/UI Atual
- Store chips horizontais
- Product cards (80px imagem)
- Badges coloridos
- Opacity 60% se inativo

#### Navegação
- **De:** Tab navigation
- **Para:** `/(merchant)/create-product`

#### Sugestões de Melhorias Visuais
- Bulk actions (editar múltiplos)
- Filtros (status, categoria)
- Sorting (vendas, novo)
- Estatísticas (vendas, views)
- Quick edit inline
- Duplicar produto

#### Sugestões de Performance
- Pagination
- Cache de produtos
- Skeleton loading

---

### 10. Criar Loja Screen

**Arquivo:** `app/(merchant)/create-store.tsx`
**Linhas:** 993
**Role:** Merchant

#### Informações Básicas
- Nome: Criar/Editar Loja
- Acesso: Onboarding merchant / Edit store
- Tamanho: 993 linhas

#### Componentes Usados
- `GradientBackground`
- KeyboardAvoidingView, ScrollView
- TextInput, SelectInput
- LinearGradient, Image

#### Hooks Usados
- `useState` - Form fields, loading, errors
- `useEffect` - Load data (edit mode)

#### API Calls
- `api.getStore(storeId)` - Load (edit)
- `api.createStore(data)` - Criar
- `api.updateStore(storeId, data)` - Atualizar
- `uploadStoreProfile(logoUri, storeId)` - Upload logo
- `fetchAddressByCEP(cep)` - Endereço por CEP

#### Validações
- Nome: 3-50 chars
- CNPJ: 00.000.000/0000-00 + check
- Tipo: required select
- Phone: (00) 00000-0000
- CEP: 00000-000
- Horário: HH:MM (00:00-23:59)
- Asaas Wallet ID: UUID (obrigatório)

#### Funcionalidades
- Logo picker (circular, 1:1)
- CEP lookup + auto-preenchimento
- Validação de horário
- Cálculo de prazo retirada
- Info box Asaas
- Create vs Edit mode
- Timeout 15s

#### UX/UI Atual
- Logo picker dashed border
- Seções: Info, Endereço, Horário, Pagamento
- Glass effect inputs
- Error messages red
- Char count
- Info boxes amarelas/vermelhas

#### Navegação
- **De:** `/select-role`, produtos
- **Para:** `/(merchant)` após criação

#### Sugestões de Melhorias Visuais
- Múltiplas fotos (não só logo)
- Categoria com subcategorias
- Descrição de loja
- Tags/badges
- Horários por dia da semana
- Integração Asaas (validação)
- Preview de perfil

#### Sugestões de Performance
- Upload progressivo
- Validação assíncrona

---

### 11. Vendas Screen

**Arquivo:** `app/(merchant)/sales.tsx`
**Linhas:** 579
**Role:** Merchant

#### Informações Básicas
- Nome: Vendas / Pedidos
- Tab: 3ª aba merchant
- Tamanho: 579 linhas

#### Componentes Usados
- `GradientBackground`
- `AdaptiveList`
- Badge, Button, Input, EmptyState

#### Hooks Usados
- `useState`, `useCallback`, `useMemo`, `useFocusEffect`

#### API Calls
- `api.getMyStores()` - Lojas
- `api.getStoreOrders(storeId)` - Pedidos
- `api.confirmPickup(storeId, orderId, pickupCode)` - Confirma

#### Funcionalidades
- Seletor de loja
- Verificador de código retirada
- Status filter tabs
- Normaliza código ("VEN-")
- Haptic feedback
- Info de cliente, itens, total

#### Status Filter
- "paid" → "A retirar" (padrão)
- "pending_payment" → "Aguardando"
- "picked_up" → "Retirado"
- "cancelled" → "Cancelado"
- "all" → Todos

#### UX/UI Atual
- Verify card com input
- Order cards com badge
- Stats: itens, qtd, total
- Pickup code box verde

#### Navegação
- **De:** Tab navigation
- **Para:** `/(merchant)/sale-order/[id]`

#### Sugestões de Melhorias Visuais
- QR code scanner real
- Notificação novo pedido
- Timeline de pickups
- Estatísticas (vendas, tickets)
- Filtro por cliente
- Reimpressão

#### Sugestões de Performance
- Polling de novos pedidos
- Real-time updates (Supabase)

---

## TELAS COMPARTILHADAS

### 12. Detalhes do Produto

**Arquivo:** `app/product/[id].tsx`
**Linhas:** 725
**Role:** Público/Customer

#### Informações Básicas
- Nome: Detalhes do Produto
- Acesso: Card de produto
- Tamanho: 725 linhas

#### Componentes Usados
- `GradientBackground`
- ScrollView, Badge, Button
- Image (expo-image), Ionicons

#### Hooks Usados
- `useState` - Batch, quantity, optimisticIsFavorite
- `useEffect` - Load batch
- `useQuery` - Favoritos
- `useMutation` - Toggle favorite
- `useMemo` - Product data

#### API Calls
- `api.getPublicBatch(id)` - Detalhes
- `api.addFavorite(batchId)` - Marcar
- `api.removeFavoriteByBatch(batchId)` - Desmarcar
- `api.addToCart(batchId, quantity, replaceCart?)`

#### Funcionalidades
- Display completo do produto
- Favoritar com otimistic update
- Adicionar ao carrinho
- Selector de quantidade (1-99, max=stock)
- Share (sistema)
- Info de loja, endereço, horário

#### Dados Exibidos
- Hero image (800px otimizado)
- Badge desconto
- Nome, categoria
- Preço original/promo
- Economia
- Dias para vencer
- Stock disponível
- Info loja

#### UX/UI Atual
- Hero image grande (400px)
- Header flutuante com actions
- Info cards com ícones
- Price container com borders
- Store info row
- Quantity selector
- Bottom bar sticky

#### Navegação
- **De:** Vitrine, favoritos, lojas
- **Para:** Carrinho (ao adicionar)

#### Sugestões de Melhorias Visuais
- Galeria de imagens (carousel)
- Reviews de clientes
- Produtos similares
- Variações
- Histórico de preço
- Notificação reabastecimento
- Deep linking

#### Sugestões de Performance
- Image optimization
- Lazy loading de related products

---

### 13. Detalhes do Pedido

**Arquivo:** `app/order/[id].tsx`
**Linhas:** 666
**Role:** Customer

#### Informações Básicas
- Nome: Detalhes do Pedido
- Acesso: Lista de pedidos
- Tamanho: 666 linhas

#### Componentes Usados
- `GradientBackground`
- ScrollView, Image
- Ionicons, TouchableOpacity

#### Hooks Usados
- `useState` - Order, pixCode, pixQrCode
- `useEffect` - Load, polling, Supabase subscription
- `useRef` - Load function

#### API Calls
- `api.getMyOrder(orderId)` - Detalhes
- `api.checkout(orderId)` - Gera/retorna PIX (idempotente)

#### Services
- Supabase realtime (escuta ORDER)
- Polling 3s para pagamento

#### Funcionalidades
- Status com cores e ícones
- Prazo retirada com countdown
- Código retirada copiável
- PIX display (QR + code)
- Lista de itens
- Info de loja
- Timeline de eventos
- Auto-polling

#### Status Info
- pending_payment: warning, time
- paid: success, checkmark
- picked_up: primary, bag-check
- cancelled: error, close
- Prazo: "Restam Xh Ymin" ou "Expirado"

#### UX/UI Atual
- Status card grande
- Pickup code box Emerald-50 dashed
- PIX card com QR
- Copy button
- Timer box amarelo
- Timeline com dots
- Monospace font

#### Navegação
- **De:** Pedidos, checkout
- **Para:** Detalhes

#### Sugestões de Melhorias Visuais
- Push notification (confirmação)
- Link compartilhável
- Review do pedido
- Reclamação
- Print do código
- Webhook payment

#### Sugestões de Performance
- Stop polling ao detectar pagamento
- Cache de detalhes

---

### 14. Checkout Screen

**Arquivo:** `app/checkout/[storeId].tsx`
**Linhas:** 873
**Role:** Customer

#### Informações Básicas
- Nome: Checkout / Pagamento PIX
- Acesso: Carrinho
- Tamanho: 873 linhas

#### Componentes Usados
- `GradientBackground`
- ScrollView, Button, Input
- Toast, ProfileRequiredModal
- Image, Ionicons
- PixSuccessView (subcomponente)

#### Hooks Usados
- `useState` - Cart, order, pixCode, processing
- `useEffect` - Load, polling, Supabase listener
- `useRef` - Load function
- `useSharedValue` + `useAnimatedStyle` - Animação

#### API Calls
- `api.getPublicStore(storeId)` - Validar wallet
- `api.getCart()` - Carrega
- `api.reserveCart(storeId)` - Reserva
- `api.createOrder(storeId)` - Cria
- `api.checkout(orderId)` - Gera PIX
- `api.mockConfirmPayment(orderId)` - Mock (DEV)

#### Contexts
- `useAuth` - isProfileComplete

#### Funcionalidades
- Validação perfil completo
- Resumo do pedido
- Payment method: PIX
- Geração idempotente
- Polling detecção
- Supabase real-time
- Mock payment (DEV)
- Copy clipboard

#### UX/UI Atual
- Progress indicator (3 steps)
- Order summary
- Payment card PIX
- QR code (220x220)
- PIX code box dashed
- Copy button
- Timer box
- Mock button (DEV)

#### PixSuccessView
- Animação scale + opacity
- QR code ou placeholder
- PIX code selectable
- Copy button
- Timer info

#### Navegação
- **De:** Carrinho
- **Para:** `/order/[id]` (após confirmação)

#### Sugestões de Melhorias Visuais
- Múltiplos métodos pagamento
- Parcelamento
- Coupon/desconto
- Endereço entrega
- Insurance
- Histórico
- Autofill

#### Sugestões de Performance
- Prefetch do QR code
- Cache de order criado

---

## ESTATÍSTICAS GERAIS

### Resumo
- **Total de Telas:** 16 principais
- **Linhas de Código:** ~9.000+ (sem node_modules)
- **Componentes Reutilizáveis:** 25+
- **Hooks Customizados:** 5+ (useAuth, useCart, useErrorHandler, useToast, useFilteredBatches)
- **Contexts Globais:** 2 (AuthContext, CartContext)
- **API Endpoints:** 25+

### Stack Tecnológico
- **Framework:** React Native (Expo 54)
- **Linguagem:** TypeScript (strict mode)
- **Roteamento:** Expo Router v6 (file-based)
- **Animações:** Reanimated 2
- **State Server:** TanStack React Query
- **Autenticação:** Supabase Auth + JWT
- **UI Components:** Base components + Ionicons
- **Images:** expo-image (otimizações)
- **Lists:** AdaptiveList (FlashList)

### Padrões Observados
1. **Lazy Loading** - Imagens otimizadas
2. **Otimistic Updates** - Carrinho, favoritos
3. **Error Handling** - Centralizado
4. **Haptic Feedback** - Ações importantes
5. **Accessibility** - Labels, hints, roles
6. **Performance** - Memoization, callbacks
7. **Offline** - AsyncStorage cache
8. **Real-time** - Supabase subscriptions

---

## MELHORIAS GLOBAIS SUGERIDAS

### Performance (P0)
1. Implementar paginação real em todas as listas
2. Image lazy loading com blur hash
3. Virtual scrolling otimizado
4. Background fetch de dados
5. Cache-first strategy
6. Prefetch de rotas navegáveis

### UX/UI (P1)
1. Skeleton loaders consistentes
2. Animações de transição entre telas
3. Pull-to-refresh visual melhorado
4. Empty states personalizados
5. Error states com retry
6. Loading states unificados

### Funcionalidades (P2)
1. Modo offline real
2. Notificações push implementadas
3. Deep linking completo
4. Share de produtos/lojas
5. Reviews e ratings
6. Chat com loja

---

**Fim do Catálogo**

**Análise Completada:** 01/01/2026
**Analisado por:** Claude Code
**Repositório:** frontend-mobile2025
