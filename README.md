# Siesta MVP

E-commerce fullstack para Siesta construido con:

- Next.js (App Router + TypeScript)
- PostgreSQL + Prisma
- Mercado Pago Checkout Pro (redirect)
- Admin con sesión por cookie firmada

## Requisitos

- Node.js 20+
- PostgreSQL (Neon u otro)
- Credenciales de Mercado Pago

## Variables de entorno

Copiar `.env.example` a `.env` y completar:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `APP_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `MP_PUBLIC_KEY`
- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_SECRET`
- `MP_WEBHOOK_POLICY` (`compat` recomendado, `strict` opcional)

Notas importantes de entorno:

- `APP_URL` debe ser una URL pública `https` para Mercado Pago (Vercel, ngrok, etc.).
- `MP_WEBHOOK_SECRET` debe salir de la misma integración/app de Mercado Pago que emite tu `MP_ACCESS_TOKEN`.

## Arranque local

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

## Flujo de migraciones recomendado (Neon)

Para mantener historial prolijo en base remota:

1. Generar migraciones nuevas en un entorno local de desarrollo:

```bash
npx prisma migrate dev --name <nombre_migracion>
```

2. Commit de carpeta `prisma/migrations`.

3. Aplicar en Neon (staging/prod) solo con:

```bash
npx prisma migrate deploy
```

4. Verificar estado:

```bash
npx prisma migrate status
```

### Scripts útiles

- `npm run prisma:migrate` -> `prisma migrate deploy`
- `npm run prisma:migrate:status`
- `npm run prisma:migrate:deploy`
- `npm run prisma:migrate:dev`
- `npm run prisma:migrate:resolve`

### Fallback si `migrate deploy` falla en remoto

1. Ejecutar SQL de la migración manualmente en Neon SQL Editor.
2. Marcarla aplicada:

```bash
npx prisma migrate resolve --applied <migration_folder_name>
```

## Endpoints API

### Público

- `GET /api/products`
- `GET /api/products/:slug`
- `POST /api/checkout/create-preference`
- `POST /api/webhooks/mercadopago`
- `GET /api/orders/:publicCode`

### Admin

- `POST /api/admin/auth/login`
- `POST /api/admin/auth/logout`
- `GET /api/admin/products`
- `POST /api/admin/products`
- `PATCH /api/admin/products/:id`
- `DELETE /api/admin/products/:id`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:id/status`

## Pantallas

- `/` catálogo
- `/products/[slug]` detalle
- `/cart` carrito
- `/checkout` checkout
- `/checkout/success`
- `/checkout/failure`
- `/admin/login`
- `/admin/products`
- `/admin/orders`

## Notas operativas

- Los importes están en centavos en DB (`priceArs`, `totalAmount`).
- El carrito vive en `localStorage`.
- El stock se descuenta al webhook de pago aprobado.
- Al cancelar un pedido desde admin, se repone stock una sola vez usando `inventory_movements`.
- El webhook de Mercado Pago soporta modo `compat` para aceptar callbacks legacy sin firma (`topic/id`) y deduplica eventos por `payment_events.external_event_id`.
- Si llega un duplicado y el evento previo quedó en `ERROR` o `IGNORED`, se reprocesa; si estaba `PROCESSED`, se ignora como duplicado real.
