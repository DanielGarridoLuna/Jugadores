'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { storage } from '@/utils/storage'
import { Trophy, Medal, TrendingUp, Calendar, Swords, LayoutList } from 'lucide-react'
import MatchCard from '@/components/MatchCard'
import SelectorRonda from '@/components/SelectorRonda'
import { useRouter } from 'next/navigation'

const normalizarId = (valor) => {
  if (!valor || valor === 'null' || valor === 'undefined') return null
  return String(valor).trim()
}

export default function TorneoPage() {
  const router = useRouter()
  const playerId = storage.getItem('player_id')
  const torneoGuardadoId = storage.getItem('torneo_seleccionado')
  
  const [torneos, setTorneos] = useState([])
  const [torneoSeleccionado, setTorneoSeleccionado] = useState(null)
  const [torneosInscritos, setTorneosInscritos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState(null)
  const [pestañaActiva, setPestañaActiva] = useState('ronda')
  
  const [eventoActual, setEventoActual] = useState(null)
  const [rondas, setRondas] = useState([])
  const [rondaSeleccionada, setRondaSeleccionada] = useState(null)
  const [matches, setMatches] = useState([])
  const [reportandoId, setReportandoId] = useState(null)
  
  const [eventosStandings, setEventosStandings] = useState([])
  const [eventoSeleccionadoStandings, setEventoSeleccionadoStandings] = useState(null)
  const [standings, setStandings] = useState([])
  const [miPosicion, setMiPosicion] = useState(null)

  useEffect(() => {
    cargarTorneosEInscripciones()
  }, [])

  async function cargarTorneosEInscripciones() {
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
    
    if (torneosConInscripcion.length > 0) {
      let torneoId = torneoGuardadoId
      
      const torneoGuardadoValido = torneosConInscripcion.find(t => String(t.id) === String(torneoGuardadoId))
      
      if (torneoGuardadoValido) {
        torneoId = torneoGuardadoId
      } else if (torneosConInscripcion[0]) {
        torneoId = torneosConInscripcion[0].id
      }
      
      setTorneoSeleccionado(torneoId)
      await cargarEventoActual(torneoId)
      await cargarEventosStandings(torneoId)
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

  const cargarEventosStandings = useCallback(async (torneoId) => {
    const { data } = await supabase
      .from('eventos')
      .select('*')
      .eq('torneo_id', torneoId)
      .eq('archivado', false)
      .order('fecha', { ascending: false })

    setEventosStandings(data || [])
    if (data?.length > 0) {
      setEventoSeleccionadoStandings(data[0].id)
      await cargarStandings(data[0].id)
    } else {
      setEventoSeleccionadoStandings(null)
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
      setMiPosicion(null)
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

  const cambiarTorneo = async (torneoId) => {
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
    await cargarEventosStandings(torneoId)
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

  const getMedalla = (posicion) => {
    if (posicion === 1) return <Medal className="text-yellow-500" size={20} />
    if (posicion === 2) return <Medal className="text-gray-400" size={20} />
    if (posicion === 3) return <Medal className="text-amber-600" size={20} />
    return <span className="w-5 text-center text-muted">{posicion}</span>
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[color:var(--neon-cyan)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (torneosInscritos.length === 0) {
    return (
      <div className="p-4 pb-24">
        <h1 className="text-2xl font-bold text-neon mb-4">Torneo</h1>
        <div className="surface p-6 text-center">
          <Trophy size={48} className="text-muted mx-auto mb-3" />
          <p className="text-neon-pink font-medium mb-2">No has participado en ningún torneo</p>
          <p className="text-muted text-sm">Inscríbete a un torneo para ver tu ronda y standings</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 btn-neon"
          >
            Ver torneos
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-neon mb-4">Torneo</h1>

      {/* Selector de Torneo */}
      {torneosInscritos.length > 1 && (
        <div className="mb-4 overflow-x-auto">
          <div className="flex gap-2">
            {torneosInscritos.map(t => (
              <button
                key={t.id}
                onClick={() => cambiarTorneo(t.id)}
                className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                  String(torneoSeleccionado) === String(t.id)
                    ? 'btn-neon-active'
                    : 'btn-neon'
                }`}
              >
                {t.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {mensaje && (
        <div className="bg-red-500/10 text-red-400 border border-red-500/40 p-3 rounded-lg mb-4 text-center text-sm">
          {mensaje}
        </div>
      )}

      {/* Pestañas */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setPestañaActiva('ronda')}
          className={`flex-1 py-2.5 rounded-md text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            pestañaActiva === 'ronda' ? 'btn-neon-active' : 'btn-neon'
          }`}
        >
          <Swords size={16} />
          Ronda
        </button>
        <button
          onClick={() => setPestañaActiva('standings')}
          className={`flex-1 py-2.5 rounded-md text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            pestañaActiva === 'standings' ? 'btn-neon-active' : 'btn-neon'
          }`}
        >
          <LayoutList size={16} />
          Standings
        </button>
      </div>

      {/* Contenido: Ronda */}
      {pestañaActiva === 'ronda' && (
        <>
          {!eventoActual && torneoSeleccionado && (
            <div className="surface p-4 text-center">
              <p className="text-neon-pink text-sm">No hay evento activo para este torneo</p>
            </div>
          )}

          {eventoActual && (
            <>
              <p className="text-xs text-muted mb-3 uppercase tracking-widest">
                Evento: <span className="font-semibold text-[color:var(--text-main)]">{eventoActual.fecha}</span>
              </p>

              <SelectorRonda
                rondas={rondas}
                rondaSeleccionada={rondaSeleccionada}
                setRonda={setRondaSeleccionada}
              />

              {matches.length === 0 ? (
                <div className="surface p-8 text-center">
                  <p className="text-muted">No hay matches para esta ronda</p>
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
        </>
      )}

      {/* Contenido: Standings */}
      {pestañaActiva === 'standings' && (
        <>
          {eventosStandings.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted mb-2 flex items-center gap-2 uppercase tracking-widest">
                <Calendar size={14} /> Evento
              </label>
              <div className="flex flex-wrap gap-2">
                {eventosStandings.map(e => (
                  <button
                    key={e.id}
                    onClick={() => {
                      setEventoSeleccionadoStandings(e.id)
                      cargarStandings(e.id)
                    }}
                    className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                      eventoSeleccionadoStandings === e.id
                        ? 'btn-neon-active'
                        : 'btn-neon'
                    }`}
                  >
                    {e.fecha}
                  </button>
                ))}
              </div>
            </div>
          )}

          {miPosicion && (
            <div className="surface-strong p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp size={24} className="text-neon" />
                  <div>
                    <p className="text-xs text-muted uppercase tracking-widest">Tu posición en este evento</p>
                    <p className="text-2xl font-bold text-neon">#{miPosicion.posicion}</p>
                    <p className="text-sm font-semibold text-[color:var(--text-main)]">{miPosicion.nombre}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {standings.length === 0 ? (
            <div className="surface p-8 text-center">
              <Trophy size={48} className="text-muted mx-auto mb-3" />
              <p className="text-muted">No hay standings disponibles para este evento</p>
            </div>
          ) : (
            <div className="surface overflow-hidden">
              <div className="px-4 py-3 bg-white/5 border-b border-[color:var(--border-neon-soft)] flex justify-between text-xs font-bold text-neon uppercase tracking-widest">
                <span className="w-12">Pos</span>
                <span className="flex-1">Jugador</span>
              </div>
              <div className="divide-y divide-[color:var(--border-neon-soft)]">
                {standings.map(s => (
                  <div
                    key={s.player_id}
                    className={`px-4 py-3 flex items-center transition-colors ${
                      miPosicion?.player_id === s.player_id
                        ? 'bg-[color:var(--neon-cyan)]/10 ring-1 ring-[color:var(--neon-cyan)]'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 w-12">
                      {getMedalla(s.posicion)}
                    </div>
                    <span className="flex-1 font-medium text-[color:var(--text-main)]">{s.nombre}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {eventosStandings.length === 0 && torneoSeleccionado && (
            <div className="surface p-8 text-center">
              <p className="text-muted">Este torneo no tiene eventos activos</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}