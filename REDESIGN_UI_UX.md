# Redesign Completo UI/UX - VenceJá

## Objetivo

Transformar o app em uma experiência visual premium com layout moderno, espaçamentos harmoniosos, cards elegantes, filtros intuitivos e responsividade perfeita para todos os dispositivos.

---

## 1. Sistema de Grid e Espaçamentos

### 1.1 Grid System Responsivo

- **Base**: 4px (todos os espaçamentos múltiplos de 4)
- **Breakpoints**:
  - Small: < 375px (iPhone SE)
  - Medium: 375px - 414px (iPhone padrão)
  - Large: > 414px (iPhone Plus, Android grande)

### 1.2 Espaçamentos Padronizados

```typescript
// Atualizar designTokens.ts
spacing: {
  xs: 4,    // 4px - micro espaços
  sm: 8,    // 8px - pequenos gaps
  md: 16,   // 16px - padrão
  lg: 24,   // 24px - seções
  xl: 32,   // 32px - grandes seções
  xxl: 48,  // 48px - espaçamento entre telas
  xxxl: 64, // 64px - hero sections
}
```

### 1.3 Padding Responsivo

- **Telas pequenas**: paddingHorizontal: 16px
- **Telas médias**: paddingHorizontal: 20px
- **Telas grandes**: paddingHorizontal: 24px

---

## 2. Redesign de Cards

### 2.1 Product Card (Vitrine)

**Problemas atuais**:

- Cards muito compactos
- Informações sobrepostas
- Falta hierarquia visual clara

**Novo Design**:

```
┌─────────────────────────────┐
│  [Imagem 200x200]           │
│  [Badge Desconto]           │
│                             │
├─────────────────────────────┤
│  [Store Logo 32x32] Store   │
│  Nome do Produto            │
│  (2 linhas max)             │
│                             │
│  R$ 99,99  R$ 29,99         │
│  (riscado)  (verde grande)  │
│                             │
│  ⏰ Vence em 3 dias         │
│  📦 5 disponíveis           │
│                             │
│  [─] 2 [+]  [Adicionar]     │
└─────────────────────────────┘
```

**Melhorias**:

- **Imagem**: 200px altura (proporção 1:1), bordas arredondadas superiores
- **Badge desconto**: Posição top-right, tamanho maior (48x48), fonte bold
- **Store info**: Logo pequeno (32x32) + nome em linha separada
- **Preços**: Layout horizontal com destaque visual maior
- **Info vencimento/estoque**: Cards pequenos com ícones
- **Botão adicionar**: Full width, altura 48px, verde vibrante
- **Espaçamento interno**: 16px padding
- **Sombra**: Elevação sutil (shadow-md)

### 2.2 Cart Item Card

**Novo Design**:

```
┌─────────────────────────────────────┐
│  [Img 80x80]  Nome Produto         │
│              R$ 29,99 /un           │
│              R$ 59,98 total         │
│                                     │
│              [─] 2 [+]  [🗑️]        │
└─────────────────────────────────────┘
```

**Melhorias**:

- **Layout horizontal**: Imagem à esquerda (80x80), info à direita
- **Hierarquia de preços**: Unitário pequeno, total em destaque verde
- **Controles**: Alinhados à direita, botão remover mais visível
- **Espaçamento**: 16px padding, gap de 12px entre elementos

### 2.3 Order Card

**Novo Design**:

```
┌─────────────────────────────────────┐
│  Pedido #ABC123    [Badge Status]  │
│  15/12/2025                         │
│                                     │
│  🏪 Nome da Loja                    │
│                                     │
│  ───────────────────────────────    │
│  Total                    R$ 99,99 │
│                                     │
│  [Código: 1234] (se pago)          │
└─────────────────────────────────────┘
```

**Melhorias**:

- **Header**: Flex row com badge alinhado à direita
- **Divisor visual**: Linha sutil entre info e total
- **Código retirada**: Card destacado com fundo verde claro
- **Espaçamento**: 20px padding, 12px entre seções

---

## 3. Redesign de Filtros

### 3.1 Filtros na Vitrine

**Problemas atuais**:

- Filtros ocupam muito espaço quando abertos
- Layout confuso com muitos campos
- Chips pequenos demais

**Novo Design - Filtros Colapsáveis**:

```
┌─────────────────────────────────────┐
│  🔍 Buscar...  [Filtros ▼]         │
├─────────────────────────────────────┤
│  [Todos] [Frutas] [Verduras] ...   │
└─────────────────────────────────────┘
```

**Quando filtros expandidos**:

```
┌─────────────────────────────────────┐
│  🔍 Buscar...  [Filtros ▲]         │
├─────────────────────────────────────┤
│  Preço                              │
│  ┌──────┐ até ┌──────┐              │
│  │ R$ 0 │     │ R$ 50│              │
│  └──────┘     └──────┘              │
│                                     │
│  Vence em                           │
│  [Hoje] [3 dias] [7 dias] [15]     │
│                                     │
│  Distância                           │
│  [2km] [5km] [10km] [15km] [20km]  │
│                                     │
│  [Limpar Filtros]                   │
└─────────────────────────────────────┘
```

**Melhorias**:

- **Animações**: Slide down suave ao expandir
- **Chips maiores**: Altura 40px, padding horizontal 16px
- **Inputs de preço**: Campos maiores (120px width), labels acima
- **Layout em grid**: Chips organizados em grid 2-3 colunas
- **Botão limpar**: Destaque visual, posicionado no final

### 3.2 Filtros de Status (Vendas/Pedidos)

**Novo Design - Tabs Horizontais**:

```
┌─────────────────────────────────────┐
│  [Todos] [Pendente] [Pago] [Retirado]│
└─────────────────────────────────────┘
```

**Melhorias**:

- **Tabs**: Altura 48px, padding horizontal 20px
- **Ativo**: Fundo verde, texto branco, underline verde
- **Inativo**: Fundo branco, texto cinza, borda sutil
- **Scroll horizontal**: Se muitos filtros, permitir scroll

---

## 4. Redesign de Campos de Formulário

### 4.1 Input Fields

**Problemas atuais**:

- Campos muito compactos
- Labels pouco visíveis
- Falta feedback visual

**Novo Design**:

```
┌─────────────────────────────────────┐
│  Nome Completo *                    │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  Telefone                           │
│  ┌───────────────────────────────┐  │
│  │ (11) 99999-9999              │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Melhorias**:

- **Labels**: Acima do campo, fonte 14px, peso 600, cor #374151
- **Campo**: Altura 56px, padding 16px, border radius 12px
- **Focus state**: Borda verde 2px, sombra sutil
- **Error state**: Borda vermelha, mensagem abaixo
- **Placeholder**: Cor #9CA3AF, tamanho 16px

### 4.2 Select/Dropdown

**Novo Design**:

```
┌─────────────────────────────────────┐
│  Categoria *                         │
│  ┌───────────────────────────────┐  │
│  │ Frutas                    ▼   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Melhorias**:

- **Visual**: Similar ao input, mas com chevron à direita
- **Modal**: Bottom sheet com opções grandes (56px altura cada)
- **Seleção**: Checkmark verde à direita do item selecionado

### 4.3 Image Picker

**Novo Design**:

```
┌─────────────────────────────────────┐
│  Foto do Produto *                   │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │      📷 Adicionar Foto        │  │
│  │      ou arraste aqui          │  │
│  │                               │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Melhorias**:

- **Área**: 200x200px, borda tracejada, fundo #F3F4F6
- **Preview**: Quando imagem selecionada, mostrar preview
- **Botão remover**: X no canto superior direito

---

## 5. Layout e Estrutura das Telas

### 5.1 Vitrine (Home Consumidor)

**Estrutura Nova**:

```
┌─────────────────────────────────────┐
│  Olá, João! 👋                      │
│  Ofertas do dia                     │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🔍 Buscar... [Filtros]        │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Todos] [Frutas] [Verduras] ...   │
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │Card 1│ │Card 2│ │Card 3│       │
│  └──────┘ └──────┘ └──────┘       │
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │Card 4│ │Card 5│ │Card 6│       │
│  └──────┘ └──────┘ └──────┘       │
└─────────────────────────────────────┘
```

**Melhorias**:

- **Header fixo**: Sticky header com busca sempre visível
- **Grid responsivo**: 
  - Small: 1 coluna
  - Medium: 2 colunas (gap 12px)
  - Large: 2 colunas (gap 16px)
- **Scroll suave**: Infinite scroll com skeleton loaders
- **FAB**: Botão flutuante "Ver carrinho" (se tiver itens)

### 5.2 Carrinho

**Estrutura Nova**:

```
┌─────────────────────────────────────┐
│  Carrinho (2 lojas)                 │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🏪 Loja ABC                    │  │
│  ├───────────────────────────────┤  │
│  │ [Img] Produto 1    [─] 2 [+]  │  │
│  │ [Img] Produto 2    [─] 1 [+]  │  │
│  ├───────────────────────────────┤  │
│  │ Total: R$ 99,99               │  │
│  │ [Pagar com PIX]               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🏪 Loja XYZ                    │  │
│  │ ...                            │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Melhorias**:

- **Cards por loja**: Cada loja em card separado, espaçamento 16px
- **Sticky footer**: Total geral fixo no bottom (se múltiplas lojas)
- **Empty state**: Centralizado, ícone grande, CTA destacado

### 5.3 Dashboard Lojista

**Estrutura Nova**:

```
┌─────────────────────────────────────┐
│  Olá, João! 👋  [🔔]                │
│  Dashboard                           │
│                                     │
│  ┌──────────┐ ┌──────────┐        │
│  │ R$ 1.234 │ │ R$ 456   │        │
│  │ Total    │ │ Hoje     │        │
│  └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐        │
│  │ 3        │ │ 5        │        │
│  │ Retirar  │ │ Estoque  │        │
│  └──────────┘ └──────────┘        │
│                                     │
│  Ações Rápidas                      │
│  ┌──────────┐ ┌──────────┐        │
│  │ ➕ Novo  │ │ 📦 Retir │        │
│  │ Produto  │ │          │        │
│  └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐        │
│  │ 📊 Prod. │ │ 🏪 Lojas │        │
│  └──────────┘ └──────────┘        │
│                                     │
│  [Gráfico de Vendas]               │
└─────────────────────────────────────┘
```

**Melhorias**:

- **Stats cards**: Grid 2x2, cards maiores (flex: 1), ícones maiores (32px)
- **Quick actions**: Grid 2x2, cards com gradiente sutil
- **Hierarquia visual**: Stats primeiro, depois ações, depois gráfico
- **Espaçamento**: 16px entre cards, 24px entre seções

---

## 6. Responsividade

### 6.1 Breakpoints e Adaptações

**Small (< 375px)**:

- Padding horizontal: 12px
- Cards: 1 coluna
- Font sizes: -2px do padrão
- Touch targets: mínimo 44px

**Medium (375px - 414px)**:

- Padding horizontal: 16px
- Cards: 2 colunas
- Font sizes: padrão
- Touch targets: 48px

**Large (> 414px)**:

- Padding horizontal: 20px
- Cards: 2 colunas (mais espaçadas)
- Font sizes: +1px do padrão
- Touch targets: 52px

### 6.2 Componentes Adaptativos

**ProductCard**:

- Small: width 100% - 24px
- Medium: width (100% - 48px) / 2
- Large: width (100% - 64px) / 2

**Stats Cards**:

- Sempre 2 colunas, mas gap ajustável:
  - Small: gap 8px
  - Medium: gap 12px
  - Large: gap 16px

---

## 7. Melhorias de UX Específicas

### 7.1 Vitrine

**Melhorias**:

1. **Pull to refresh**: Animação suave, cor verde
2. **Skeleton loaders**: Cards com shimmer effect
3. **Empty state**: Ilustração + mensagem motivacional
4. **Filtros ativos**: Badge com contador no botão filtros
5. **Scroll infinito**: Loading indicator no final

### 7.2 Carrinho

**Melhorias**:

1. **Animação ao adicionar**: Card aparece com scale animation
2. **Feedback tátil**: Haptic em todas as ações
3. **Confirmação visual**: Toast ao remover item
4. **Sticky total**: Total fixo no bottom quando scroll
5. **Empty state**: CTA grande "Explorar Vitrine"

### 7.3 Checkout

**Melhorias**:

1. **Progress indicator**: Steps do checkout (Resumo → PIX → Confirmação)
2. **QR Code grande**: 280x280px, fundo branco, borda verde
3. **Timer visual**: Circular progress com tempo restante
4. **Copy button**: Grande, verde, com feedback visual
5. **Status updates**: Toast quando pagamento confirmado

### 7.4 Dashboard Lojista

**Melhorias**:

1. **Cards interativos**: Hover/press effect
2. **Gráfico interativo**: Tooltip ao tocar nos pontos
3. **Alertas destacados**: Cards de alerta com animação pulsante
4. **Quick stats**: Números grandes e legíveis
5. **Ações rápidas**: Ícones grandes, labels claros

---

## 8. Animações e Transições

### 8.1 Animações de Entrada

**Cards**:

- Stagger animation: delay de 50ms entre cards
- Scale + fade: 0.95 → 1.0, opacity 0 → 1
- Duration: 300ms com spring

**Modais**:

- Slide up: translateY 100 → 0
- Fade: opacity 0 → 1
- Duration: 250ms

### 8.2 Animações de Interação

**Botões**:

- Press: scale 0.97
- Release: scale 1.0 (spring)
- Duration: 150ms

**Cards**:

- Press: scale 0.98, elevation reduzida
- Release: scale 1.0, elevation normal

---

## 9. Hierarquia Visual

### 9.1 Tipografia

**Hierarquia**:

- **H1**: 32px, bold, cor #111827 (títulos principais)
- **H2**: 24px, semibold, cor #111827 (subtítulos)
- **H3**: 20px, semibold, cor #111827 (seções)
- **Body**: 16px, regular, cor #111827 (texto)
- **Caption**: 14px, regular, cor #6B7280 (auxiliar)
- **Small**: 12px, regular, cor #9CA3AF (labels)

### 9.2 Cores e Contraste

**Hierarquia de cores**:

- **Primária (Ação)**: Verde #059669 - botões principais, links
- **Secundária (Urgência)**: Laranja #F59E0B - alertas, vencimento
- **Sucesso**: Verde claro #22C55E - confirmações
- **Erro**: Vermelho #EF4444 - erros, desconto badge
- **Neutro**: Cinzas #6B7280, #9CA3AF - textos secundários

---

## 10. Ordem de Implementação

### Fase 1: Foundation (Design Tokens)

1. Atualizar `designTokens.ts` com novos espaçamentos
2. Criar sistema de breakpoints
3. Atualizar tipografia com hierarquia clara

### Fase 2: Componentes Base

4. Redesign `ProductCard` com novo layout
5. Redesign `AnimatedBatchCard` com melhor estrutura
6. Melhorar `Button` com estados visuais
7. Redesign `Input` com labels acima
8. Criar componente `Select` melhorado

### Fase 3: Componentes de Layout

9. Criar `FilterPanel` component (colapsável)
10. Melhorar `EmptyState` com ilustrações
11. Criar `StickyFooter` component
12. Melhorar `Skeleton` com shimmer

### Fase 4: Telas Consumidor

13. Redesign Vitrine (grid, filtros, cards)
14. Redesign Carrinho (layout horizontal, sticky footer)
15. Redesign Pedidos (cards melhorados)
16. Redesign Detalhe Produto (layout hero)
17. Redesign Checkout (progress, QR code grande)

### Fase 5: Telas Lojista

18. Redesign Dashboard (stats cards, grid actions)
19. Redesign Produtos (grid, FAB melhorado)
20. Redesign Vendas (filtros tabs, cards)
21. Redesign Formulários (inputs melhorados)

### Fase 6: Animações e Polimento

22. Adicionar animações de entrada (stagger)
23. Adicionar animações de interação (press)
24. Adicionar transições de navegação
25. Testar responsividade em diferentes dispositivos
26. Ajustes finais de espaçamento e alinhamento

---

## 11. Arquivos Principais a Modificar

### Design System

- `constants/designTokens.ts` - Espaçamentos, breakpoints
- `constants/Colors.ts` - Já atualizado

### Componentes Base

- `components/base/Button.tsx` - Estados visuais
- `components/base/Input.tsx` - Layout com label acima
- `components/base/Select.tsx` - Novo componente
- `components/ProductCard.tsx` - Redesign completo
- `components/product/AnimatedBatchCard.tsx` - Redesign completo
- `components/base/Skeleton.tsx` - Shimmer effect

### Componentes de Layout

- `components/FilterPanel.tsx` - Novo componente
- `components/StickyFooter.tsx` - Novo componente
- `components/feedback/EmptyState.tsx` - Melhorias visuais

### Telas Consumidor

- `app/(customer)/index.tsx` - Grid, filtros, layout
- `app/(customer)/cart.tsx` - Cards horizontais, sticky footer
- `app/(customer)/orders.tsx` - Cards melhorados
- `app/product/[id].tsx` - Layout hero
- `app/checkout/[storeId].tsx` - Progress, QR code

### Telas Lojista

- `app/(merchant)/index.tsx` - Grid stats, actions
- `app/(merchant)/products.tsx` - Grid, FAB
- `app/(merchant)/sales.tsx` - Tabs, cards
- `app/(merchant)/create-product.tsx` - Formulário melhorado
- `app/(merchant)/create-store.tsx` - Formulário melhorado

---

## 12. Métricas de Sucesso

### Visual

- Cards com hierarquia clara
- Espaçamentos consistentes (múltiplos de 4px)
- Tipografia legível em todos os tamanhos
- Contraste WCAG AA em todos os textos

### UX

- Touch targets mínimos de 44px
- Feedback visual em todas as ações
- Animações suaves (60fps)
- Loading states claros

### Responsividade

- Funciona bem em telas 320px - 480px+
- Grid adaptativo (1-2 colunas)
- Textos legíveis em todos os tamanhos
- Nenhum overflow horizontal

---

## 13. Exemplos Visuais de Melhorias

### Antes vs Depois - Product Card

**Antes**: Card compacto, informações sobrepostas

**Depois**: Card espaçoso, hierarquia clara, botão destacado

### Antes vs Depois - Filtros

**Antes**: Painel grande sempre visível

**Depois**: Painel colapsável, chips maiores, layout organizado

### Antes vs Depois - Formulário

**Antes**: Labels inline, campos pequenos

**Depois**: Labels acima, campos grandes (56px), feedback visual

---

Este plano garante um redesign completo que transforma o app em uma experiência visual premium, mantendo toda a funcionalidade existente.
