'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { disableWebPush, enableWebPush, getWebPushStatus } from '@/lib/web-push'

const subscribe = () => () => {}
const getSupported = () => window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
const getServerSupported = () => false

export default function NotificationSettings({ playerId }) {
  const supported = useSyncExternalStore(subscribe, getSupported, getServerSupported)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState({ playerId: null, enabled: null, error: false })
  const requestId = useRef(0)
  const enabled = status.playerId === playerId ? status.enabled : null
  const statusError = status.playerId === playerId && status.error

  const refreshStatus = useCallback(async () => {
    const currentRequest = ++requestId.current
    try {
      const active = await getWebPushStatus()
      if (currentRequest === requestId.current) setStatus({ playerId, enabled: active, error: false })
    } catch {
      if (currentRequest === requestId.current) {
        setStatus({ playerId, enabled: null, error: true })
        setMessage('No se pudo comprobar el estado de las notificaciones. Intenta nuevamente.')
      }
    }
  }, [playerId])

  useEffect(() => {
    if (!supported) return
    const initialCheck = window.setTimeout(refreshStatus, 0)
    const onVisible = () => { if (document.visibilityState === 'visible') refreshStatus() }
    window.addEventListener('focus', refreshStatus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(initialCheck)
      window.removeEventListener('focus', refreshStatus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [supported, refreshStatus])

  async function toggleNotifications() {
    if (busy) return
    if (statusError) return refreshStatus()
    if (enabled === null) return
    setBusy(true)
    requestId.current++
    try {
      if (!enabled) {
        await enableWebPush(playerId)
        setMessage('Notificaciones activadas en este dispositivo.')
      } else {
        await disableWebPush()
        setMessage('Notificaciones desactivadas en este dispositivo.')
      }
      requestId.current++
      setStatus({ playerId, enabled: !enabled, error: false })
    } catch (error) {
      setMessage(error.message)
      await refreshStatus()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="surface p-4 my-4">
      <h2 className="font-bold text-neon">Notificaciones del torneo</h2>
      <p className="text-sm text-muted mt-2">Recibe tu nueva ronda, mesa asignada, resultado confirmado y clasificación publicada.</p>
      {supported ? (
        <div className="mt-3">
          <p className="text-sm text-muted mb-2">
            {statusError ? 'Estado de notificaciones no disponible' : enabled === null ? 'Comprobando estado...' : enabled ? 'Notificaciones activadas en este dispositivo' : 'Notificaciones desactivadas en este dispositivo'}
          </p>
          <button
            type="button"
            disabled={busy || (enabled === null && !statusError)}
            onClick={toggleNotifications}
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 ${
              enabled
                ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-400'
                : 'bg-blue-600 hover:bg-blue-700 focus-visible:outline-blue-400'
            }`}
          >
            {busy ? enabled ? 'Desactivando...' : 'Activando...' : statusError ? 'Volver a comprobar' : enabled === null ? 'Comprobando...' : enabled ? 'Desactivar notificaciones' : 'Activar notificaciones'}
          </button>
        </div>
      ) : <p className="text-sm text-muted mt-2">Este navegador no permite notificaciones push. En iPhone, abre la app desde la pantalla de inicio.</p>}
      <p className="text-sm mt-2" role="status">{message}</p>
    </section>
  )
}
