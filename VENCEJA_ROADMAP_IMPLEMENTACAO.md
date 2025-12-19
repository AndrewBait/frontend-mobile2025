# VenceJá — Roadmap de Robustez (Mobile + Backend + Supabase)

Este documento acompanha a execução das correções solicitadas (instabilidade visual, validações, tratamento de erros e robustez operacional).

## Status Geral

- [x] Backend: validação/sanitização e erros consistentes
- [ ] Supabase: Storage policies seguras *(buckets ok; policies atuais estão permissivas e precisam ajuste)*
- [x] Operação: liberação automática de estoque (pagamento expirado/cancelado)
- [x] Mobile: vitrine com fallback de raio + loading suave (sem “sumir produtos”)
- [x] Mobile: centralização de erros + substituição de Alerts por Toasts
- [x] Mobile: supressão de erro “Invalid Refresh Token” no boot
- [x] Mobile: remover “timeouts falsos” em logs (orders/dashboard)

---

## 1) Backend (NestJS) — Contratos, Sanitização e Erros

- [x] (DTO) `telefone`: aceitar dígitos (10–11) e normalizar input
- [x] (DTO) `foto_url`: permitir atualização via `PUT /me/profile`
- [x] (DTOs) `@Transform(trim)` em strings de entrada (stores/products/batches/carts/etc)
- [x] (Global) Exception Filter padronizado (`HttpExceptionFilter`)
- [x] (Global) Mensagens legíveis para class-validator
- [x] (Global) Mensagens amigáveis para “unique constraint” (`23505`/`P2002`)

---

## 2) Supabase — Storage + Schema Operacional

- [x] (Storage) Buckets `product-images` e `perfil-store` existem no projeto (public)
- [ ] (Storage) Corrigir policies do `storage.objects` (hoje estão **públicas para INSERT/UPDATE/DELETE**)
  - Alvo: leitura pública, escrita apenas `authenticated` e apenas no próprio `owner`
  - SQL preparado em `backend/backend-venceja2025/supabase/migrations/20251218004000_create_storage_buckets_and_policies.sql`
- [x] (Orders) Status `expired` + índice de expiração aplicado no projeto (via Management API query)

---

## 3) Operação — Estoque Preso (Critical Fix)

- [x] (Backend) Serviço de “stock cleanup” (cron) para pedidos `pending_payment` expirados
- [x] (Backend) Regras idempotentes para liberar `estoque_reservado` via RPC/UPDATE
- [x] (Backend) Webhook Asaas: tratar `OVERDUE/DELETED` como expiração/cancelamento

---

## 4) Mobile — “Produtos que somem” + UX de Loading

- [x] Fallback automático de raio quando `lat/lng` ativo e retorno vazio
- [x] EmptyState contextual com ação “Ver ofertas de outras regiões”
- [x] Loading suave: manter resultados antigos visíveis enquanto recarrega

---

## 5) Mobile — Tratamento de Erros e Toasts

- [x] `services/api.ts`: extrair `message`/detalhes do backend (400/401/403/500)
- [x] Hook `useErrorHandler` (Toast vs Modal)
- [x] Substituir `Alert.alert('Erro', ...)` por Toast nas telas-alvo (setup/create-product/vitrine)

---

## 6) Verificação Final

- [ ] Revisar fluxos: login → role → setup → vitrine → carrinho → checkout PIX
- [ ] Revisar fluxos lojista: create-store → products/batches → sales/pickup
- [x] Confirmar que não há “Error: [object Object]” no UI *(ApiClient agora normaliza mensagens)*
