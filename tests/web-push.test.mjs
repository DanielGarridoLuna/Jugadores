import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8')

function browserHarness() {
  const values = new Map()
  const calls = []
  const subscription = { toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/example' }), unsubscribe: async () => calls.push('unsubscribe') }
  const registration = { pushManager: { getSubscription: async () => subscription } }
  const context = {
    Notification: { requestPermission: async () => 'granted' },
    supabase: { rpc: async (name, args) => {
      calls.push([name, args])
      return name === 'get_web_push_public_key' ? { data: Buffer.alloc(65, 1).toString('base64url') } : { error: null }
    } },
    storage: { getItem: key => values.get(key), setItem: (key, value) => { values.set(key, value); return true }, removeItem: key => values.delete(key) },
    navigator: { serviceWorker: { register: async () => registration, ready: Promise.resolve(registration), getRegistration: async () => registration } },
    crypto: { randomUUID: () => 'installation-capability' }, Uint8Array,
    atob: value => Buffer.from(value, 'base64').toString('binary'),
  }
  vm.createContext(context)
  vm.runInContext(read('lib/web-push.js').replace(/^import .*\n/gm, '').replace(/export /g, ''), context)
  return { context, calls, values }
}

test('activación usa solo la clave pública y vincula el dispositivo al jugador', async () => {
  const { context, calls } = browserHarness()
  await context.enableWebPush('123')
  assert.equal(calls[0][0], 'get_web_push_public_key')
  assert.equal(calls[1][0], 'save_web_push_subscription')
  assert.equal(calls[1][1].target_player_id, '123')
  assert.equal(calls[1][1].capability, 'installation-capability')
})

test('permiso denegado no registra el dispositivo', async () => {
  const { context, calls } = browserHarness()
  context.Notification.requestPermission = async () => 'denied'
  await assert.rejects(context.enableWebPush('123'), /Permite/)
  assert.equal(calls.length, 0)
})

test('configuración ausente se comunica sin registrar una suscripción', async () => {
  const { context } = browserHarness()
  context.supabase.rpc = async () => ({ data: null, error: null })
  await assert.rejects(context.enableWebPush('123'), /configurados/)
})

test('baja elimina primero la suscripción del servidor y después la local', async () => {
  const { context, calls, values } = browserHarness()
  await context.enableWebPush('123')
  calls.length = 0
  await context.disableWebPush()
  assert.equal(calls[0][0], 'remove_web_push_subscription')
  assert.equal(calls[1], 'unsubscribe')
  assert.equal(values.size, 0)
})

test('fallo de baja remota conserva el identificador para reintentar', async () => {
  const { context, values } = browserHarness()
  await context.enableWebPush('123')
  context.supabase.rpc = async () => ({ error: { message: 'offline' } })
  await assert.rejects(context.disableWebPush(), /desactivar/)
  assert.equal(values.size, 1)
})

test('service worker procesa payload inválido y abre solo el torneo del mismo sitio', async () => {
  const handlers = {}
  let shown, opened, pending
  const origin = 'https://aldebaran-torneos.vercel.app'
  const self = { location: { origin }, addEventListener: (name, fn) => { handlers[name] = fn }, registration: { showNotification: async (...args) => { shown = args } }, clients: { matchAll: async () => [], openWindow: async url => { opened = url } } }
  vm.runInNewContext(read('public/sw.js'), { self, URL })
  const waitUntil = promise => { pending = promise }
  handlers.push({ data: { json: () => ({ title: 'Ronda 2', body: 'Mesa 4', tag: 'mesa-1', url: 'https://example.invalid' }) }, waitUntil })
  await pending
  assert.equal(shown[0], 'Ronda 2')
  assert.equal(shown[1].body, 'Mesa 4')
  handlers.push({ data: { json: () => { throw Error('bad JSON') } }, waitUntil })
  await pending
  assert.equal(shown[0], 'Torneos Aldebaran')
  handlers.notificationclick({ notification: { close() {} }, waitUntil })
  await pending
  assert.equal(opened, origin + '/dashboard/torneo')
})

test('el clic abre primero la PWA sin intentar navegar una pestaña antigua', async () => {
  const handlers = {}
  const actions = []
  let pending
  const self = {
    location: { origin: 'https://aldebaran-torneos.vercel.app' },
    addEventListener: (name, fn) => { handlers[name] = fn },
    clients: {
      openWindow: async () => { actions.push('open'); return {} },
      matchAll: async () => { throw Error('No debe consultar pestañas') },
    },
  }
  vm.runInNewContext(read('public/sw.js'), { self, URL })
  handlers.notificationclick({ notification: { close() {} }, waitUntil: p => { pending = p } })
  await pending
  assert.deepEqual(actions, ['open'])
})

test('si Brave rechaza abrir ventana, enfoca antes de navegar y tolera ventanas cerradas', async () => {
  const handlers = {}
  const actions = []
  let pending
  const origin = 'https://aldebaran-torneos.vercel.app'
  const client = { url: origin + '/dashboard/perfil', focus: async () => { actions.push('focus'); return client }, navigate: async url => { actions.push(url) } }
  const self = {
    location: { origin }, addEventListener: (name, fn) => { handlers[name] = fn },
    clients: {
      openWindow: async () => { throw Error('No permitido') },
      matchAll: async () => [{ url: origin + '/', focus: async () => { throw Error('Cerrada') } }, client],
    },
  }
  vm.runInNewContext(read('public/sw.js'), { self, URL })
  handlers.notificationclick({ notification: { close() {} }, waitUntil: p => { pending = p } })
  await pending
  assert.deepEqual(actions, ['focus', origin + '/dashboard/torneo'])
})

test('la actualización del receptor se activa y controla las ventanas existentes', async () => {
  const handlers = {}
  const actions = []
  let pending
  const self = { addEventListener: (name, fn) => { handlers[name] = fn }, skipWaiting: async () => actions.push('skipWaiting'), clients: { claim: async () => actions.push('claim') } }
  vm.runInNewContext(read('public/sw.js'), { self, URL })
  handlers.install({ waitUntil: p => { pending = p } }); await pending
  handlers.activate({ waitUntil: p => { pending = p } }); await pending
  assert.deepEqual(actions, ['skipWaiting', 'claim'])
})

function edgeHarness() {
  let handler, mode = 'ok', configReads = 0, sent = 0, deleted = 0
  const config = { pwa_webhook_secret: 'test-secret', pwa_vapid_subject: 'https://example.test', pwa_vapid_public_key: 'public', pwa_vapid_private_key: 'private' }
  const selection = { eq: async () => ({ data: [{ id: 1, subscription: {} }] }), in: async () => ({ data: [{ id: 1, subscription: {} }] }) }
  const db = {
    rpc: async () => { configReads++; return { data: mode === 'missing' ? null : config } },
    from: () => ({ select: () => selection, delete: () => ({ eq: async () => { deleted++; return { error: null } } }) }),
  }
  const context = {
    Deno: { serve: fn => { handler = fn }, env: { get: () => 'integrated-value' } },
    createClient: () => db, Response, console: { error() {} },
    webpush: { setVapidDetails() {}, sendNotification: async () => { sent++; if (mode === 'expired') throw { statusCode: 410 }; if (mode === 'failed') throw { statusCode: 503 } } },
  }
  const source = read('supabase/functions/tournament-web-push/index.ts').replace(/^import .*\n/gm, '')
  vm.runInNewContext(ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }), context)
  const request = (secret = 'test-secret', payload = { player_ids: ['123'], title: 'Nueva ronda', body: 'Mesa 4' }) => new Request('https://example.test', { method: 'POST', headers: secret ? { 'x-webhook-secret': secret } : {}, body: JSON.stringify(payload) })
  return { invoke: (...args) => handler(request(...args)), setMode: value => { mode = value }, stats: () => ({ configReads, sent, deleted }) }
}

test('webhook rechaza peticiones sin secreto antes de leer Vault', async () => {
  const edge = edgeHarness()
  assert.equal((await edge.invoke(null)).status, 401)
  assert.equal(edge.stats().configReads, 0)
  assert.equal((await edge.invoke('wrong')).status, 401)
  assert.equal(edge.stats().sent, 0)
})

test('webhook valida configuración y payload antes de enviar', async () => {
  const edge = edgeHarness()
  edge.setMode('missing')
  assert.equal((await edge.invoke()).status, 503)
  edge.setMode('ok')
  assert.equal((await edge.invoke('test-secret', {})).status, 400)
  assert.equal(edge.stats().sent, 0)
})

test('envío normal y prueba por instalación llegan a la librería de push', async () => {
  const edge = edgeHarness()
  assert.equal((await edge.invoke()).status, 200)
  assert.equal((await edge.invoke('test-secret', { subscription_id: 'test', title: 'Prueba', body: 'Avisos' })).status, 200)
  assert.equal(edge.stats().sent, 2)
})

test('el backend retira suscripciones expiradas y reporta fallos temporales', async () => {
  const edge = edgeHarness()
  edge.setMode('expired')
  assert.equal((await edge.invoke()).status, 200)
  assert.equal(edge.stats().deleted, 1)
  edge.setMode('failed')
  assert.equal((await edge.invoke()).status, 502)
})
