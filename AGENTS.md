# Codex Instructions for Siesta

## Project shape
- Stack: `Next.js 14 App Router` + `TypeScript` + `Prisma` + `PostgreSQL` + `Mercado Pago`.
- Public store pages live in `src/app/`.
- API route handlers live in `src/app/api/`.
- Shared UI lives in `src/components/`.
- Prisma schema and migrations live in `prisma/`.
- Human-facing setup and operations live in `README.md`.

## Official Codex surfaces for this repo
- Repo-local Codex instructions live only in this `AGENTS.md`.
- Global Codex config and MCP live outside the repo in `~/.codex/config.toml`.
- Global Codex skills live outside the repo in `~/.codex/skills/`.
- Do not create repo-local folders such as `.codex/commands`, `.codex/tools`, `.codex/settings`, or `.codex/mcp`.
- If the project needs normal scripts, keep them in the existing `scripts/` folder as standard repo scripts, not as a Codex-specific feature.

## Business and product constraints
- Store name and visible brand are currently `Sine`.
- Currency is `ARS`.
- Fulfillment for v1 is `solo retiro`.
- Checkout is guest-only; there is no customer account system.
- Admin manages products, categories, collections, orders, reports, and account settings.
- Product statuses are only `ACTIVE` and `ARCHIVED`.
- Order flow is `PENDING_PAYMENT -> PAID -> READY_FOR_PICKUP -> COMPLETED`, with `CANCELLED` and `PAYMENT_FAILED` as exception states.

## Important paths
- `src/app/page.tsx`: home/catalog entry.
- `src/app/products/[slug]/page.tsx`: product detail.
- `src/app/cart/page.tsx`: cart page.
- `src/app/checkout/page.tsx`: checkout page.
- `src/app/admin/page.tsx`: admin shell.
- `src/app/api/checkout/create-preference/route.ts`: Mercado Pago preference creation.
- `src/app/api/webhooks/mercadopago/route.ts`: Mercado Pago webhook.
- `src/app/api/admin/*`: admin APIs.
- `prisma/schema.prisma`: DB schema.

## Working rules
- Prefer minimal, direct changes that preserve the existing product flow and design language.
- Keep public documentation in `README.md`; keep Codex-specific repo instructions here.
- Do not store secrets, personal tokens, or local machine config in the repo.
- Treat `~/.codex/config.toml` and `~/.codex/skills/` as local/global environment, not repo state.
- When changing checkout, orders, stock, or webhook logic, preserve idempotency and stock integrity.
- When changing UI, verify the main flows: home, product detail, cart, checkout, admin login.

## Validation
- Main app commands:
  - `npm run dev`
  - `npm run build`
  - `npm run prisma:generate`
  - `npm run prisma:migrate:status`
  - `npm run prisma:seed`
- Prefer targeted checks after edits. For UI changes, validate the affected pages in browser.
- If a check cannot be run, state that explicitly.
