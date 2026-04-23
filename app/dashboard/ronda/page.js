'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { storage } from '@/utils/storage'
import MatchCard from '@/components/MatchCard'
import SelectorRonda from '@/components/SelectorRonda'
import { useRouter } from 'next/navigation'

const normalizarId = (valor) => {
  if (!valor || valor === 'null' || valor === 'undefined') return null
  return String(valor).trim()
}

export default function RondaPage() {
  const router = useRouter()
  const playerId = storage.getItem('player_id')
  const torneoGuardadoId = storage.getItem('torneo_seleccionado')
  
  const [torneos, setTorneos] = useState([])
  const [torneoSeleccionado, setTorneoSeleccionado] = useState(null)
  const [torneosInscritos, setTorneosInscritos] = useState([]) // Solo torneos donde está inscrito
  const [eventoActual, setEventoActual] = useState(null)
  const [rondas, setRondas] = useState([])
  const [rondaSeleccionada, setRondaSeleccionada] = useState(null)
  const [matches, setMatches] = useState([])
  const [cargando, setCargando] = useState(true)
  const [reportandoId, setReportandoId] = useState(null)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    cargarTorneosEInscripciones()
  }, [])

  async function cargarTorneosEInscripciones() {
    // 1. Obtener torneos activos
    const { data: torneosData } = await supabase
      .from('torneos')
      .select('*')
      .eq('activo', true)

    setTorneos(torneosData || [])
    
    if (!torneosData?.length) {
      setCargando(false)
      return
    }
    
    // 2. Obtener ID del jugador
    const { data: jugador } = await supabase
      .from('jugadores')
      .select('id')
      .eq('player_id', playerId)
      .single()
    
    if (!jugador) {
      setCargando(false)
      return
    }
    
    // 3. Verificar en qué torneos está inscrito (evento actual)
    const torneosConInscripcion = []
    
    for (const torneo of torneosData) {
      const { data: evento } = await supabase
        .from('eventos')
        .select('id')
        .eq('torneo_id', torneo.id)
        .eq('archivado', false)
        .order('fecha', { ascending: false })
        .limit(1)
      
      if (evento?.length > 0) {
        const { data: inscripcion } = await supabase
          .from('inscripciones')
          .select('id')
          .eq('jugador_id', jugador.id)
          .eq('torneo_id', torneo.id)
          .eq('evento_id', evento[0].id)
          .maybeSingle()
        
        if (inscripcion) {
          torneosConInscripcion.push(torneo)
        }
      }
    }
    
    setTorneosInscritos(torneosConInscripcion)
    
    // 4. Seleccionar torneo (priorizar el guardado o el primero donde está inscrito)
    if (torneosConInscripcion.length > 0) {
      let torneoId = torneoGuardadoId
      
      // Verificar si el torneo guardado es válido y está inscrito
      const torneoGuardadoValido = torneosConInscripcion.find(t => String(t.id) === String(torneoGuardadoId))
      
      if (torneoGuardadoValido) {
        torneoId = torneoGuardadoId
      } else if (torneosConInscripcion[0]) {
        torneoId = torneosConInscripcion[0].id
      }
      
      setTorneoSeleccionado(torneoId)
      await cargarEventoActual(torneoId)
    } else {
      setMensaje('No estás inscrito en ningún torneo')
    }
    
    setCargando(false)
  }

  const cargarEventoActual = useCallback(async (torneoId) => {
    const { data } = await supabase
      .from('eventos')
      .select('*')
      .eq('torneo_id', torneoId)
      .eq('archivado', false)
      .order('fecha', { ascending: false })
      .limit(1)

    if (data?.length > 0) {
      setEventoActual(data[0])
      await cargarRondas(data[0].id)
      return data[0]
    }
    setEventoActual(null)
    return null
  }, [])

  const cargarRondas = useCallback(async (eventoId) => {
    const { data } = await supabase
      .from('rondas')
      .select('*')
      .eq('evento_id', eventoId)
      .order('numero_ronda', { ascending: false })

    const lista = data || []
    setRondas(lista)

    if (lista.length > 0) {
      const activa = lista.find(r => r.status === 'activa')
      if (activa) {
        setRondaSeleccionada(activa.id)
        await cargarMatches(activa.id, eventoId)
      } else {
        setRondaSeleccionada(lista[0].id)
        await cargarMatches(lista[0].id, eventoId)
      }
    } else {
      setRondaSeleccionada(null)
      setMatches([])
    }
    return lista
  }, [])

  const cargarMatches = useCallback(async (rondaId, eventoId) => {
    if (!rondaId || !eventoId) return

    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('ronda_id', rondaId)
      .eq('evento_id', eventoId)
      .order('mesa', { ascending: true })

    if (!data) {
      setMatches([])
      return
    }

    const ids = [...new Set(data.flatMap(m => [m.jugador1_id, m.jugador2_id]).filter(Boolean))]
    let mapaNombres = {}

    if (ids.length > 0) {
      const { data: jugadores } = await supabase
        .from('jugadores')
        .select('player_id, nombre')
        .in('player_id', ids)

      jugadores?.forEach(j => {
        mapaNombres[j.player_id] = j.nombre
      })
    }

    const formateados = data.map(m => {
      const r1 = m.ganador_reportado_1
      const r2 = m.ganador_reportado_2
      let estado = 'pendiente'

      if (m.confirmado) {
        estado = 'confirmado'
      } else if (r1 && r2 && r1 !== r2) {
        estado = 'conflicto'
      } else if (r1 || r2) {
        estado = 'esperando'
      }

      return {
        ...m,
        estado,
        jugador1_nombre: mapaNombres[m.jugador1_id] || m.jugador1_id || 'Desconocido',
        jugador2_nombre: m.jugador2_id ? (mapaNombres[m.jugador2_id] || m.jugador2_id) : 'BYE'
      }
    })

    setMatches(formateados)
  }, [])

  const cambiarTorneo = async (torneoId) => {
    // Solo permitir cambiar a torneos donde está inscrito
    const estaInscrito = torneosInscritos.some(t => String(t.id) === String(torneoId))
    if (!estaInscrito) {
      setMensaje('No estás inscrito en este torneo')
      setTimeout(() => setMensaje(null), 3000)
      return
    }
    
    setTorneoSeleccionado(torneoId)
    storage.setItem('torneo_seleccionado', torneoId)
    setRondas([])
    setRondaSeleccionada(null)
    setMatches([])
    await cargarEventoActual(torneoId)
  }

  const reportar = async (match, ganador) => {
    setReportandoId(match.id)

    const user = normalizarId(playerId)
    const j1 = normalizarId(match.jugador1_id)
    const j2 = normalizarId(match.jugador2_id)

    const rondaActualObj = rondas.find(r => String(r.id) === String(rondaSeleccionada))
    if (rondaActualObj?.status === 'finalizada') {
      setMensaje('Esta ronda ya finalizó, solo consulta')
      setReportandoId(null)
      setTimeout(() => setMensaje(null), 3000)
      return
    }

    if (user !== j1 && user !== j2) {
      setMensaje('No puedes reportar este match')
      setReportandoId(null)
      setTimeout(() => setMensaje(null), 3000)
      return
    }

    if (ganador === 'empate') {
      await supabase
        .from('matches')
        .update({
          empate: true,
          ganador_final: null,
          confirmado: false
        })
        .eq('id', match.id)
    } else {
      const campo = user === j1 ? 'ganador_reportado_1' : 'ganador_reportado_2'
      await supabase
        .from('matches')
        .update({
          [campo]: ganador,
          empate: false
        })
        .eq('id', match.id)

      const { data: updated } = await supabase
        .from('matches')
        .select('*')
        .eq('id', match.id)
        .single()

      if (updated.ganador_reportado_1 && updated.ganador_reportado_2 &&
          updated.ganador_reportado_1 === updated.ganador_reportado_2) {
        await supabase
          .from('matches')
          .update({
            ganador_final: updated.ganador_reportado_1,
            confirmado: true
          })
          .eq('id', match.id)
      }
    }

    await cargarMatches(rondaSeleccionada, eventoActual.id)
    setReportandoId(null)
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Si no está inscrito en ningún torneo
  if (torneosInscritos.length === 0) {
    return (
      <div className="p-4 pb-24">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Mi Ronda</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-700 font-medium mb-2">No estás inscrito en ningún torneo</p>
          <p className="text-yellow-600 text-sm">Ve a la pantalla principal para inscribirte</p>
          <button
            onClick={() => router.push('/dashboard')}
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
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Mi Ronda</h1>

      {/* Selector SOLO de torneos donde está inscrito */}
      {torneosInscritos.length > 1 && (
        <div className="mb-4 overflow-x-auto">
          <div className="flex gap-2">
            {torneosInscritos.map(t => (
              <button
                key={t.id}
                onClick={() => cambiarTorneo(t.id)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
                  String(torneoSeleccionado) === String(t.id)
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

      {mensaje && (
        <div className="bg-red-100 text-red-700 p-3 rounded-xl mb-4 text-center">
          {mensaje}
        </div>
      )}

      {!eventoActual && torneoSeleccionado && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-yellow-700">No hay evento activo para este torneo</p>
        </div>
      )}

      {eventoActual && (
        <>
          <p className="text-sm text-gray-500 mb-3">
            Torneo: <span className="font-semibold">
              {torneos.find(t => String(t.id) === String(torneoSeleccionado))?.nombre}
            </span>
          </p>
          <p className="text-sm text-gray-500 mb-3">
            Evento: <span className="font-semibold">{eventoActual.fecha}</span>
          </p>

          <SelectorRonda
            rondas={rondas}
            rondaSeleccionada={rondaSeleccionada}
            setRonda={setRondaSeleccionada}
          />

          {matches.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <p className="text-gray-500">No hay matches para esta ronda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onReport={reportar}
                  userId={playerId}
                  reportando={reportandoId === match.id}
                  rondaFinalizada={rondas.find(r => String(r.id) === String(rondaSeleccionada))?.status === 'finalizada'}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}