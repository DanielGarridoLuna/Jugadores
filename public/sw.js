// Receptor de avisos; no guarda páginas ni datos de jugadores en caché.
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
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find(client => client.url.startsWith(self.location.origin + '/'))
    if (existing) {
      await existing.navigate(url)
      return existing.focus()
    }
    return self.clients.openWindow(url)
  })())
})
