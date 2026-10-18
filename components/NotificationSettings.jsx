'use client'

import { useState, useSyncExternalStore } from 'react'
import { disableWebPush, enableWebPush } from '@/lib/web-push'

const subscribe = () => () => {}
const getSupported = () => window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
const getServerSupported = () => false

export default function NotificationSettings({ playerId }) {
  const supported = useSyncExternalStore(subscribe, getSupported, getServerSupported)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function perform(action) {
    setBusy(true)
    try {
      if (action === 'enable') {
        await enableWebPush(playerId)
        setMessage('Avisos activados en este dispositivo.')
      } else {
        await disableWebPush()
        setMessage('Avisos desactivados en este dispositivo.')
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="surface p-4 my-4">
      <h2 className="font-bold text-neon">Notificaciones del torneo</h2>
      <p className="text-sm text-muted mt-2">Recibe tu nueva ronda, mesa asignada y resultado confirmado.</p>
      {supported ? (
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <button type="button" className="btn-neon disabled:opacity-50" disabled={busy} onClick={() => perform('enable')}>{busy ? 'Guardando...' : 'Activar avisos'}</button>
          <button type="button" className="text-sm text-muted disabled:opacity-50" disabled={busy} onClick={() => perform('disable')}>Desactivar</button>
        </div>
      ) : <p className="text-sm text-muted mt-2">Este navegador no permite notificaciones push. En iPhone, abre la app desde la pantalla de inicio.</p>}
      <p className="text-sm mt-2" role="status">{message}</p>
    </section>
  )
}
