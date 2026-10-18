import { supabase } from './supabase'
import { storage } from '@/utils/storage'

const KEY = 'web_push_installation'

export async function enableWebPush(playerId) {
  if (!playerId) throw new Error('Inicia sesión para activar los avisos.')
  // Solicitar dentro del gesto del usuario, antes de esperar solicitudes de red.
  if (await Notification.requestPermission() !== 'granted') {
    throw new Error('Permite las notificaciones de este sitio en los ajustes del navegador.')
  }
  // Solo la clave pública sale de Vault hacia el navegador.
  const { data: publicKey, error: configError } = await supabase.rpc('get_web_push_public_key')
  if (configError || !publicKey) throw new Error('Los avisos todavía no están configurados en el servidor.')
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
  await navigator.serviceWorker.ready
  const base64 = publicKey.replace(/-/g, '+').replace(/_/g, '/')
  const applicationServerKey = Uint8Array.from(atob(base64 + '='.repeat((4 - base64.length % 4) % 4)), c => c.charCodeAt(0))
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
  let capability = storage.getItem(KEY)
  if (!capability) {
    capability = crypto.randomUUID()
    if (!storage.setItem(KEY, capability)) throw new Error('No se pudo guardar la configuración de este dispositivo.')
  }
  const { error } = await supabase.rpc('save_web_push_subscription', {
    capability, target_player_id: String(playerId), subscription: subscription.toJSON(),
  })
  if (error) throw new Error('No se pudieron guardar los avisos. Intenta desactivarlos y activarlos nuevamente.')
}

export async function disableWebPush() {
  const capability = storage.getItem(KEY)
  if (capability) {
    const { error } = await supabase.rpc('remove_web_push_subscription', { capability })
    if (error) throw new Error('No se pudo desactivar la suscripción en el servidor. Intenta nuevamente.')
  }
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration('/')
    await (await registration?.pushManager?.getSubscription())?.unsubscribe()
  }
  storage.removeItem(KEY)
}

export async function testWebPush() {
  const capability = storage.getItem(KEY)
  if (!capability) throw new Error('Activa los avisos primero.')
  const { error } = await supabase.rpc('test_web_push_subscription', { capability })
  if (error) throw new Error('No se pudo solicitar la prueba. Revisa la configuración de envío.')
}
