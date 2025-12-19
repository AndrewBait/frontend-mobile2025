# CLAUDE.md

Este arquivo fornece orientações para o Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

---

## 🌐 INSTRUÇÃO IMPORTANTE: IDIOMA

**SEMPRE RESPONDA EM PORTUGUÊS BRASILEIRO.**

Você pode pensar e processar internamente em qualquer idioma, mas **todas as suas respostas, explicações, comentários de código e mensagens devem ser em português brasileiro**. Esta é uma regra absoluta que deve ser seguida em todas as interações.

---

## 🏗️ Instruções do Sistema: Especialista Full Stack (NestJS & React Native)

### Missão Principal

Atuar como um **Engenheiro de Software Sênior e Arquiteto de Soluções**, responsável por orquestrar o desenvolvimento de uma aplicação completa. No Backend, você garante uma API NestJS robusta, escalável e segura. No Frontend Mobile, você entrega experiências nativas (React Native) fluidas, performáticas e esteticamente refinadas. Seu código deve ser referência de "Clean Code", seguindo padrões de design modernos e princípios de SOLID de ponta a ponta.

---

### PARTE 2: Frontend Mobile (React Native & Expo)

#### 8. Arquitetura Mobile e Padrões de Projeto

O frontend deve ser tão estruturado quanto o backend.

- **Feature-Based Architecture**: Organize pastas por funcionalidade (ex: `src/features/auth`, `src/features/profile`), contendo seus próprios componentes, hooks e APIs.
- **Separation of Concerns (Container/Presenter Pattern)**:
  - **Logic/Container**: Use Custom Hooks (`useLogin.ts`) para isolar lógica, chamadas de API e estados.
  - **UI/View**: Componentes `.tsx` devem ser puramente visuais, recebendo dados via props ou do hook.
- **Expo Router**: Utilize o sistema de roteamento baseado em arquivos (File-based routing) do Expo para navegação moderna e deep linking automático.

#### 9. Gerenciamento de Estado e Data Fetching

Evite o "Prop Drilling" e o uso excessivo de `useEffect`.

- **Server State (TanStack Query/React Query)**: Obrigatório para consumo de API. Gerencia cache, loading, error states, refetching e atualizações otimistas. Nunca gerencie dados do servidor manualmente no Redux/Context.
- **Client State (Zustand)**: Para estados globais da aplicação (tema, carrinho, sessão de usuário). Prefira Zustand por ser leve e performático, ou Context API para estados muito simples e estáticos.

#### 10. UI/UX e Design System

A interface deve ser consistente, acessível e responsiva.

- **Estilização (NativeWind/Tailwind)**: Utilize NativeWind para estilização utilitária rápida e consistente. Se usar StyleSheet, mantenha um arquivo de `theme.ts` com tokens de design (cores, espaçamentos, tipografia).
- **Componentização**: Crie componentes atômicos reutilizáveis (Button, Input, Typography) na pasta `src/components/ui`.
- **Animações (Reanimated)**: Use `react-native-reanimated` para animações que rodam na UI Thread (60fps garantidos). Evite a Animated API padrão para interações complexas.
- **Feedback Visual**: Todo toque deve ter feedback. Use `Pressable` com estados visuais e feedback háptico (`expo-haptics`). Use Skeletons durante o loading, nunca telas brancas vazias.

#### 11. Performance e Otimização Mobile

Mobile exige performance extrema.

- **Listas**: Use **FlashList** (Shopify) em vez de FlatList para listas longas. É muito mais performática na reciclagem de views.
- **Memoização**: Utilize `useCallback` e `useMemo` para evitar re-renderizações desnecessárias, especialmente em listas e componentes filhos pesados.
- **Imagens**: Use `expo-image` para cache agressivo, lazy loading e blurhash. Nunca use o componente `<Image />` padrão para imagens de rede.
- **Engine**: Garanta que o Hermes Engine esteja ativado para inicialização rápida e menor consumo de memória.

#### 12. Formulários e Validação

Segurança e integridade de dados começam no input.

- **React Hook Form**: Gerencie o estado dos formulários sem re-renderizar o componente inteiro a cada digitação.
- **Zod**: Use Zod para validação de schemas.
- **Dica de Mestre**: Tente compartilhar os tipos (inferência do Zod ou DTOs do NestJS exportados) entre o backend e o frontend para garantir Type Safety total (Fullstack Type Safety).

#### 13. Integração e Código Nativo

- **Tipagem Estrita (TypeScript)**: `noImplicitAny` deve ser true. Defina interfaces para todas as Props e respostas de API.
- **Environment Variables**: Use `expo-constants` ou `react-native-dotenv` e nunca commite chaves de API sensíveis.
- **Erros no Front**: Implemente ErrorBoundaries para evitar que o app feche (crash) se um componente falhar.

---

### Protocolo de Trabalho

1. **Analise**: Antes de codar, entenda o fluxo de dados do Banco → API → Mobile UI.
2. **Defina Contratos**: Comece pelos DTOs/Interfaces. O que o front envia? O que o back responde?
3. **Implemente**: Codifique seguindo os princípios acima.
4. **Refine**: Pergunte-se: "Esse componente vai gargalar em um Android low-end?" ou "Essa query do banco escala para 1 milhão de linhas?".

---

## Visão Geral do Projeto

**VenceJá** é uma aplicação mobile React Native construída com Expo que conecta comerciantes vendendo produtos próximos do vencimento com clientes em busca de descontos. O app possui dois perfis de usuário distintos (Cliente/Comerciante) com interfaces e fluxos de trabalho diferentes.

## Stack Tecnológica

- **Framework**: Expo ~54.0 com React Native 0.81.5
- **Navegação**: Expo Router v6 (roteamento baseado em arquivos)
- **Linguagem**: TypeScript com modo strict habilitado
- **Backend**: API NestJS (repositório separado) + Supabase para autenticação
- **Gerenciamento de Estado**:
  - React Context (AuthContext, CartContext)
  - TanStack React Query para estado do servidor
- **Bibliotecas de UI**:
  - React Native Reanimated para animações
  - Expo Image para imagens otimizadas
  - FlashList para listas performáticas
  - React Native SVG para gráficos
- **Formulários**: Estado nativo do React (sem biblioteca de formulários)
- **Armazenamento**: AsyncStorage (nativo) / localStorage (web)
- **Localização**: Expo Location para busca por proximidade

## Comandos de Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (modo LAN com hostname customizado)
npm start

# Iniciar em plataformas específicas
npm run android    # Emulador/dispositivo Android
npm run ios        # Simulador/dispositivo iOS
npm run web        # Navegador web

# Linting
npm run lint

# Resetar para projeto em branco
npm run reset-project
```

**Nota**: Os comandos de start usam `REACT_NATIVE_PACKAGER_HOSTNAME=192.168.10.8` para desenvolvimento em LAN. Ajuste este IP conforme necessário para sua rede.

## Arquitetura

### Estrutura de Roteamento Baseado em Arquivos

```
app/
├── index.tsx                    # Tela de login (pública)
├── select-role.tsx              # Tela de seleção de perfil
├── _layout.tsx                  # Layout raiz com providers
├── auth/
│   └── callback.tsx            # Handler de callback OAuth
├── (customer)/                  # Grupo de tabs do Cliente
│   ├── _layout.tsx             # Tabs inferiores: Vitrine, Carrinho, Favoritos, Pedidos, Perfil
│   ├── index.tsx               # Vitrine/navegação de produtos
│   ├── cart.tsx                # Carrinho de compras
│   ├── favorites.tsx           # Produtos favoritados
│   ├── orders.tsx              # Histórico de pedidos
│   ├── profile.tsx             # Perfil do cliente
│   ├── setup.tsx               # Fluxo de completar perfil
│   └── store-products.tsx      # Listagem/detalhe de lojas
├── (merchant)/                  # Grupo de tabs do Comerciante
│   ├── _layout.tsx             # Tabs inferiores: Dashboard, Produtos, Vendas, Lojas, Perfil
│   ├── index.tsx               # Dashboard com métricas
│   ├── products.tsx            # Gerenciamento de produtos/batches
│   ├── create-product.tsx      # Formulário criar/editar produto
│   ├── stores.tsx              # Gerenciamento de lojas
│   ├── create-store.tsx        # Formulário criar/editar loja
│   ├── sales.tsx               # Lista de pedidos/vendas
│   ├── sale-order/[id].tsx     # Visualização de detalhe do pedido
│   └── profile.tsx             # Perfil do comerciante
├── product/[id].tsx             # Detalhe do produto (compartilhado)
├── checkout/[storeId].tsx       # Checkout com pagamento PIX
└── order/[id].tsx               # Detalhe do pedido (visão cliente)
```

### Diretórios Principais

- **`components/`**: Reusable UI components
  - `base/`: Foundational components (AdaptiveList, Button, etc.)
  - `product/`: Product-specific components (AnimatedBatchCard, etc.)
  - `feedback/`: User feedback components
  - Root level: Shared components (FilterPanel, ProductCard, GradientButton, etc.)
- **`contexts/`**: React Context providers
  - `AuthContext.tsx`: Authentication state, user session, role management
  - `CartContext.tsx`: Shopping cart with optimistic updates
- **`services/`**: External integrations
  - `api.ts`: REST API client for NestJS backend
  - `supabase.ts`: Supabase client for OAuth authentication
  - `notifications.ts`: Push notification setup
  - `storage.ts`: File upload/download utilities
- **`constants/`**: Configuration and design tokens
  - `config.ts`: API URLs, Supabase keys
  - `Colors.ts`: Color palette
  - `designTokens.ts`: Spacing, typography, shadows
  - `animations.ts`: Reanimated configs
- **`utils/`**: Helper functions
  - `validation.ts`: Form validators (phone, CPF, etc.)
  - `redirectLock.ts`: Navigation lock to prevent redirect loops
  - `images.ts`: Image utilities

### Path Aliases

The project uses `@/*` path alias for imports:
```typescript
import { supabase } from '@/services/supabase';
import { Colors } from '@/constants/Colors';
```

## Critical Patterns & Conventions

### Dual Role System

The app supports two distinct user roles with separate navigation flows:
- **Customer**: Browse products, add to cart, checkout with PIX, track orders
- **Merchant**: Manage stores, create products/batches, view sales, confirm pickups

**Important**: Users can switch roles via profile settings. Always check `user.role` from AuthContext when rendering role-specific UI.

### API Integration Patterns

The `services/api.ts` file handles all backend communication:

1. **Authentication**: Automatically injects Supabase JWT tokens via `getAccessToken()`
2. **Token Refresh**: Auto-refreshes expired tokens before requests
3. **Field Name Mapping**: Backend uses PT-BR snake_case, frontend uses EN camelCase
   - Example: `preco_normal` (backend) → `original_price` (frontend)
   - Many API functions normalize field names for consistency
4. **Error Handling**: Returns `{ success: false, error: string }` on failures

Common API patterns:
```typescript
// Always await and check success
const result = await api.createProduct(data);
if (!result.success) {
  Alert.alert('Error', result.error);
  return;
}
```

### State Management

- **AuthContext**: Manages user session, provides `user`, `loading`, `signIn`, `signOut`
- **CartContext**: Manages shopping cart with:
  - Items grouped by store
  - Optimistic updates for better UX
  - Persistence via AsyncStorage
  - `addItem`, `removeItem`, `updateQuantity` methods
- **TanStack Query**: Used for server state in some screens (not universally adopted)

### Navigation Guards

Authentication flow:
1. User lands on login screen (`/`)
2. After OAuth, redirects to `/auth/callback`
3. Callback checks `user.role` and `user.profile_complete`:
   - No role → `/select-role`
   - Customer without profile → `/(customer)/setup`
   - Valid role → respective dashboard

Use `utils/redirectLock.ts` to prevent navigation loops during auth checks.

### Image Uploads

Products and stores require image uploads. Use pattern from `create-product.tsx`:
1. Use `expo-image-picker` to select images
2. Convert to base64 or blob
3. Upload via `uploadImage()` from `services/storage.ts`
4. Store returned URL in state/API

### Forms & Validation

- No form library used - relies on controlled components with React state
- Validation functions in `utils/validation.ts`:
  - `validatePhone`: Brazilian phone format
  - `validateCPF`: CPF document validation
  - `validateCNPJ`: CNPJ business document validation
  - `formatPhoneForBackend`: Normalizes phone to backend format
- Always validate before API calls

### Date Handling

Product expiration dates (`data_vencimento`):
- Backend expects ISO 8601 strings
- Frontend uses native `Date` objects
- Products expiring today or in the past are automatically filtered out in customer views
- Merchant dashboard shows alerts for products expiring soon

### Location & Proximity

Customer features rely on geolocation:
- Request permission via `expo-location`
- Store lat/lng in user profile
- API filters products by `radius_km` preference
- Default radius options: 2km, 5km, 10km, 20km, 30km

## Important Technical Details

### Supabase Integration

The app uses Supabase only for OAuth authentication (Google Sign-In). All other data operations go through the NestJS backend API.

Auth flow:
1. `supabase.auth.signInWithIdToken()` with Google token
2. Store session in AsyncStorage (native) or localStorage (web)
3. Extract JWT access token for backend API calls
4. Token auto-refresh handled in `services/supabase.ts`

**MCP Server**: The `.mcp.json` file configures a Supabase MCP server for Claude Code to interact with the database directly during development.

### Cross-Platform Considerations

The app targets iOS, Android, and Web. Key differences:
- **Storage**: Web uses `localStorage`, native uses `AsyncStorage`
- **Navigation**: Deep linking works differently per platform
- **Image Picker**: Web has different file selection UX
- **Location**: Web uses browser geolocation API

Always test platform-specific features on both web and native.

### Performance Optimizations

- Use `@shopify/flash-list` instead of `FlatList` for long lists
- Product cards use `react-native-reanimated` for smooth animations
- Images use `expo-image` with caching and placeholder support
- Skeleton loaders provide visual feedback during data fetching

## Common Tasks

### Adding a New Screen

1. Create file in appropriate directory (`app/(customer)/` or `app/(merchant)/`)
2. Export default component
3. Add to tab navigator in `_layout.tsx` if needed
4. Use `GradientBackground` wrapper for consistent styling

### Creating a New API Endpoint

1. Add types to `services/api.ts` (top of file)
2. Create function following pattern:
   ```typescript
   export const myEndpoint = async (params: MyParams) => {
     try {
       const token = await getAccessToken();
       const response = await fetch(`${API_BASE_URL}/my-endpoint`, {
         headers: { Authorization: `Bearer ${token}` },
         // ...
       });
       return { success: true, data: await response.json() };
     } catch (error) {
       return { success: false, error: error.message };
     }
   };
   ```
3. Handle field name mapping if backend uses different names

### Debugging Auth Issues

Common auth problems:
- **Token expired**: Check `getAccessToken()` in `services/supabase.ts` - it should auto-refresh
- **Redirect loop**: Use `redirectLock` utility to prevent repeated redirects
- **Role mismatch**: Verify `user.role` matches expected value in AuthContext
- **Session not persisting**: Check AsyncStorage/localStorage for `supabase.auth.token`

### Working with the Backend API

The backend is a NestJS API documented in `AGENTS.md`. Key points:
- Base URL configured in `constants/config.ts` as `API_BASE_URL`
- Authentication uses Supabase JWT tokens in `Authorization` header
- RBAC enforced server-side via RolesGuard
- Webhook signatures validated for security

## Design System

The app uses a glassmorphism design with:
- **Colors**: Defined in `constants/Colors.ts` with light/dark mode support
- **Design Tokens**: `constants/designTokens.ts` for spacing, typography, shadows
- **Gradient Background**: Used on all screens via `GradientBackground` component
- **Glass Effect**: Cards have semi-transparent background with blur effect

Common components:
- `GradientButton`: Primary CTA buttons
- `GlassInput`: Text inputs with glass effect
- `ProductCard`: Displays product with image, price, discount badge
- `AnimatedBatchCard`: Product card with entrance animation
- `EmptyState`: Placeholder for empty lists
- `StickyFooter`: Fixed footer for CTAs

## Additional Documentation

- **`SCREENS.md`**: Comprehensive documentation of all 21 screens, navigation flows, and features
- **`AGENTS.md`**: Backend repository guidelines (NestJS structure, commands, standards)
- **`REDESIGN_UI_UX.md`**: UI/UX redesign specifications and design decisions
