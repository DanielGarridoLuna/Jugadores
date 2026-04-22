'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { storage } from '@/utils/storage'
import { getMexicoDateInputValue } from '@/utils/date'
import { obtenerEventoActual } from '@/utils/evento'

export default function DashboardPage() {
  const [torneos, setTorneos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [inscripciones, setInscripciones] = useState({})
  const [inscribiendo, setInscribiendo] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const router = useRouter()
  const playerId = storage.getItem('player_id')

  useEffect(() => {
    if (playerId) {
      cargarTorneos()
      cargarInscripciones()
    }
  }, [playerId])

  async function cargarTorneos() {
    const { data } = await supabase
      .from('torneos')
      .select('*')
      .eq('activo', true)

    setTorneos(data || [])
    setCargando(false)
  }

  async function cargarInscripciones() {
    if (!playerId) return

    const { data: jugador } = await supabase
      .from('jugadores')
      .select('id')
      .eq('player_id', playerId)
      .single()

    if (!jugador) return

    const { data } = await supabase
      .from('inscripciones')
      .select('torneo_id')
      .eq('jugador_id', jugador.id)

    const mapa = {}
    data?.forEach(ins => {
      mapa[ins.torneo_id] = true
    })
    setInscripciones(mapa)
  }

  async function inscribir(torneoId) {
    setInscribiendo(torneoId)
    setMensaje(null)

    try {
      const { data: jugador } = await supabase
        .from('jugadores')
        .select('id')
        .eq('player_id', playerId)
        .single()

      if (!jugador) {
        setMensaje('Jugador no encontrado')
        return
      }

      const { data: estado } = await supabase
        .from('torneo_estado')
        .select('*')
        .single()

      const late = !estado.registro_abierto
      const fechaHoy = getMexicoDateInputValue()

      const evento = await obtenerEventoActual(torneoId)

      if (!evento?.id) {
        setMensaje('No hay evento activo para este torneo')
        return
      }

      const { error } = await supabase
        .from('inscripciones')
        .insert({
          jugador_id: jugador.id,
          torneo_id: torneoId,
          late: late,
          fecha: fechaHoy,
          pagado: false,
          evento_id: evento.id
        })

      if (error) {
        if (error.code === '23505') {
          setMensaje('Ya estás inscrito en este torneo')
        } else {
          setMensaje('Error al inscribir')
        }
        return
      }

      setInscripciones(prev => ({ ...prev, [torneoId]: true }))
      setMensaje('¡Inscripción exitosa!')
      setTimeout(() => setMensaje(null), 3000)
    } catch (error) {
      console.error(error)
      setMensaje('Ocurrió un error')
    } finally {
      setInscribiendo(null)
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Torneos Activos</h1>
      
      {mensaje && (
        <div className="mb-4 p-3 rounded-xl text-center bg-green-100 text-green-700">
          {mensaje}
        </div>
      )}

      {torneos.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <p className="text-gray-500">No hay torneos activos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {torneos.map(t => {
            const inscrito = inscripciones[t.id]
            return (
              <div key={t.id} className="bg-white rounded-xl shadow-md p-4">
                <h2 className="font-bold text-lg">{t.nombre}</h2>
                {t.descripcion && (
                  <p className="text-gray-500 text-sm mt-1">{t.descripcion}</p>
                )}
                
                {inscrito ? (
                  <button
                    onClick={() => router.push('/dashboard/ronda')}
                    className="mt-3 bg-green-500 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Ver mi ronda
                  </button>
                ) : (
                  <button
                    onClick={() => inscribir(t.id)}
                    disabled={inscribiendo === t.id}
                    className="mt-3 bg-primary text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                  >
                    {inscribiendo === t.id ? 'Inscribiendo...' : 'Inscribirme'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}