# Documentação de Telas - VenceJá Mobile

Este documento lista todas as telas do aplicativo mobile VenceJá, organizadas por categoria e funcionalidade.

---

## 📊 Resumo Quantitativo

| Categoria | Quantidade |
|-----------|------------|
| Autenticação/Público | 3 telas |
| Consumidor | 7 telas |
| Lojista | 8 telas |
| Detalhes (dinâmicas) | 3 telas |
| **TOTAL** | **21 telas** |

---

## 🔐 Telas Públicas/Autenticação

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `app/index.tsx` | **Tela de Login** - Exibe logo, features do app, botão de login com Google OAuth e opção de "Modo Demo". Verifica sessão existente e redireciona conforme o role do usuário (customer/merchant). |
| `/select-role` | `app/select-role.tsx` | **Seleção de Perfil** - Permite ao usuário escolher entre "Consumidor" (comprar produtos com desconto) ou "Lojista" (vender e reduzir desperdício). Redireciona para o setup correspondente após seleção. |
| `/auth/callback` | `app/auth/callback.tsx` | **Callback OAuth** - Processa o retorno do Google OAuth, configura a sessão do Supabase e redireciona o usuário para a tela apropriada baseado no seu role e status do perfil. |

---

## 👤 Telas do Consumidor (`/(customer)/`)

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/(customer)/` | `app/(customer)/index.tsx` | **Vitrine (Home)** - Tela principal do consumidor. Lista produtos/batches públicos com descontos. Possui busca por texto, filtros (preço mínimo/máximo, dias até vencer, raio de distância), categorias. Permite adicionar produtos ao carrinho com seleção de quantidade. Mostra skeleton loader enquanto carrega. Remove produtos vencidos automaticamente. |
| `/(customer)/setup` | `app/(customer)/setup.tsx` | **Completar Perfil (Consumidor)** - Formulário para completar cadastro: telefone, CPF (opcional), endereço via CEP (auto-preenche), seleção de raio de busca (2km-30km), permissão de localização. Validação de campos e feedback visual. |
| `/(customer)/cart` | `app/(customer)/cart.tsx` | **Carrinho de Compras** - Lista itens do carrinho agrupados por loja. Permite alterar quantidades, remover itens. Exibe subtotal e total por loja. Botão "Pagar com PIX" para ir ao checkout. Modal de perfil incompleto se necessário. Atualizações otimistas. |
| `/(customer)/favorites` | `app/(customer)/favorites.tsx` | **Favoritos** - Lista de produtos/batches favoritados pelo usuário. Permite adicionar ao carrinho ou remover dos favoritos. Empty state quando não há favoritos. |
| `/(customer)/orders` | `app/(customer)/orders.tsx` | **Meus Pedidos** - Lista histórico de pedidos do consumidor com status (Aguardando Pagamento, Pago-Retirar, Retirado, Cancelado, Expirado). Exibe código de retirada para pedidos pagos. Navega para detalhes do pedido. |
| `/(customer)/profile` | `app/(customer)/profile.tsx` | **Perfil (Consumidor)** - Exibe foto, nome, email, badge "Consumidor". Menu com opções: Editar Perfil, Endereços, Notificações, Trocar para Lojista, Ajuda, Termos de Uso, Sair. |
| `/(customer)/store-products` | `app/(customer)/store-products.tsx` | **Produtos da Loja / Lista de Lojas** - Dois modos: (1) Lista de lojas disponíveis com busca e filtros de distância/tipo; (2) Detalhes de uma loja específica com seus produtos em grid. Usa localização e paginação. |

---

## 🏪 Telas do Lojista (`/(merchant)/`)

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/(merchant)/` | `app/(merchant)/index.tsx` | **Dashboard (Home Lojista)** - Resumo: total de vendas, vendas hoje, retiradas pendentes, estoque baixo. Gráfico de vendas diárias (últimos 7 dias). Ações rápidas: Novo Produto, Verificar Retirada, Produtos, Lojas. Alertas de produtos vencendo e estoque baixo. Badge de notificações. |
| `/(merchant)/stores` | `app/(merchant)/stores.tsx` | **Minhas Lojas** - Lista lojas do lojista com status (Ativa/Inativa), CNPJ, endereço, telefone, horário. Botão para adicionar nova loja (primeira é gratuita, demais requerem plano premium). Navega para edição. |
| `/(merchant)/create-store` | `app/(merchant)/create-store.tsx` | **Nova/Editar Loja** - Formulário completo: foto da loja (upload), nome, CNPJ, tipo de loja, telefone, endereço via CEP (auto-preenche), horário de funcionamento (abertura/fechamento). Modo edição quando `editStoreId` é passado. Validação de CNPJ. |
| `/(merchant)/products` | `app/(merchant)/products.tsx` | **Produtos (Batches)** - Lista todos os batches/produtos do lojista com: foto, nome, categoria, preço original/promocional, desconto, dias até vencer, estoque. Filtro por loja (se tiver múltiplas). Botão FAB para criar produto. Navega para edição/exclusão. |
| `/(merchant)/create-product` | `app/(merchant)/create-product.tsx` | **Novo/Editar Produto** - Formulário: 2 fotos obrigatórias (produto e validade), nome, descrição, categoria, preço original, preço promocional (calcula desconto automaticamente), data de validade (picker dos próximos 30 dias), estoque, toggle ativo/inativo. Validação de datas e estoque. |
| `/(merchant)/sales` | `app/(merchant)/sales.tsx` | **Pedidos/Vendas** - Lista pedidos da loja com filtros de status (A retirar, Aguardando, Retirado, Cancelado, Todos). Campo para verificar código de retirada. Exibe cliente, itens, total, código de retirada pendente. Navega para detalhes do pedido. |
| `/(merchant)/sale-order/[id]` | `app/(merchant)/sale-order/[id].tsx` | **Detalhes do Pedido (Lojista)** - Visualização completa do pedido: status, prazo de retirada, dados do cliente (nome, email, telefone com botão ligar), itens com quantidades e preços, totais (bruto, taxa plataforma, valor loja), status do pagamento, formulário para confirmar retirada com código. |
| `/(merchant)/profile` | `app/(merchant)/profile.tsx` | **Perfil (Lojista)** - Exibe foto, nome, email, badge "Lojista". Menu com opções: Minhas Lojas, Dados Bancários, Plano Premium, Trocar para Consumidor, Notificações, Ajuda, Sair. |

---

## 📱 Telas Dinâmicas (Detalhes)

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/product/[id]` | `app/product/[id].tsx` | **Detalhes do Produto** - Tela completa do batch/produto: imagem grande, badge desconto, nome da loja, nome do produto, categoria, descrição, preço original/promocional, economia, dias até vencer, estoque, endereço/horário da loja. Seletor de quantidade e botão "Adicionar ao carrinho". Botões de compartilhar e favoritar. |
| `/checkout/[storeId]` | `app/checkout/[storeId].tsx` | **Checkout** - Resumo do pedido (itens, quantidades, total). Método de pagamento PIX. Ao gerar PIX: exibe QR Code e código copia-cola. Polling para verificar pagamento confirmado. Timer de 2h para retirada. Requer perfil completo. |
| `/order/[id]` | `app/order/[id].tsx` | **Detalhes do Pedido (Consumidor)** - Status visual (Aguardando/Pago/Retirado/Cancelado), código de retirada em destaque, prazo de retirada, QR Code PIX se pendente (com opção de recarregar/copiar), dados da loja (nome, endereço, horário), itens do pedido, timeline de histórico (criado, pago, retirado). |

---

## 🧭 Navegação (Tab Bars)

### Consumidor (`/(customer)/_layout.tsx`)

A navegação do consumidor utiliza uma **Tab Bar** na parte inferior com 5 abas:

1. 🏠 **Vitrine** (`/(customer)/`) - Ofertas do dia
2. 🛒 **Carrinho** (`/(customer)/cart`) - Itens no carrinho
3. ❤️ **Favoritos** (`/(customer)/favorites`) - Produtos favoritados
4. 📋 **Pedidos** (`/(customer)/orders`) - Histórico de pedidos
5. 👤 **Perfil** (`/(customer)/profile`) - Configurações e perfil

### Lojista (`/(merchant)/_layout.tsx`)

A navegação do lojista utiliza uma **Tab Bar** na parte inferior com 5 abas:

1. 🏠 **Dashboard** (`/(merchant)/`) - Resumo e métricas
2. 📦 **Produtos** (`/(merchant)/products`) - Gerenciar produtos/batches
3. 💰 **Vendas** (`/(merchant)/sales`) - Pedidos e retiradas
4. 🏪 **Lojas** (`/(merchant)/stores`) - Gerenciar lojas
5. 👤 **Perfil** (`/(merchant)/profile`) - Configurações e perfil

---

## 🔄 Fluxo de Navegação

### Fluxo de Autenticação

```
Login (/) 
  ↓
[Google OAuth]
  ↓
Callback (/auth/callback)
  ↓
[Verifica Role]
  ↓
┌─────────────┬─────────────┐
│ Sem Role    │ Com Role    │
│             │             │
↓             ↓             ↓
Select Role   Customer      Merchant
(/select-role) Dashboard    Dashboard
              (/(customer)) (/(merchant))
```

### Fluxo do Consumidor

```
Vitrine (/(customer)/)
  ↓
[Buscar/Ver Produto]
  ↓
Detalhe Produto (/product/[id])
  ↓
[Adicionar ao Carrinho]
  ↓
Carrinho (/(customer)/cart)
  ↓
[Pagar com PIX]
  ↓
Checkout (/checkout/[storeId])
  ↓
[PIX Gerado → Polling]
  ↓
Pedidos (/(customer)/orders)
  ↓
Detalhe Pedido (/order/[id])
```

### Fluxo do Lojista

```
Dashboard (/(merchant)/)
  ↓
[Gerenciar Lojas]
  ↓
Lojas (/(merchant)/stores)
  ↓
Criar/Editar Loja (/(merchant)/create-store)
  ↓
[Gerenciar Produtos]
  ↓
Produtos (/(merchant)/products)
  ↓
Criar/Editar Produto (/(merchant)/create-product)
  ↓
[Ver Vendas]
  ↓
Vendas (/(merchant)/sales)
  ↓
Detalhe Venda (/(merchant)/sale-order/[id])
  ↓
[Confirmar Retirada]
```

---

## 📝 Notas Técnicas

### Componentes Reutilizáveis

- `GradientBackground` - Fundo gradiente usado em todas as telas
- `AnimatedBatchCard` - Card de produto com animações
- `EmptyState` - Estado vazio com ícone e mensagem
- `SkeletonProductCard` - Loading skeleton para produtos
- `ProfileRequiredModal` - Modal para perfil incompleto
- `SalesChart` - Gráfico de vendas (dashboard lojista)

### Contextos Globais

- `AuthContext` - Gerencia autenticação e sessão do usuário
- `CartContext` - Gerencia carrinho com cache e atualizações otimistas

### Serviços

- `api.ts` - Cliente REST para comunicação com backend NestJS
- `supabase.ts` - Cliente Supabase para autenticação OAuth

### Recursos Utilizados

- **Localização** - Expo Location para buscar produtos por proximidade
- **Câmera/Galeria** - Expo ImagePicker para upload de fotos
- **Haptics** - Feedback tátil em ações importantes
- **Deep Linking** - Expo Router para navegação e deep links

---

## 🎨 Design System

O aplicativo utiliza um design system consistente com:

- **Cores**: Definidas em `constants/Colors.ts`
- **Tokens de Design**: Espaçamentos, tipografia, sombras em `constants/designTokens.ts`
- **Componentes Base**: Button, Input, Badge, Skeleton em `components/base/`
- **Estilo Glassmorphism**: Cards com efeito de vidro e bordas sutis

---

**Última atualização**: Dezembro 2025
