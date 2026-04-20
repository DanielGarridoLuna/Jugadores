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
    if (match.confirmado) return 'bg-green-100 text-green-700 border-green-200'
    if (match.estado === 'conflicto') return 'bg-red-100 text-red-700 border-red-200'
    if (match.estado === 'esperando') return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-gray-100 text-gray-600 border-gray-200'
  }

  const getEstadoIcon = () => {
    if (match.confirmado) return <Trophy size={14} />
    if (match.estado === 'conflicto') return <AlertCircle size={14} />
    if (match.estado === 'esperando') return <Users size={14} />
    return <Swords size={14} />
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-b">
        <span className="font-bold text-gray-700">Mesa {match.mesa || '?'}</span>
        <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${getEstadoColor()}`}>
          {getEstadoIcon()}
          {match.confirmado ? 'Confirmado' : match.estado === 'conflicto' ? 'Conflicto' : match.estado === 'esperando' ? 'Esperando' : 'Pendiente'}
        </span>
      </div>

      <div className="p-4">
        {/* Jugador 1 */}
        <div className={`text-center mb-2 ${match.ganador_final === j1 && !match.empate ? 'bg-green-50 rounded-lg py-2' : ''}`}>
          <p className="font-bold text-lg">{match.jugador1_nombre || 'Desconocido'}</p>
          <p className="text-xs text-gray-500">#{j1 || '-'}</p>
        </div>

        {/* VS */}
        {!esBye ? (
          <div className="flex justify-center items-center gap-2 my-2">
            <div className="h-px flex-1 bg-gray-200"></div>
            <Swords size={20} className="text-primary" />
            <div className="h-px flex-1 bg-gray-200"></div>
          </div>
        ) : (
          <div className="text-center my-2">
            <span className="text-xs bg-gray-200 px-3 py-1 rounded-full">BYE</span>
          </div>
        )}

        {/* Jugador 2 */}
        {!esBye && (
          <div className={`text-center mb-3 ${match.ganador_final === j2 && !match.empate ? 'bg-green-50 rounded-lg py-2' : ''}`}>
            <p className="font-bold text-lg">{match.jugador2_nombre || 'Desconocido'}</p>
            <p className="text-xs text-gray-500">#{j2 || '-'}</p>
          </div>
        )}

        {/* Empate */}
        {match.empate && match.confirmado && (
          <p className="text-center text-yellow-600 font-bold text-sm mb-2">Empate</p>
        )}

        {/* Botones de reporte */}
        {!esBye && puedeReportar && !bloqueado && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onReport(match, j1)}
              disabled={reportando}
              className="flex-1 bg-primary text-white py-2 rounded-lg font-semibold text-sm disabled:opacity-50"
            >
              {match.jugador1_nombre?.split(' ')[0] || 'J1'}
            </button>
            <button
              onClick={() => onReport(match, j2)}
              disabled={reportando}
              className="flex-1 bg-secondary text-white py-2 rounded-lg font-semibold text-sm disabled:opacity-50"
            >
              {match.jugador2_nombre?.split(' ')[0] || 'J2'}
            </button>
            <button
              onClick={() => onReport(match, 'empate')}
              disabled={reportando}
              className="px-4 bg-gray-500 text-white py-2 rounded-lg font-semibold text-sm disabled:opacity-50"
            >
              Empate
            </button>
          </div>
        )}

        {!esBye && !puedeReportar && (
          <p className="text-center text-xs text-gray-400 mt-2">No participas en este match</p>
        )}

        {!esBye && yaReporto && !match.confirmado && (
          <p className="text-center text-xs text-yellow-600 mt-2">Esperando confirmación del rival</p>
        )}

        {esBye && (
          <p className="text-center text-green-600 font-bold text-sm mt-2">
            Victoria automática para {match.jugador1_nombre}
          </p>
        )}

        {reportando && (
          <p className="text-center text-xs text-gray-500 mt-2">Guardando resultado...</p>
        )}
      </div>
    </div>
  )
}