import { randomBytes } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'ts_session'
// 400 giorni: limite massimo imposto dai browser (es. Chrome) per Max-Age/Expires dei cookie.
// È il modo più vicino a "nessuna scadenza" ottenibile senza rinnovo lato client.
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60

export function isAuthEnabled(): boolean {
  return process.env.AUTH_ENABLED === 'true'
}

let cachedSecret: string | null = null

function getAuthSecret(): string {
  if (cachedSecret) return cachedSecret
  if (process.env.AUTH_SECRET) {
    cachedSecret = process.env.AUTH_SECRET
    return cachedSecret
  }

  const dir = existsSync('/data') ? '/data' : process.cwd()
  const file = path.join(dir, '.auth-secret')

  if (existsSync(file)) {
    cachedSecret = readFileSync(file, 'utf8').trim()
    return cachedSecret
  }

  const secret = randomBytes(32).toString('hex')
  mkdirSync(dir, { recursive: true })
  writeFileSync(file, secret, { mode: 0o600 })
  cachedSecret = secret
  return secret
}

function getEncodedSecret(): Uint8Array {
  return new TextEncoder().encode(getAuthSecret())
}

type SessionPayload = { uid: string }

async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getEncodedSecret())
}

async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getEncodedSecret(), { algorithms: ['HS256'] })
    if (typeof payload.uid !== 'string') return null
    return { uid: payload.uid }
  } catch {
    return null
  }
}

export async function createSession(userId: string): Promise<void> {
  const token = await encrypt({ uid: userId })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  })
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return decrypt(token)
}

export async function verifyCookieToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null
  return decrypt(token)
}
