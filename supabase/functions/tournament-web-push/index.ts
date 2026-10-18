/* global Deno */
import { createClient } from 'npm:@supabase/supabase-js@2.104.0'
import webpush from 'npm:web-push@3.6.7'

// Únicamente usa las dos variables integradas de Supabase, comprobadas en test-pwa-vault.
Deno.serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  // No consultar Vault para solicitudes sin autenticación.
  const providedSecret = request.headers.get('x-webhook-secret')
  if (!providedSecret) return new Response('Unauthorized', { status: 401 })
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: config, error: configError } = await db.rpc('get_web_push_server_config')
    if (configError || !config?.pwa_webhook_secret || !config?.pwa_vapid_public_key || !config?.pwa_vapid_private_key || !config?.pwa_vapid_subject) {
      return new Response('Push configuration missing', { status: 503 })
    }
    if (providedSecret !== config.pwa_webhook_secret) return new Response('Unauthorized', { status: 401 })
    const { player_ids, subscription_id, title, body, tag } = await request.json()
    if (typeof title !== 'string' || typeof body !== 'string' || title.length > 200 || body.length > 2000 ||
        (!subscription_id && (!Array.isArray(player_ids) || !player_ids.length))) {
      return new Response('Invalid payload', { status: 400 })
    }
    webpush.setVapidDetails(config.pwa_vapid_subject, config.pwa_vapid_public_key, config.pwa_vapid_private_key)
    let query = db.from('web_push_subscriptions').select('id, subscription')
    query = subscription_id ? query.eq('id', subscription_id) : query.in('player_id', player_ids.map(String))
    const { data, error } = await query
    if (error) throw error
    const results = await Promise.allSettled((data || []).map(async row => {
      try {
        await webpush.sendNotification(row.subscription, JSON.stringify({ title, body, tag }), { TTL: 900, urgency: 'high', timeout: 10000 })
      } catch (error) {
        const statusCode = error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : null
        if (statusCode === 404 || statusCode === 410) {
          const { error: deletionError } = await db.from('web_push_subscriptions').delete().eq('id', row.id)
          if (deletionError) throw deletionError
        } else throw error
      }
    }))
    const failed = results.filter(result => result.status === 'rejected').length
    if (failed) console.error('Web push delivery failures:', failed)
    return Response.json({ processed: results.length, failed }, { status: failed ? 502 : 200 })
  } catch {
    // No imprimir endpoints, secretos ni contenido de las notificaciones en logs.
    console.error('Tournament web push failed')
    return new Response('Notification failed', { status: 500 })
  }
})
