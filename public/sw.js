// Service Worker for Kitchen POS PWA
// Version is bumped automatically — cache name includes build timestamp
// On deploy, Vite hashes all /assets/ files, so the real update mechanism is:
//   1. SW update check finds new sw.js → installs → activates (skipWaiting)
//   2. Old caches are purged on activate
//   3. Fresh navigation fetches get the new index.html with new asset hashes

const CACHE_VERSION = 'v2'
const CACHE_NAME = `kitchen-pos-${CACHE_VERSION}`

// App shell files to precache on install
const APP_SHELL = ['/', '/pos', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']

// Install: precache app shell
self.addEventListener('install', event => {
  console.log('[SW] Installing', CACHE_NAME)
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL)
    })
  )
  // Activate immediately without waiting for old SW to finish
  self.skipWaiting()
})

// Activate: clean up ALL old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating', CACHE_NAME)
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key)
            return caches.delete(key)
          })
      )
    })
  )
  // Take control of all pages immediately
  self.clients.claim()
})

// Listen for skip waiting message from the app
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
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

  // Vite hashed assets (/assets/index-abc123.js): cache-first (hash = immutable)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Icons, sounds: stale-while-revalidate
  if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/sounds/')) {
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
