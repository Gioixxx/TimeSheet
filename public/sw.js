// Cache del solo guscio statico. Le pagine HTML e le risposte delle API non vengono mai
// memorizzate: contengono i dati dell'utente e resterebbero leggibili dopo il logout, anche
// a tempo indefinito nel profilo del browser. L'istanza esposta su CasaOS viaggia in chiaro,
// quindi ogni copia locale in meno conta.
const CACHE_NAME = 'timesheet-v3'

// Solo asset statici e sempre pubblici: nessuno di questi passa dal controllo di sessione.
const SHELL_ASSETS = ['/manifest.json', '/icon.svg']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // Best-effort: un asset mancante non deve far fallire l'installazione del SW
      // (era il caso di '/', che con AUTH_ENABLED risponde 307 verso /login).
      .then((cache) => Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url))))
      .catch(() => {}),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

/** Solo gli asset immutabili sono cacheabili: mai documenti di navigazione, mai /api/*. */
function isCacheable(request) {
  if (request.method !== 'GET') return false
  // Un documento è una pagina renderizzata con i dati dell'utente
  if (request.mode === 'navigate' || request.destination === 'document') return false

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return false
  if (url.pathname.startsWith('/api/')) return false

  // Build asset di Next (hash nel nome) e icone/manifest
  return (
    url.pathname.startsWith('/_next/static/') ||
    SHELL_ASSETS.includes(url.pathname) ||
    /\.(?:css|js|woff2?|png|svg|ico)$/.test(url.pathname)
  )
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  if (!isCacheable(event.request)) {
    // Passa alla rete senza toccare la cache, in nessuna delle due direzioni.
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && !response.redirected) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request)),
  )
})

// Il logout chiede di svuotare tutto ciò che è stato memorizzato in questo browser.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'clear-cache') return
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const scope = self.registration.scope
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(scope) && 'focus' in client) {
            return client.focus()
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(scope)
        }
      }),
  )
})
