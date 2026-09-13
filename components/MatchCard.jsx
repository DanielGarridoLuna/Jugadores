'use client'

import { Swords, Trophy, Users, AlertCircle } from 'lucide-react'

const normalizarId = (valor) => {
  if (!valor || valor === 'null' || valor === 'undefined') return null
  return String(valor).trim()
}

export default function MatchCard({ match, onReport, userId, reportando = false, rondaFinalizada = false }) {
  const user = normalizarId(userId)
  const j1 = normalizarId(match.jugador1_id)
  const j2 = normalizarId(match.jugador2_id)
  const esBye = !j2

  const esJugador1 = user === j1
  const esJugador2 = user === j2
  const puedeReportar = esJugador1 || esJugador2
  const yaReporto = (esJugador1 && match.ganador_reportado_1) || (esJugador2 && match.ganador_reportado_2)
  const bloqueado = rondaFinalizada || yaReporto || match.confirmado

  const getEstadoColor = () => {
    if (match.confirmado) return 'bg-green-500/10 text-green-400 border-green-500/40'
    if (match.estado === 'conflicto') return 'bg-red-500/10 text-red-400 border-red-500/40'
    if (match.estado === 'esperando') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/40'
    return 'bg-white/5 text-muted border-[color:var(--border-neon-soft)]'
  }

  const getEstadoIcon = () => {
    if (match.confirmado) return <Trophy size={14} />
    if (match.estado === 'conflicto') return <AlertCircle size={14} />
    if (match.estado === 'esperando') return <Users size={14} />
    return <Swords size={14} />
  }

  const getBotonColor = (esGanador) => {
    if (match.confirmado && esGanador) {
      return 'bg-green-500 text-white border border-green-400 shadow-[0_0_14px_rgba(34,197,94,0.6)]'
    }
    if (match.estado === 'conflicto' && esGanador) {
      return 'border-2 border-red-500 text-red-400 bg-red-500/10'
    }
    if (esGanador) {
      return 'border-2 border-green-500 text-green-400 bg-green-500/10'
    }
    return 'bg-white/5 text-[color:var(--text-main)] border border-[color:var(--border-neon-soft)] hover:bg-white/10'
  }

  const getBotonEmpateColor = () => {
    if (match.empate && match.confirmado) {
      return 'bg-yellow-500 text-black border border-yellow-400 shadow-[0_0_14px_rgba(234,179,8,0.6)]'
    }
    if (match.estado === 'conflicto' && match.empate) {
      return 'border-2 border-red-500 text-red-400 bg-red-500/10'
    }
    if (match.empate) {
      return 'border-2 border-yellow-500 text-yellow-400 bg-yellow-500/10'
    }
    return 'bg-white/5 text-[color:var(--text-main)] border border-[color:var(--border-neon-soft)] hover:bg-white/10'
  }

  return (
    <div className="surface overflow-hidden">
      {/* Header */}
      <div className="bg-white/5 px-4 py-2 flex justify-between items-center border-b border-[color:var(--border-neon-soft)]">
        <span className="font-bold text-neon text-xs uppercase tracking-widest">
          Mesa {match.mesa || '?'}
        </span>
        <span className={`text-[10px] px-2 py-1 rounded-full flex items-center gap-1 border uppercase tracking-widest font-bold ${getEstadoColor()}`}>
          {getEstadoIcon()}
          {match.confirmado ? 'Confirmado' : match.estado === 'conflicto' ? 'Conflicto' : match.estado === 'esperando' ? 'Esperando' : 'Pendiente'}
        </span>
      </div>

      <div className="p-4">
        {/* Jugador 1 */}
        <div className={`text-center mb-2 rounded-lg py-2 ${
          match.ganador_final === j1 && !match.empate
            ? 'bg-green-500/10 border border-green-500/40 shadow-[0_0_10px_rgba(34,197,94,0.4)]'
            : ''
        }`}>
          <p className="font-bold text-lg text-[color:var(--text-main)]">
            {match.jugador1_nombre || 'Desconocido'}
          </p>
          <p className="text-xs text-muted font-mono">#{j1 || '-'}</p>
        </div>

        {/* VS */}
        {!esBye ? (
          <div className="flex justify-center items-center gap-2 my-2">
            <div className="h-px flex-1 bg-[color:var(--border-neon-soft)]"></div>
            <Swords size={20} className="text-neon" />
            <div className="h-px flex-1 bg-[color:var(--border-neon-soft)]"></div>
          </div>
        ) : (
          <div className="text-center my-2">
            <span className="text-[10px] bg-[color:var(--neon-cyan)]/10 text-neon border border-[color:var(--border-neon)] px-3 py-1 rounded-full uppercase tracking-widest font-bold">
              BYE
            </span>
          </div>
        )}

        {/* Jugador 2 */}
        {!esBye && (
          <div className={`text-center mb-3 rounded-lg py-2 ${
            match.ganador_final === j2 && !match.empate
              ? 'bg-green-500/10 border border-green-500/40 shadow-[0_0_10px_rgba(34,197,94,0.4)]'
              : ''
          }`}>
            <p className="font-bold text-lg text-[color:var(--text-main)]">
              {match.jugador2_nombre || 'Desconocido'}
            </p>
            <p className="text-xs text-muted font-mono">#{j2 || '-'}</p>
          </div>
        )}

        {/* Empate */}
        {match.empate && match.confirmado && (
          <p className="text-center text-yellow-400 font-bold text-sm mb-2 uppercase tracking-widest">
            Empate
          </p>
        )}

        {/* Botones de reporte */}
        {!esBye && puedeReportar && !bloqueado && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onReport(match, j1)}
              disabled={reportando}
              className={`flex-1 py-2 rounded-md font-bold text-xs uppercase tracking-widest disabled:opacity-50 transition-all ${getBotonColor(match.ganador_reportado_1 === j1 || match.ganador_final === j1)}`}
            >
              {match.jugador1_nombre?.split(' ')[0] || 'J1'}
            </button>
            <button
              onClick={() => onReport(match, j2)}
              disabled={reportando}
              className={`flex-1 py-2 rounded-md font-bold text-xs uppercase tracking-widest disabled:opacity-50 transition-all ${getBotonColor(match.ganador_reportado_2 === j2 || match.ganador_final === j2)}`}
            >
              {match.jugador2_nombre?.split(' ')[0] || 'J2'}
            </button>
            <button
              onClick={() => onReport(match, 'empate')}
              disabled={reportando}
              className={`px-4 py-2 rounded-md font-bold text-xs uppercase tracking-widest disabled:opacity-50 transition-all ${getBotonEmpateColor()}`}
            >
              Empate
            </button>
          </div>
        )}

        {!esBye && !puedeReportar && (
          <p className="text-center text-xs text-muted mt-2">No participas en este match</p>
        )}

        {!esBye && yaReporto && !match.confirmado && (
          <p className="text-center text-xs text-yellow-400 mt-2">Esperando confirmación del rival</p>
        )}

        {esBye && (
          <p className="text-center text-green-400 font-bold text-sm mt-2 uppercase tracking-widest">
            Victoria automática para {match.jugador1_nombre}
          </p>
        )}

        {reportando && (
          <p className="text-center text-xs text-muted mt-2">Guardando resultado...</p>
        )}
      </div>
    </div>
  )
}