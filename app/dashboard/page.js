'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { storage } from '@/utils/storage'
import { getMexicoDateInputValue } from '@/utils/date'
import { obtenerEventoActual, crearEventoSiNoExiste } from '@/utils/evento'

export default function DashboardPage() {
  const [torneos, setTorneos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [inscripciones, setInscripciones] = useState({})
  const [inscribiendo, setInscribiendo] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const router = useRouter()
  const playerId = storage.getItem('player_id')

  useEffect(() => {
    if (!playerId) {
      router.push('/')
      return
    }
    cargarTorneos()
  }, [playerId])

  async function cargarTorneos() {
    setCargando(true)
    
    const { data: torneosData } = await supabase
      .from('torneos')
      .select('*')
      .eq('activo', true)
    
    setTorneos(torneosData || [])
    
    if (!torneosData?.length) {
      setCargando(false)
      return
    }
    
    const { data: jugador } = await supabase
      .from('jugadores')
      .select('id')
      .eq('player_id', playerId)
      .single()
    
    if (!jugador) {
      setCargando(false)
      return
    }
    
    const mapaInscripciones = {}
    const fechaHoy = getMexicoDateInputValue()
    
    for (const torneo of torneosData) {
      // Verificar si existe inscripción para hoy en este torneo
      const { data: inscripcionHoy } = await supabase
        .from('inscripciones')
        .select('id')
        .eq('jugador_id', jugador.id)
        .eq('torneo_id', torneo.id)
        .eq('fecha', fechaHoy)
        .maybeSingle()
      
      mapaInscripciones[torneo.id] = !!inscripcionHoy
    }
    
    setInscripciones(mapaInscripciones)
    setCargando(false)
  }

  async function inscribir(torneoId, torneoNombre) {
    setInscribiendo(torneoId)
    setMensaje(null)
    
    try {
      // 1. Obtener ID del jugador
      const { data: jugador } = await supabase
        .from('jugadores')
        .select('id')
        .eq('player_id', playerId)
        .single()
      
      if (!jugador) {
        setMensaje('Jugador no encontrado')
        return
      }
      
      const fechaHoy = getMexicoDateInputValue()
      
      // 2. Verificar si ya existe inscripción para hoy en este torneo
      const { data: yaInscritoHoy } = await supabase
        .from('inscripciones')
        .select('id')
        .eq('jugador_id', jugador.id)
        .eq('torneo_id', torneoId)
        .eq('fecha', fechaHoy)
        .maybeSingle()
      
      if (yaInscritoHoy) {
        setMensaje('Ya estás inscrito en este torneo para hoy')
        setInscripciones(prev => ({ ...prev, [torneoId]: true }))
        setTimeout(() => setMensaje(null), 2000)
        return
      }
      
      // 3. Obtener evento actual o crearlo silenciosamente
      let eventoActual = await obtenerEventoActual(torneoId)
      
      if (!eventoActual) {
        eventoActual = await crearEventoSiNoExiste(torneoId)
        
        if (!eventoActual) {
          setMensaje('Error al inscribir')
          return
        }
      }
      
      // 4. Obtener estado del registro
      const { data: estado } = await supabase
        .from('torneo_estado')
        .select('registro_abierto')
        .single()
      
      const late = !estado?.registro_abierto
      
      // 5. Insertar inscripción
      const { error } = await supabase
        .from('inscripciones')
        .insert({
          jugador_id: jugador.id,
          torneo_id: torneoId,
          evento_id: eventoActual.id,
          fecha: fechaHoy,
          pagado: false,
          late: late,
          checkin: false,
        })
      
      if (error) {
        if (error.code === '23505') {
          setMensaje('Ya estás inscrito en este torneo')
          setInscripciones(prev => ({ ...prev, [torneoId]: true }))
        } else {
          console.error('Error al inscribir:', error)
          setMensaje('Error al inscribir')
        }
        setTimeout(() => setMensaje(null), 3000)
        return
      }
      
      setInscripciones(prev => ({ ...prev, [torneoId]: true }))
      setMensaje(`¡Inscripción exitosa a ${torneoNombre}!`)
      setTimeout(() => setMensaje(null), 3000)
      
      // Recargar torneos para actualizar estado
      setTimeout(() => cargarTorneos(), 1000)
      
    } catch (error) {
      console.error(error)
      setMensaje('Ocurrió un error')
    } finally {
      setInscribiendo(null)
    }
  }

  function verRonda(torneoId) {
    storage.setItem('torneo_seleccionado', torneoId)
    router.push('/dashboard/ronda')
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
                
                {inscrito === true ? (
                  <button
                    onClick={() => verRonda(t.id)}
                    className="mt-3 bg-green-500 text-white px-4 py-2 rounded-lg text-sm w-full"
                  >
                    Ver mi ronda
                  </button>
                ) : (
                  <button
                    onClick={() => inscribir(t.id, t.nombre)}
                    disabled={inscribiendo === t.id}
                    className="mt-3 bg-[#4F15E0] text-white px-4 py-2 rounded-lg text-sm w-full disabled:opacity-50"
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