import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function SelectorRonda({ rondas, rondaSeleccionada, setRonda }) {
  if (!rondas || rondas.length === 0) {
    return (
      <div className="surface p-4 text-center mb-4">
        <p className="text-muted">No hay rondas disponibles</p>
      </div>
    )
  }

  const rondaActual = rondas.find(r => String(r.id) === String(rondaSeleccionada))
  const indexActual = rondas.findIndex(r => String(r.id) === String(rondaSeleccionada))

  const siguiente = () => {
    if (indexActual < rondas.length - 1) {
      setRonda(rondas[indexActual + 1].id)
    }
  }

  const anterior = () => {
    if (indexActual > 0) {
      setRonda(rondas[indexActual - 1].id)
    }
  }

  return (
    <div className="surface p-4 mb-4">
      <div className="flex items-center justify-between">
        <button
          onClick={anterior}
          disabled={indexActual === 0}
          className="p-2 rounded-full disabled:opacity-30 text-neon hover:bg-white/5 transition-colors"
        >
          <ChevronLeft size={24} style={{ filter: 'drop-shadow(0 0 6px var(--neon-cyan))' }} />
        </button>

        <div className="text-center">
          <p className="text-[10px] text-muted uppercase tracking-widest">Ronda actual</p>
          <p className="text-2xl font-bold text-neon">
            {rondaActual?.numero_ronda || '?'}
          </p>
          {rondaActual?.status === 'finalizada' && (
            <span className="text-[10px] bg-white/5 text-muted border border-[color:var(--border-neon-soft)] px-2 py-0.5 rounded-full uppercase tracking-widest">
              Finalizada
            </span>
          )}
          {rondaActual?.status === 'activa' && (
            <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/40 px-2 py-0.5 rounded-full uppercase tracking-widest shadow-[0_0_8px_rgba(34,197,94,0.5)]">
              Activa
            </span>
          )}
        </div>

        <button
          onClick={siguiente}
          disabled={indexActual === rondas.length - 1}
          className="p-2 rounded-full disabled:opacity-30 text-neon hover:bg-white/5 transition-colors"
        >
          <ChevronRight size={24} style={{ filter: 'drop-shadow(0 0 6px var(--neon-cyan))' }} />
        </button>
      </div>

      <div className="flex justify-center gap-1 mt-3 flex-wrap">
        {rondas.map((r) => (
          <button
            key={r.id}
            onClick={() => setRonda(r.id)}
            className={`w-8 h-8 rounded-md text-xs font-bold transition-all ${
              String(r.id) === String(rondaSeleccionada)
                ? 'bg-[color:var(--neon-cyan)] text-[#05010F] shadow-[0_0_14px_var(--neon-cyan)]'
                : 'bg-white/5 text-muted border border-[color:var(--border-neon-soft)] hover:text-neon hover:border-[color:var(--border-neon)]'
            }`}
          >
            {r.numero_ronda}
          </button>
        ))}
      </div>
    </div>
  )
}