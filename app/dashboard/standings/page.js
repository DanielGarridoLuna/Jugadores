'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { storage } from '@/utils/storage'
import { Trophy, Medal, TrendingUp, Calendar } from 'lucide-react'

export default function StandingsPage() {
  const playerId = storage.getItem('player_id')
  
  const [torneos, setTorneos] = useState([])
  const [torneosParticipados, setTorneosParticipados] = useState([])
  const [torneoSeleccionado, setTorneoSeleccionado] = useState(null)
  const [eventos, setEventos] = useState([])
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null)
  const [standings, setStandings] = useState([])
  const [cargando, setCargando] = useState(true)
  const [miPosicion, setMiPosicion] = useState(null)

  useEffect(() => {
    cargarTorneosParticipados()
  }, [])

  async function cargarTorneosParticipados() {
    // 1. Obtener ID del jugador
    const { data: jugador } = await supabase
      .from('jugadores')
      .select('id')
      .eq('player_id', playerId)
      .single()

    if (!jugador) {
      setCargando(false)
      return
    }

    // 2. Obtener todos los torneos donde el jugador tiene inscripciones
    const { data: inscripciones } = await supabase
      .from('inscripciones')
      .select('torneo_id')
      .eq('jugador_id', jugador.id)

    if (!inscripciones || inscripciones.length === 0) {
      setCargando(false)
      return
    }

    // IDs únicos de torneos donde participó
    const torneosIds = [...new Set(inscripciones.map(i => i.torneo_id))]

    // 3. Obtener detalles de esos torneos
    const { data: torneosData } = await supabase
      .from('torneos')
      .select('*')
      .in('id', torneosIds)
      .eq('activo', true)
      .order('nombre', { ascending: true })

    setTorneosParticipados(torneosData || [])
    if (torneosData?.length > 0) {
      setTorneoSeleccionado(torneosData[0].id)
    }
  }

  const cargarEventos = useCallback(async (torneoId) => {
    // Cargar SOLO eventos NO archivados del torneo
    const { data } = await supabase
      .from('eventos')
      .select('*')
      .eq('torneo_id', torneoId)
      .eq('archivado', false)
      .order('fecha', { ascending: false })

    setEventos(data || [])
    if (data?.length > 0) {
      setEventoSeleccionado(data[0].id)
    } else {
      setEventoSeleccionado(null)
      setStandings([])
    }
  }, [])

  const cargarStandings = useCallback(async (eventoId) => {
    if (!eventoId) return

    const { data } = await supabase
      .from('standings')
      .select('*')
      .eq('evento_id', eventoId)
      .order('posicion', { ascending: true })

    if (!data || data.length === 0) {
      setStandings([])
      return
    }

    const ids = data.map(s => s.player_id)
    const { data: jugadores } = await supabase
      .from('jugadores')
      .select('player_id, nombre')
      .in('player_id', ids)

    const mapaNombres = {}
    jugadores?.forEach(j => {
      mapaNombres[j.player_id] = j.nombre
    })

    const formateados = data.map(s => ({
      ...s,
      nombre: mapaNombres[s.player_id] || s.player_id
    }))

    setStandings(formateados)

    const miIndex = formateados.findIndex(s => s.player_id === playerId)
    if (miIndex !== -1) {
      setMiPosicion({
        posicion: miIndex + 1,
        nombre: formateados[miIndex].nombre,
        player_id: formateados[miIndex].player_id
      })
    } else {
      setMiPosicion(null)
    }
  }, [playerId])

  useEffect(() => {
    if (torneoSeleccionado) {
      cargarEventos(torneoSeleccionado)
    }
  }, [torneoSeleccionado, cargarEventos])

  useEffect(() => {
    if (eventoSeleccionado) {
      cargarStandings(eventoSeleccionado)
      setCargando(false)
    } else {
      setStandings([])
      setCargando(false)
    }
  }, [eventoSeleccionado, cargarStandings])

  const getMedalla = (posicion) => {
    if (posicion === 1) return <Medal className="text-yellow-500" size={20} />
    if (posicion === 2) return <Medal className="text-gray-400" size={20} />
    if (posicion === 3) return <Medal className="text-amber-600" size={20} />
    return <span className="w-5 text-center text-gray-400">{posicion}</span>
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Si no ha participado en ningún torneo
  if (torneosParticipados.length === 0) {
    return (
      <div className="p-4 pb-24">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Standings</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <Trophy size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-yellow-700 font-medium mb-2">No has participado en ningún torneo</p>
          <p className="text-yellow-600 text-sm">Inscríbete a un torneo para ver tus standings</p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="mt-4 bg-primary text-white px-6 py-2 rounded-lg text-sm"
          >
            Ver torneos
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Mis Standings</h1>

      {/* Selector de Torneo (SOLO donde ha participado) */}
      {torneosParticipados.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">Torneo</label>
          <div className="flex flex-wrap gap-2">
            {torneosParticipados.map(t => (
              <button
                key={t.id}
                onClick={() => setTorneoSeleccionado(t.id)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
                  torneoSeleccionado === t.id
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                {t.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selector de Evento (SOLO NO ARCHIVADOS) */}
      {eventos.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
            <Calendar size={16} /> Evento
          </label>
          <div className="flex flex-wrap gap-2">
            {eventos.map(e => (
              <button
                key={e.id}
                onClick={() => setEventoSeleccionado(e.id)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
                  eventoSeleccionado === e.id
                    ? 'bg-secondary text-white'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                {e.fecha}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mi posición destacada (solo si estoy en este evento) */}
      {miPosicion && (
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4 mb-4 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp size={24} className="text-primary" />
              <div>
                <p className="text-xs text-gray-500">Tu posición en este evento</p>
                <p className="text-2xl font-bold text-primary">#{miPosicion.posicion}</p>
                <p className="text-sm font-semibold">{miPosicion.nombre}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Standings */}
      {standings.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <Trophy size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay standings disponibles para este evento</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b flex justify-between text-sm font-semibold text-gray-600">
            <span className="w-12">Pos</span>
            <span className="flex-1">Jugador</span>
          </div>
          <div className="divide-y">
            {standings.map(s => (
              <div
                key={s.player_id}
                className={`px-4 py-3 flex items-center ${
                  miPosicion?.player_id === s.player_id ? 'bg-primary/10 ring-1 ring-primary' : ''
                }`}
              >
                <div className="flex items-center gap-2 w-12">
                  {getMedalla(s.posicion)}
                </div>
                <span className="flex-1 font-medium text-gray-800">{s.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensaje si no hay eventos */}
      {eventos.length === 0 && torneoSeleccionado && (
        <div className="bg-white rounded-xl p-8 text-center">
          <p className="text-gray-500">Este torneo no tiene eventos activos</p>
        </div>
      )}
    </div>
  )
}