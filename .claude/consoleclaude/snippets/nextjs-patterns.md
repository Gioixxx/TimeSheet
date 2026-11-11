# Template Next.js 16 App Router

> **Compressione:** esempi → signature; le catene con → sono pseudo-codice da espandere. Esempi completi solo per alcune sezioni, in `.claude/consoleclaude/stacks/nextjs-reference.md`.

## Server Action — Mutation

```typescript
'use server'
const CreateUserSchema = z.object({ name: z.string().min(2), email: z.string().email() })
type ActionState = { error?: string; success?: boolean }

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState>
  → parsed = schema.safeParse({ name: formData.get('name'), email: formData.get('email') })
  → if !parsed.success: return { error: parsed.error.issues[0].message }
  → await db.user.create({ data: parsed.data })
  → updateTag('users')   // read-your-writes; in alternativa revalidatePath('/users')
  → redirect('/users')

// Client form: useActionState(createUser, {}) → form action={action} + state.error display
```

Quando: form mutations con validazione server-side.
- Zod per validazione (`error.issues`; in Zod 4 `z.email()` al posto di `z.string().email()`), `updateTag`/`revalidatePath` dopo mutation

## Route Handler (API)

```typescript
// app/api/users/route.ts
GET(req) → NextResponse.json({ data: users })
  → page = searchParams.get('page') ?? 1
  → db.user.findMany({ skip: (page-1)*20, take: 20, orderBy: { createdAt: 'desc' } })

POST(req) → parsed = schema.safeParse(await req.json())
  → if !parsed.success: 422, { error: flatten() }
  → user = db.user.create({ data: parsed.data }) → 201

// app/api/users/[id]/route.ts
type Params = { params: Promise<{ id: string }> }
GET(_req, { params }) → { id } = await params
  → user = db.user.findUnique({ where: { id } }) → 404 if null
  → return user
```

Quando: API REST per client esterni o custom hooks.
- `params` e `searchParams` sono Promise: l'accesso sincrono è rimosso in Next.js 16

## Data Fetching — Server Component

```typescript
async function getUsers(page: number)
  'use cache'                      // con cacheComponents: true; cache opt-in
  cacheLife('minutes'); cacheTag('users')
  → res = await fetch(API_URL)
  → if !res.ok: throw Error
  → return res.json()
  // senza cacheComponents: fetch(API_URL, { next: { revalidate: 60 } })  // ISR

export default async function UsersPage(props: PageProps<'/users'>)   // helper di `npx next typegen`
  → { page } = await props.searchParams
  → data = await getUsers(Number(page ?? '1'))
  → return <Suspense fallback={<p>Caricamento...</p>}><UserList users={data.users} /></Suspense>
```

Quando: pagine che fetchano dati lato server.
- `Suspense` obbligatorio attorno a fetch async
- `'use cache'` + `cacheLife`/`cacheTag` (Cache Components) oppure `next: { revalidate: N }` per ISR

## Proxy Auth (ex Middleware)

```typescript
// proxy.ts — runtime Node (l'edge non è supportato: per l'edge resta `middleware.ts`, deprecato)
export function proxy(req: NextRequest)
  → isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  → token = req.cookies.get('auth-token')?.value
  → if !isPublic && !token: redirect to /login?from=pathname
  → return NextResponse.next()

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
```

Quando: protezione route, redirect auth.
- Solo auth/redirect — niente business logic
- Migrazione: `npx @next/codemod@canary upgrade latest` rinomina file e funzione

## Custom Hook — SWR

```typescript
'use client'
const fetcher = (url: string) => fetch(url).then(r => r.json())
export function useUsers(page: number)
  → { data, error, isLoading, mutate } = useSWR(`/api/users?page=${page}`, fetcher)
  → return { users: data?.users ?? [], total: data?.total ?? 0, isLoading, isError, refresh: mutate }
```

Quando: data fetching client-side con cache.

## Error Boundary

```typescript
'use client'
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void })
  → useEffect(() => console.error(error), [error])
  → <div><h2>Qualcosa è andato storto</h2><button onClick={reset}>Riprova</button></div>
```

Quando: gestione errori per route segment.
- `error.tsx` obbligatorio per route con fetch

## Metadata

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata>
  → { id } = await params
  → user = await getUser(id)
  → return { title: user?.name ?? 'Non trovato', description: `Profilo di ${user?.name}` }
```

## Regole generali

- Server Actions per mutations — mai fetch POST da client verso `/api`
- Route Handlers per API pubbliche/terze parti
- `revalidatePath` dopo mutation che cambia dati listati
- `Suspense` attorno a ogni fetch asincrono
- `proxy.ts` solo per auth/redirect
- `error.tsx` per ogni route segment con fetch
- `searchParams` e `params` sono Promise; `revalidateTag` vuole il profilo (`'max'`)
