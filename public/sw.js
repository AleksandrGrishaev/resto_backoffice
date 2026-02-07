// Service Worker for Kitchen POS PWA
// Minimal SW: caches app shell, handles SPA navigation, network-first for API

const CACHE_NAME = 'kitchen-pos-v1'

// App shell files to precache on install
const APP_SHELL = ['/', '/pos', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']

// Install: precache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL)
    })
  )
  // Activate immediately without waiting for old SW to finish
  self.skipWaiting()
})

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    })
  )
  // Take control of all pages immediately
  self.clients.claim()
})

// Fetch: network-first with cache fallback
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip Supabase API / external requests — always network
  if (url.origin !== self.location.origin) return

  // Skip chrome-extension and other non-http schemes
  if (!url.protocol.startsWith('http')) return

  // Navigation requests (SPA): network-first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the latest index.html
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put('/', clone))
          return response
        })
        .catch(() => {
          // Offline: serve cached index.html (SPA will handle routing)
          return caches.match('/').then(cached => {
            return cached || new Response('Offline', { status: 503 })
          })
        })
    )
    return
  }

  // Static assets (JS, CSS, images): stale-while-revalidate
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/sounds/')
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request)
          .then(response => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
            }
            return response
          })
          .catch(() => cached)

        return cached || fetchPromise
      })
    )
    return
  }

  // Everything else: network-first
  event.respondWith(fetch(request).catch(() => caches.match(request)))
})
