# Next.js 16 App Router — Reference
> **Revisione doc:** 2026-10

> Contiene il layout a feature, il codice di Server Component, Route Handler, Cache Components e proxy.ts, e i passi per l'upgrade da Next.js 15.

## Layout a feature

```text
app/
  (dashboard)/
    users/
      page.tsx
      loading.tsx
      error.tsx
  api/
    users/route.ts
```

## Server Component + data fetch

```typescript
export default async function UsersPage() {
  const response = await fetch(`${process.env.API_BASE_URL}/api/v1/users`, { cache: 'no-store' });
  const users = (await response.json()) as { id: string; fullName: string }[];

  return (
    <main>
      <h1>Users</h1>
      <ul>{users.map((u) => <li key={u.id}>{u.fullName}</li>)}</ul>
    </main>
  );
}
```

## Route Handler

```typescript
export async function GET() {
  return Response.json({ status: 'ok' }, { status: 200 });
}
```

## Cache Components (opt-in)

```typescript
// next.config.ts
const nextConfig: NextConfig = { cacheComponents: true }

// app/users/page.tsx
import { cacheLife, cacheTag } from 'next/cache'

async function getUsers() {
  'use cache'
  cacheLife('minutes')
  cacheTag('users')
  return (await fetch(`${process.env.API_BASE_URL}/api/v1/users`)).json()
}
```

Abilitare `cacheComponents` non è un semplice rename: i dati non in cache fuori da `<Suspense>` fanno fallire la build. Sostituisce `experimental.ppr`, `dynamicIO` e `useCache`. Guida: *Migrating to Cache Components*.

## proxy.ts

```typescript
import { NextResponse, type NextRequest } from 'next/server'

export function proxy(req: NextRequest) {
  if (!req.cookies.get('auth-token')) return NextResponse.redirect(new URL('/login', req.url))
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*'] }
```

## Upgrade da Next.js 15

1. `npx @next/codemod@canary upgrade latest` (turbopack config, `next lint` → ESLint CLI, middleware → proxy, via `unstable_`); poi `npx @next/codemod@canary next-async-request-api .` se resta accesso sincrono a `params`/`cookies()`.
2. Build con webpack custom: ora fallisce — `--turbopack` (ignora la config), migra alla config Turbopack o `--webpack`.
3. `revalidateTag('x')` → `revalidateTag('x', 'max')` o `updateTag('x')` nelle Server Actions.
4. Ogni slot `@slot` delle route parallele ha bisogno di `default.js`.
5. Immagini: `minimumCacheTTL` 4 h, `qualities` solo `[75]`, query string locali richiedono `images.localPatterns`, `images.domains` deprecato → `remotePatterns`.
6. Per un agente: `npx @next/codemod@canary agents-md` scrive in `AGENTS.md` il puntatore alla documentazione versionata (da 16.2 in `node_modules/next/dist/docs/`).

## Vedi anche
- Snippets: `.claude/consoleclaude/snippets/nextjs-patterns.md`
- Auth patterns: `.claude/consoleclaude/stacks/auth-patterns.md` (se presente)
