// Receptor de avisos; no guarda páginas ni datos de jugadores en caché.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', event => {
  let payload = {}
  try { payload = event.data?.json() || {} } catch { /* Mostrar aviso genérico. */ }
  event.waitUntil(self.registration.showNotification(payload.title || 'Torneos Aldebaran', {
    body: payload.body || 'Tienes una actualización de tu torneo.',
    icon: '/icons/icon-192.png?v=3',
    tag: payload.tag || 'aldebaran',
    data: { url: '/dashboard/torneo' },
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil((async () => {
    const url = new URL('/dashboard/torneo', self.location.origin).href
    // Abrir directamente desde el clic permite al navegador elegir la PWA instalada.
    // Navegar primero una pestaña en segundo plano puede fallar e impedir el enfoque.
    try {
      const opened = await self.clients.openWindow(url)
      if (opened) return
    } catch { /* Intentar recuperar una ventana existente. */ }

    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if (!client.url.startsWith(self.location.origin + '/')) continue
      try {
        const focused = await client.focus()
        await (focused || client).navigate(url)
        return
      } catch { /* La ventana pudo cerrarse; probar la siguiente. */ }
    }
  })())
})
