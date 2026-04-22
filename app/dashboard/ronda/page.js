'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { storage } from '@/utils/storage'
import MatchCard from '@/components/MatchCard'
import SelectorRonda from '@/components/SelectorRonda'

const normalizarId = (valor) => {
  if (!valor || valor === 'null' || valor === 'undefined') return null
  return String(valor).trim()
}

export default function RondaPage() {
  const playerId = storage.getItem('player_id')
  const torneoGuardadoId = storage.getItem('torneo_seleccionado')
  
  const [torneos, setTorneos] = useState([])
  const [torneoSeleccionado, setTorneoSeleccionado] = useState(null)
  const [eventoActual, setEventoActual] = useState(null)
  const [rondas, setRondas] = useState([])
  const [rondaSeleccionada, setRondaSeleccionada] = useState(null)
  const [matches, setMatches] = useState([])
  const [cargando, setCargando] = useState(true)
  const [reportandoId, setReportandoId] = useState(null)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    cargarTorneos()
  }, [])

  async function cargarTorneos() {
    const { data } = await supabase
      .from('torneos')
      .select('*')
      .eq('activo', true)

    setTorneos(data || [])
    
    // Priorizar torneo guardado, si no, el primero
    if (data?.length > 0) {
      if (torneoGuardadoId && data.find(t => String(t.id) === String(torneoGuardadoId))) {
        setTorneoSeleccionado(torneoGuardadoId)
      } else {
        setTorneoSeleccionado(data[0].id)
      }
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
      } else {
        setRondaSeleccionada(lista[0].id)
      }
    } else {
      setRondaSeleccionada(null)
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

  useEffect(() => {
    if (torneoSeleccionado) {
      cargarEventoActual(torneoSeleccionado)
    }
  }, [torneoSeleccionado, cargarEventoActual])

  useEffect(() => {
    if (eventoActual) {
      cargarRondas(eventoActual.id)
    } else {
      setRondas([])
      setRondaSeleccionada(null)
      setMatches([])
    }
  }, [eventoActual, cargarRondas])

  useEffect(() => {
    if (rondaSeleccionada && eventoActual) {
      cargarMatches(rondaSeleccionada, eventoActual.id)
    }
  }, [rondaSeleccionada, eventoActual, cargarMatches])

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

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Mi Ronda</h1>

      {torneos.length > 1 && (
        <div className="mb-4 overflow-x-auto">
          <div className="flex gap-2">
            {torneos.map(t => (
              <button
                key={t.id}
                onClick={() => setTorneoSeleccionado(t.id)}
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

          {mensaje && (
            <div className="bg-red-100 text-red-700 p-3 rounded-xl mb-4 text-center">
              {mensaje}
            </div>
          )}

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