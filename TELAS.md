# 📱 Documentação Completa de Telas - VenceJá Mobile

Este documento lista e detalha todas as telas do aplicativo mobile VenceJá, organizado por categoria e funcionalidade.

**Última atualização**: Dezembro 2024
**Total de Telas**: 24 arquivos .tsx

---

## 📊 Resumo Quantitativo

| Categoria | Quantidade |
|-----------|------------|
| Autenticação/Público | 4 telas |
| Cliente (Customer) | 8 telas |
| Comerciante (Merchant) | 8 telas |
| Compartilhadas | 4 telas |
| **TOTAL** | **24 telas** |

---

## 🔐 1. TELAS PÚBLICAS / AUTENTICAÇÃO

### 1.1 Tela de Login
**Arquivo**: `app/index.tsx`
**Rota**: `/`
**Acesso**: Público (sem autenticação)

**Descrição**: Ponto de entrada principal do aplicativo.

**Componentes e Funcionalidades**:
- ✨ Logo animado com efeito de brilho (ícone leaf)
- 📋 Header: "VenceJá - Economize até 95%"
- 🎯 3 Cards de Features:
  - Até 95% de desconto
  - Retirada na loja via PIX
  - Sustentabilidade (redução de desperdício)
- 🔐 Botão "Continuar com Google" (OAuth via Supabase)
- 👤 Botão "Entrar em Modo Demo"
- 📄 Links para Termos de Uso e Política de Privacidade

**Fluxo de Navegação**:
- Verifica sessão existente
- Redireciona baseado no role do usuário:
  - Sem role → `/select-role`
  - Customer → `/(customer)`
  - Merchant → `/(merchant)`

**Estados**:
- `checking`: Verificando sessão
- `loading`: Processando login

---

### 1.2 Tela de Callback OAuth
**Arquivo**: `app/auth/callback.tsx`
**Rota**: `/auth/callback`
**Acesso**: Sistema (deep link)

**Descrição**: Processa o retorno da autenticação Google OAuth.

**Funcionalidades**:
- Extrai tokens de acesso e refresh da URL
- Configura sessão no Supabase
- Gerencia locks de autenticação (evita race conditions)
- Valida sessão e busca role do usuário no backend

**Fluxo de Redirecionamento**:
1. Sem role → `/select-role`
2. Customer com perfil completo → `/(customer)`
3. Customer sem dados → `/(customer)/setup`
4. Merchant → `/(merchant)`

**UI**: Loading com spinner e texto "Autenticando..."

---

### 1.3 Tela de Seleção de Perfil
**Arquivo**: `app/select-role.tsx`
**Rota**: `/select-role`
**Acesso**: Requer autenticação (mas sem role definido)

**Descrição**: Permite ao usuário escolher entre ser Cliente ou Comerciante.

**Componentes**:
- 👋 Saudação personalizada: "Olá, [Nome]!"
- ❓ Pergunta: "Como vai usar o app?"
- 🛒 Card "Consumidor": "Comprar com até 95% off"
- 🏪 Card "Lojista": "Vender e reduzir desperdício"
- 💡 Footer: "Você pode mudar depois nas configurações"

**Fluxo**:
- Consumidor → `/(customer)/setup` (configurar perfil)
- Lojista → `/(merchant)/create-store` (criar primeira loja)

---

### 1.4 Root Layout
**Arquivo**: `app/_layout.tsx`
**Tipo**: Sistema (não é uma tela visível)

**Descrição**: Layout raiz do aplicativo que envolve todas as telas.

**Providers Configurados**:
- `QueryClientProvider` (TanStack React Query)
- `AuthProvider` (contexto de autenticação)
- `CartProvider` (contexto do carrinho)

**Configurações**:
- Stack Navigator (Expo Router)
- Status bar em modo light
- Tema escuro (backgroundColor: '#0F0F23')
- Gerenciamento de focus para React Query

---

## 🛒 2. TELAS DO CLIENTE (CUSTOMER)

### 2.1 Layout do Cliente
**Arquivo**: `app/(customer)/_layout.tsx`
**Tipo**: Layout de grupo com Tabs

**Descrição**: Bottom tabs navigation para o perfil Cliente.

**Abas (6 tabs)**:
1. 🏪 **Vitrine** (`index`) - Ofertas do dia
2. ❤️ **Favoritos** (`favorites`) - Produtos favoritados
3. 🏢 **Lojas** (`store-products`) - Lojas e produtos
4. 🛒 **Carrinho** (`cart`) - Carrinho de compras
5. 📋 **Pedidos** (`orders`) - Histórico de pedidos
6. 👤 **Perfil** (`profile`) - Configurações

**Funcionalidades**:
- Verifica autenticação (redireciona para `/` se não autenticado)
- Verifica role (deve ser 'customer')
- Tela modal: Setup (sem aba na navbar)

---

### 2.2 Tela Vitrine (Ofertas do Dia)
**Arquivo**: `app/(customer)/index.tsx`
**Rota**: `/(customer)`
**Acesso**: Cliente autenticado

**Descrição**: Tela principal do cliente com ofertas de produtos próximos do vencimento.

**Componentes Principais**:

**Header**:
- Saudação personalizada
- "Ofertas do dia"
- Informação de raio de busca

**Busca e Filtros**:
- 🔍 Search bar (busca por nome, loja, categoria)
- 🎚️ Botão de filtros (abre FilterPanel)
- **Filtros disponíveis**:
  - Preço (mínimo/máximo)
  - Dias até vencimento
  - Raio de distância (km)

**Categorias**:
- Scroll horizontal com chips
- Categorias: Todos, Padaria, Laticínios, Carnes, Frutas, etc.
- Seleção única

**Lista de Produtos**:
- Cards animados (AnimatedBatchCard)
- Cada card exibe:
  - Logo da loja (circular no topo)
  - Imagem do produto
  - Nome do produto
  - Preço original (riscado) + preço promocional
  - Badge de desconto percentual
  - Badge de estoque disponível
  - Data de vencimento com alerta
  - Horário da loja
  - Seletor de quantidade (+ -)
  - Botão "Adicionar ao Carrinho"

**Funcionalidades**:
- Refresh control (pull to refresh)
- Skeleton loader enquanto carrega
- Empty state contextualizado
- Validação: produtos vencidos não aparecem
- Atualização otimista do carrinho
- Paginação preparada

---

### 2.3 Tela Favoritos
**Arquivo**: `app/(customer)/favorites.tsx`
**Rota**: `/(customer)/favorites`
**Acesso**: Cliente autenticado

**Descrição**: Lista de produtos/batches favoritados pelo usuário.

**Funcionalidades**:
- Lista de favoritos com React Query
- Card customizado por favorito:
  - Imagem do produto
  - Nome e loja
  - Preço original e promocional
  - Botão remover (coração ativo)
  - Botão "Adicionar ao Carrinho"

**Interações**:
- ❤️ Remover favorito (com animação e haptic feedback)
- 🛒 Adicionar ao carrinho (optimistic update)
- Refresh control
- Empty state quando sem favoritos

**Validações**:
- Verifica perfil completo antes de ações
- Rollback em caso de erro

---

### 2.4 Tela Lojas e Produtos
**Arquivo**: `app/(customer)/store-products.tsx`
**Rota**: `/(customer)/store-products`
**Acesso**: Cliente autenticado

**Descrição**: Listagem de lojas disponíveis ou produtos de uma loja específica.

**2 Modos de Visualização**:

**Modo 1: Lista de Lojas** (padrão)
- Cards de lojas com:
  - Logo, nome, endereço
  - Distância da localização do usuário
  - Horário de funcionamento
  - Tipo de loja (badge)
- Filtros:
  - Raio de distância
  - Tipo de loja
  - Busca por nome
- Paginação (10 lojas por página)

**Modo 2: Produtos da Loja** (quando `storeId` presente)
- Header com dados da loja
- Grid de produtos/batches
- Filtros específicos

**Parâmetros**:
- `storeId?` - ID da loja para visualização específica

---

### 2.5 Tela Carrinho
**Arquivo**: `app/(customer)/cart.tsx`
**Rota**: `/(customer)/cart`
**Acesso**: Cliente autenticado

**Descrição**: Carrinho de compras agrupado por loja.

**Funcionalidades**:
- **Agrupamento por Loja**:
  - Cada loja tem uma seção
  - Logo, nome e endereço da loja
  - Lista de itens da loja
  - Subtotal por loja
- **Itens do Carrinho**:
  - Card de produto com imagem
  - Nome, preço unitário
  - Seletor de quantidade (+ -)
  - Botão remover
- **Footer Fixo** (StickyFooter):
  - Total geral
  - Botão "Pagar com PIX" por loja
- **Validações**:
  - Verifica perfil completo (ProfileRequiredModal)
  - Atualização otimista de quantidade
- **Empty State**: Quando carrinho vazio

**Navegação**:
- Botão checkout → `/checkout/[storeId]`

---

### 2.6 Tela Meus Pedidos
**Arquivo**: `app/(customer)/orders.tsx`
**Rota**: `/(customer)/orders`
**Acesso**: Cliente autenticado

**Descrição**: Histórico de pedidos do cliente.

**Componentes**:
- Lista vertical de pedidos
- Card por pedido:
  - ID/Número do pedido
  - **Status com badge colorido**:
    - 🟡 Aguardando Pagamento (pending_payment)
    - 🟢 Pago - Retirar (paid)
    - 🔵 Retirado (picked_up)
    - 🔴 Cancelado (cancelled)
    - ⚫ Expirado (expired)
  - Data de criação
  - Total do pedido
  - Nome da loja

**Interações**:
- Tap no card → navega para `/order/[id]`
- Refresh control
- Animação ao entrar (stagger)

**Estados**:
- Loading skeleton
- Empty state quando sem pedidos

---

### 2.7 Tela Perfil do Cliente
**Arquivo**: `app/(customer)/profile.tsx`
**Rota**: `/(customer)/profile`
**Acesso**: Cliente autenticado

**Descrição**: Perfil e configurações do cliente.

**Seções**:

**Profile Card**:
- Avatar (foto ou placeholder)
- Nome do usuário
- Email
- Badge "Consumidor" 🛒

**Menu de Opções**:
- ⚙️ Configurações de Perfil
- 💳 Métodos de Pagamento
- 📍 Endereços Salvos
- 📋 Histórico de Pedidos
- ❤️ Favoritos
- ❓ Central de Ajuda
- 📄 Termos e Políticas

**Ações**:
- 🔄 Trocar Perfil (para Lojista) → `/select-role`
- 🚪 Sair (logout com confirmação)

---

### 2.8 Tela Setup Inicial
**Arquivo**: `app/(customer)/setup.tsx`
**Rota**: `/(customer)/setup`
**Tipo**: Modal (sem tab na navbar)
**Acesso**: Cliente em setup inicial

**Descrição**: Formulário para completar cadastro do cliente.

**Campos do Formulário**:
1. 📱 **Telefone** (validado, formato brasileiro)
2. 📄 **CPF** (validado com checksum)
3. 📮 **CEP** (busca automática de endereço)
4. 🏠 **Endereço** (preenchido automaticamente)
5. 🔢 **Número**
6. 🏢 **Complemento**
7. 🗺️ **Bairro**
8. 🏙️ **Cidade**
9. 🗾 **Estado**
10. 📍 **Raio de Busca** (2km, 5km, 10km, 20km, 30km)

**Funcionalidades**:
- Request de permissão de localização
- Auto-preenchimento via CEP (ViaCEP)
- Validações em tempo real
- Máscaras de input (telefone, CPF, CEP)
- Coordenadas geográficas automáticas
- Carrega dados existentes (se houver)

**Fluxo**:
- Salva com `updateProfile` no backend
- Redireciona para `/(customer)` após sucesso

**Estados**:
- loading, loadingLocation, loadingCEP
- Erros de validação por campo

---

## 🏪 3. TELAS DO COMERCIANTE (MERCHANT)

### 3.1 Layout do Comerciante
**Arquivo**: `app/(merchant)/_layout.tsx`
**Tipo**: Layout de grupo com Tabs

**Descrição**: Bottom tabs navigation para o perfil Comerciante.

**Abas (5 tabs)**:
1. 📊 **Dashboard** (`index`) - Métricas e vendas
2. 🏪 **Lojas** (`stores`) - Minhas lojas
3. 📦 **Produtos** (`products`) - Gerenciar produtos
4. 💰 **Vendas** (`sales`) - Pedidos e retiradas
5. 👤 **Perfil** (`profile`) - Configurações

**Funcionalidades**:
- Verifica autenticação
- Verifica role (deve ser 'merchant' ou 'store_owner')
- Redireciona para `/` se não autorizado

---

### 3.2 Tela Dashboard do Comerciante
**Arquivo**: `app/(merchant)/index.tsx`
**Rota**: `/(merchant)`
**Acesso**: Comerciante autenticado

**Descrição**: Painel principal com métricas e analytics.

**Componentes Principais**:

**Cards de Resumo** (Summary Cards):
- 💵 **Total de Vendas** (R$) - Vendas acumuladas
- 💰 **Vendas de Hoje** (R$) - Faturamento do dia
- 📋 **Pedidos Pendentes** (count) - Aguardando retirada
- 📦 **Estoque Baixo** (count) - Produtos com estoque crítico
- ⏰ **Produtos Vencendo** (count) - Próximos ao vencimento

**Gráfico de Vendas**:
- Componente: `SalesChart`
- Vendas diárias dos últimos 7 dias
- Mostra data, total (R$), quantidade de pedidos

**Ações Rápidas**:
- Botão "Novo Produto"
- Botão "Verificar Retirada"
- Botão "Produtos"
- Botão "Lojas"

**Funcionalidades**:
- Carrega dados da primeira loja do comerciante
- Refresh control
- Timeout de 8 segundos
- Empty state se sem lojas

---

### 3.3 Tela Minhas Lojas
**Arquivo**: `app/(merchant)/stores.tsx`
**Rota**: `/(merchant)/stores`
**Acesso**: Comerciante autenticado

**Descrição**: Lista de lojas do comerciante.

**Componentes**:
- Header com botão "Adicionar Loja"
- Lista de cards de lojas

**Card de Loja**:
- 🏪 Ícone de loja
- Nome da loja
- CNPJ (formatado)
- Status: Ativo/Inativo (badge colorido)
- 👑 Badge Premium (se is_premium)
- 📍 Endereço completo
- 📞 Telefone
- 🕐 Horário de funcionamento

**Ações por Loja**:
- ✏️ Editar → `/(merchant)/create-store?editStoreId=[id]`
- 🗑️ Excluir (com confirmação)
- 🔄 Toggle status (ativo/inativo)

**Regras de Negócio**:
- Primeira loja: gratuita
- Lojas adicionais: R$ 49,90/mês (plano Premium)
- Alert ao tentar adicionar mais lojas

**Field Mapping**: PT-BR (nome, telefone) ↔ EN (name, phone)

---

### 3.4 Tela Criar/Editar Loja
**Arquivo**: `app/(merchant)/create-store.tsx`
**Rota**: `/(merchant)/create-store`
**Acesso**: Comerciante autenticado

**Descrição**: Formulário para criar nova loja ou editar existente.

**Modos**:
- **Create**: Quando `pendingRole: 'merchant'`
- **Edit**: Quando `editStoreId` presente

**Campos do Formulário**:
1. 📷 **Logo** (upload de imagem)
2. 🏪 **Nome da Loja** (required)
3. 📄 **CNPJ** (formatado, validado)
4. 🏬 **Tipo de Loja** (select)
   - Padaria, Confeitaria, Supermercado, Açougue, Hortifruti, etc.
5. 📮 **CEP** (busca automática)
6. 🏠 **Endereço**
7. 🔢 **Número**
8. 🏢 **Complemento**
9. 🗺️ **Bairro**
10. 🏙️ **Cidade**
11. 🗾 **Estado**
12. 📱 **Telefone**
13. 🕐 **Horário de Abertura**
14. 🕐 **Horário de Fechamento**
15. 💳 **Asaas Wallet ID** (obrigatório para receber pagamentos)

**Funcionalidades**:
- Upload de logo via ImagePicker → Supabase Storage
- Auto-fetch de endereço via CEP
- Validações:
  - CNPJ: validação de checksum
  - Telefone: formato brasileiro
  - Horários: fechamento após abertura
  - Todos os campos obrigatórios
- Calcula deadline de retirada automaticamente
- Salva com `createStore` ou `updateStore`

**Fluxo**:
- Sucesso → redireciona para `/(merchant)`
- Erros → exibe mensagens por campo

**Parâmetros**:
- `pendingRole?`: 'merchant' (setup inicial)
- `editStoreId?`: UUID da loja (modo edit)

---

### 3.5 Tela Meus Produtos
**Arquivo**: `app/(merchant)/products.tsx`
**Rota**: `/(merchant)/products`
**Acesso**: Comerciante autenticado

**Descrição**: Gerenciamento de produtos e batches do comerciante.

**Componentes**:

**Header**:
- Título "Meus Produtos"
- Botão FAB "+" (criar novo produto)

**Filtro de Lojas**:
- Scroll horizontal com chips
- Seleção da loja (se múltiplas)

**Lista de Produtos**:
- Cards de produto/batch
- Cada card:
  - 🖼️ Imagem do produto
  - Nome
  - Categoria
  - 💵 Preço original (riscado) + promocional
  - 📉 Badge de desconto (%)
  - 📅 Data de vencimento (com alerta se próximo)
  - 📦 Estoque disponível
  - Status: Ativo/Inativo

**Ações por Produto**:
- ✏️ Editar → `/(merchant)/create-product?editProductId=[id]&editBatchId=[batchId]`
- 🗑️ Deletar (com confirmação)
- 👁️ Ver detalhes → `/product/[id]`

**Funcionalidades**:
- Refresh control
- Empty state quando sem produtos
- Field mapping: PT-BR ↔ EN

---

### 3.6 Tela Criar/Editar Produto
**Arquivo**: `app/(merchant)/create-product.tsx`
**Rota**: `/(merchant)/create-product`
**Acesso**: Comerciante autenticado

**Descrição**: Formulário para criar novo produto/batch ou editar existente.

**Modos**:
- **Create**: Modo padrão
- **Edit**: Quando `editProductId` e `editBatchId` presentes

**Campos do Formulário**:
1. 🏪 **Loja** (select de lojas do comerciante)
2. 📦 **Nome do Produto** (required)
3. 📝 **Descrição**
4. 🏷️ **Categoria** (select)
   - Padaria, Laticínios, Carnes, Frutas e Vegetais, Bebidas, etc.
5. 💰 **Preço Original** (required, > 0)
6. 💸 **Preço Promocional** (required, < preço original)
7. 📅 **Data de Vencimento** (DatePicker, data futura)
8. 📦 **Estoque Total** (quantidade)
9. ✅ **Ativo** (toggle boolean)
10. 📷 **Foto 1** (upload obrigatório)
11. 📷 **Foto 2** (upload opcional)

**Funcionalidades**:
- ImagePicker para selecionar fotos (câmera ou galeria)
- Upload para Supabase Storage
- DatePicker com modal e validação
- Validações completas:
  - Campos obrigatórios
  - Min/max length para texto
  - Data de vencimento no futuro
  - Preço > 0
  - Preço promo < preço original
- Cálculo automático de desconto percentual
- Reset form ao focar (create mode)

**Fluxo**:
- Salva com `createBatch` ou `updateBatch`
- Sucesso → redireciona para `/(merchant)/products`
- Erros → exibe mensagens por campo

**Parâmetros**:
- `editProductId?`: UUID do produto
- `editBatchId?`: UUID do batch
- `storeId?`: UUID da loja (pré-seleção)

---

### 3.7 Tela Vendas/Pedidos
**Arquivo**: `app/(merchant)/sales.tsx`
**Rota**: `/(merchant)/sales`
**Acesso**: Comerciante autenticado

**Descrição**: Listagem de pedidos/vendas das lojas do comerciante.

**Componentes**:

**Filtros**:
- 🏪 **Store Filter**: Chips de lojas (seleção única)
- 📊 **Status Filter**: Dropdown com opções:
  - Todos
  - Pago (paid) - padrão
  - Aguardando Pagamento (pending_payment)
  - Retirado (picked_up)
  - Cancelado (cancelled)

**Verificação de Código de Retirada**:
- Input para digitar código
- Botão "Verificar"
- Valida e marca pedido como retirado
- Loading state durante verificação

**Lista de Pedidos**:
- Cards de pedido
- Cada card:
  - ID do pedido
  - Nome do cliente
  - Total (R$)
  - Status com badge colorido
  - Data
  - Itens resumidos (ex: "3 itens")

**Ações por Pedido**:
- Tap no card → navega para `/(merchant)/sale-order/[id]`
- Marcar como retirado (via código)
- Cancelar pedido

**Funcionalidades**:
- Refresh control
- Empty state quando sem pedidos
- Filtragem por loja e status

---

### 3.8 Tela Perfil do Comerciante
**Arquivo**: `app/(merchant)/profile.tsx`
**Rota**: `/(merchant)/profile`
**Acesso**: Comerciante autenticado

**Descrição**: Perfil e configurações do comerciante.

**Seções**:

**Profile Card**:
- Avatar (foto ou placeholder)
- Nome do usuário
- Email
- Badge "Lojista" 🏪

**Menu de Opções**:
- 🏪 Minhas Lojas → `/(merchant)/stores`
- 📦 Meus Produtos → `/(merchant)/products`
- 💰 Pedidos → `/(merchant)/sales`
- ⚙️ Configurações
- 📊 Dashboard → `/(merchant)/`
- ❓ Central de Ajuda
- 📄 Termos e Políticas

**Ações**:
- 🔄 Trocar Perfil (para Cliente) → `/select-role`
- 🚪 Sair (logout com confirmação)

---

## 🔀 4. TELAS COMPARTILHADAS

### 4.1 Tela Detalhe do Produto
**Arquivo**: `app/product/[id].tsx`
**Rota**: `/product/[id]`
**Acesso**: Qualquer usuário autenticado
**Parâmetro**: `id` - ID do batch/produto

**Descrição**: Visualização detalhada de um produto/batch.

**Componentes**:

**Header**:
- ← Botão voltar
- 📤 Botão compartilhar (Share API nativo)
- ❤️ Botão favoritar (apenas para customers)

**Product Card**:
- 🖼️ Imagem grande do produto (carrousel se múltiplas)
- 🏪 Logo da loja (circular)
- Nome do produto
- 🏷️ Categoria
- 💵 Preço original (riscado)
- 💸 Preço promocional (destaque)
- 📉 Badge de desconto (%)
- ⭐ Rating/Avaliação (se implementado)

**Informações Detalhadas**:
- 📝 Descrição do produto
- 📅 Data de vencimento com urgência
- 📦 Estoque disponível
- 🕐 Horário da loja
- 📍 Localização/Distância

**Selector de Quantidade**:
- Botões + e -
- Quantidade selecionada

**CTAs**:
- 🛒 Botão "Adicionar ao Carrinho" (grande, primário)
- 💳 Botão "Comprar Agora" (direct checkout)

**Funcionalidades**:
- Favoritos (React Query) apenas para customers
- Verificação de perfil completo
- Optimistic updates no carrinho
- Haptic feedback

---

### 4.2 Tela Checkout
**Arquivo**: `app/checkout/[storeId].tsx`
**Rota**: `/checkout/[storeId]`
**Acesso**: Cliente autenticado + Perfil completo
**Parâmetro**: `storeId` - ID da loja para checkout

**Descrição**: Finalização de compra com pagamento PIX.

**Componentes**:

**Validação Inicial**:
- ProfileRequiredModal (verifica perfil completo)
- Valida asaas_wallet_id da loja

**Revisão do Carrinho**:
- Lista de itens da loja selecionada
- Card por item:
  - Imagem, nome
  - Quantidade × Preço unitário
  - Subtotal
  - Botão remover
- Total da compra

**Dados da Loja**:
- 🏪 Nome
- 📍 Endereço
- 🕐 Horário de funcionamento
- 📞 Telefone (com botão para ligar)

**Opções de Pagamento**:
- 📱 PIX (QR Code + Copy Paste) - implementado
- 💳 Cartão (se implementado)

**Fluxo de Pagamento PIX**:
1. Botão "Pagar com PIX"
2. Spinner enquanto gera código
3. Exibe QR Code
4. Campo copyable com código PIX
5. Countdown para expiração (se houver)
6. Polling para verificar pagamento

**Criação do Pedido**:
- Cria order no backend
- Retorna order ID
- Redireciona para `/order/[id]`

**Estados**:
- loading, processing
- isCheckingPayment (polling)
- Toast notifications (sucesso/erro)

---

### 4.3 Tela Detalhe do Pedido (Cliente)
**Arquivo**: `app/order/[id].tsx`
**Rota**: `/order/[id]`
**Acesso**: Cliente autenticado
**Parâmetro**: `id` - ID do pedido

**Descrição**: Visualização completa do pedido para o cliente.

**Componentes**:

**Header**:
- ID do pedido (ex: #12345)
- Status com badge colorido

**Order Summary**:
- 📅 Data de criação
- 💰 Total
- 📊 Status atual
- 🔢 **Código de Retirada** (destaque, copiável)
- ⏰ Prazo de retirada

**Informações da Loja**:
- 🏪 Nome
- 📍 Endereço
- 🕐 Horário de funcionamento
- 📞 Telefone

**Items do Pedido**:
- Lista de produtos
- Card por item:
  - Imagem
  - Nome
  - Quantidade × Preço
  - Subtotal

**Payment Info**:
- Status do pagamento
- **Se pendente**:
  - QR Code PIX
  - Código copy-paste
  - Countdown de expiração
  - Botão "Recarregar PIX"

**Timeline/Histórico**:
- Pedido criado
- Pagamento confirmado
- Pedido retirado
- Cancelado (se aplicável)

**Funcionalidades**:
- Copiar código de retirada (haptic feedback)
- Polling a cada 3 segundos se pending_payment
- Atualiza automaticamente quando pago
- Botão cancelar pedido (se allowed)

**Estados**:
- loading, pixLoading

---

### 4.4 Tela Detalhe do Pedido (Comerciante)
**Arquivo**: `app/(merchant)/sale-order/[id].tsx`
**Rota**: `/(merchant)/sale-order/[id]`
**Acesso**: Comerciante autenticado
**Parâmetros**:
- `id` - ID do pedido
- `storeId` - ID da loja (autorização)

**Descrição**: Visualização e gerenciamento do pedido para o comerciante.

**Componentes**:

**Header**:
- ID do pedido
- Status com badge colorido

**Order Summary**:
- 👤 Cliente (nome, telefone)
- 📅 Data do pedido
- 💰 Total
- 📊 Status
- 💳 Data de pagamento (se pago)

**Informações do Cliente**:
- Nome completo
- 📞 Telefone (botão para ligar)
- 📄 CPF (se disponível)
- 📍 Endereço de retirada

**Items do Pedido**:
- Lista de produtos
- Card por item:
  - Nome (via batch)
  - Quantidade × Preço unitário
  - Subtotal

**Gerenciamento do Código de Retirada**:
- 🔢 Exibe código de retirada (toggle reveal/hide)
- 📋 Botão copiar código
- **Input para Verificação**:
  - Campo para cliente digitar código
  - Botão "Verificar"
  - Validação normalizada (remove espaços, uppercase)
  - Loading state durante verificação

**Ações**:
- ✅ Marcar como retirado (após verificar código)
- ❌ Cancelar pedido (com confirmação)
- 📞 Entrar em contato com cliente

**Funcionalidades**:
- Refresh control
- Validação de código de retirada
- Atualização de status no backend
- Toast notifications

**Estados**:
- loading, refreshing
- verifying (código)
- pickupCode reveal

---

## 🗺️ MAPA DE NAVEGAÇÃO COMPLETO

```
┌─────────────────────────────────────────────────────────────┐
│                    / (LoginScreen)                          │
│               • Google OAuth                                │
│               • Modo Demo                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│ auth/callback    │      │ select-role      │
│ (OAuth Handler)  │──────▶│ (Escolha)        │
└──────────────────┘      └────────┬─────────┘
                                   │
                ┏──────────────────┴──────────────────┓
                ▼                                     ▼
        ┌──────────────────┐              ┌──────────────────┐
        │ /(customer)      │              │ /(merchant)      │
        │ [TABS]           │              │ [TABS]           │
        │                  │              │                  │
        │ • Vitrine        │              │ • Dashboard      │
        │ • Favoritos      │              │ • Lojas          │
        │ • Lojas          │              │ • Produtos       │
        │ • Carrinho       │              │ • Vendas         │
        │ • Pedidos        │              │ • Perfil         │
        │ • Perfil         │              │                  │
        │                  │              │ Modais:          │
        │ Modal:           │              │ • create-store   │
        │ • setup          │              │ • create-product │
        └────────┬─────────┘              └────────┬─────────┘
                 │                                 │
                 └────────┬────────────────────────┘
                          │
        ┏─────────────────┴─────────────────┓
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│ product/[id]     │              │ checkout/[id]    │
│ (Detalhe)        │              │ (PIX)            │
└──────────────────┘              └────────┬─────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │ order/[id]       │
                                  │ (Acompanhamento) │
                                  └──────────────────┘
```

---

## 📊 ESTATÍSTICAS E PADRÕES

### Componentes Reutilizáveis Mais Usados

1. **GradientBackground** - Fundo gradiente (todas as telas)
2. **AnimatedBatchCard** - Card de produto com animações
3. **AdaptiveList** - Lista otimizada (FlatList/SectionList)
4. **Button** - Botões customizados
5. **Badge** - Badges de status/categoria
6. **EmptyState** - Estados vazios
7. **FilterPanel** - Painel de filtros avançados
8. **SalesChart** - Gráfico de vendas
9. **ProfileRequiredModal** - Modal de validação de perfil
10. **StickyFooter** - Footer fixo com CTAs

### Padrões de Validação

- `validatePhone` - Telefone brasileiro
- `validateCPF` - CPF com checksum
- `validateCNPJ` - CNPJ com checksum
- `validateRequired` - Campos obrigatórios
- `validateMinLength` / `validateMaxLength`
- `validateFutureDate` - Datas no futuro
- `formatPhone`, `formatCPF`, `formatCNPJ`, `formatCEP`

### Gerenciamento de Estado

- **AuthContext** - Sessão e usuário
- **CartContext** - Carrinho com updates otimistas
- **React Query** - Server state (favoritos, produtos, pedidos)
- **Local State** - useState para forms e UI

### Padrões de Navegação

- **Stack Navigator** - Navegação principal (Expo Router)
- **Tabs Navigator** - Grupos customer e merchant
- **Modal** - Telas de setup
- **Deep Links** - OAuth callback
- **Params** - IDs dinâmicos ([id], [storeId])

### Integrações Externas

- **Supabase Auth** - Google OAuth
- **Supabase Storage** - Upload de imagens
- **ViaCEP** - Busca de endereço por CEP
- **Expo ImagePicker** - Seleção de fotos
- **Expo Location** - Geolocalização
- **Expo Haptics** - Feedback tátil
- **Share API** - Compartilhamento nativo

---

## 🎨 DESIGN SYSTEM

### Cores Principais

Definidas em `constants/Colors.ts`:
- Primary: Verde (#10B981)
- Secondary: Azul
- Success: Verde claro
- Warning: Amarelo/Laranja
- Error: Vermelho
- Background: Azul escuro (#0F0F23)

### Tokens de Design

Definidos em `constants/designTokens.ts`:
- **Spacing**: 4px base (xs, sm, md, lg, xl, xxl)
- **Typography**: Tamanhos e pesos de fonte
- **Shadows**: Elevações para cards
- **Border Radius**: Cantos arredondados

### Estilo Glassmorphism

- Cards com fundo semi-transparente
- Efeito de blur
- Bordas sutis
- Gradientes suaves

---

## 🔄 FLUXOS PRINCIPAIS

### Fluxo de Autenticação

```
Login → Google OAuth → Callback →
  └─ Sem role → Select Role → Setup/Create Store
  └─ Com role → Dashboard (Customer/Merchant)
```

### Fluxo de Compra (Cliente)

```
Vitrine → Produto Detail → Adicionar Carrinho →
Carrinho → Checkout → PIX → Pedido Criado →
Acompanhar Pedido → Retirar na Loja
```

### Fluxo de Venda (Comerciante)

```
Dashboard → Criar Loja → Criar Produto →
Aguardar Pedidos → Verificar Pagamento →
Confirmar Retirada (código) → Pedido Concluído
```

---

## 📝 NOTAS IMPORTANTES

### Convenções de Nomenclatura

- **Backend**: PT-BR snake_case (preco_normal, data_vencimento)
- **Frontend**: EN camelCase (originalPrice, expirationDate)
- **Field Mapping**: Normalização automática em `services/api.ts`

### Validações de Negócio

1. **Produtos Vencidos**: Não aparecem na vitrine
2. **Perfil Completo**: Obrigatório para checkout
3. **Wallet ID**: Obrigatório na loja para receber pagamentos
4. **Código de Retirada**: Validação case-insensitive, sem espaços
5. **Primeira Loja**: Gratuita; adicionais cobram Premium

### Performance

- **FlashList**: Listas longas
- **Memoização**: useCallback e useMemo
- **expo-image**: Cache agressivo
- **Skeleton Loaders**: Feedback visual
- **Optimistic Updates**: Carrinho e favoritos

---

**Última atualização**: Dezembro 2024
**Mantenedor**: Equipe VenceJá
**Repositório**: my-app (frontend mobile)
