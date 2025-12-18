# Repository Guidelines (Backend)

## Project Structure

- `src/`: NestJS modules (feature-based), controllers, services, guards.
- `supabase/migrations/`: SQL migrations (schema da aplicação).
- `dist/`: build output (não editar manualmente).

## Development Commands

- `npm run start:dev`: Start Nest with watch.
- `npm run build`: Compile TypeScript to `dist/`.
- `npm run lint`: ESLint.

## Engineering Standards

- SRP/Modularidade: modules por feature; controllers magros; regras no service.
- DTOs: `class-validator` + `class-transformer` (input/output separados quando fizer sentido).
- Segurança: Auth via Supabase JWT, RBAC via RolesGuard, validar webhooks por assinatura.
- Performance: evitar N+1 no Supabase (`select` com joins cirúrgicos), índices em colunas críticas.

## Security Notes

- Nunca commitar chaves sensíveis (service role, Asaas API key, secrets).
- Preferir `.env.local` (gitignored) e rotação de chaves quando houver exposição acidental.

