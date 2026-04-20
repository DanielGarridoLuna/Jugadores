import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function SelectorRonda({ rondas, rondaSeleccionada, setRonda }) {
  if (!rondas || rondas.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 text-center">
        <p className="text-gray-500">No hay rondas disponibles</p>
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
    <div className="bg-white rounded-xl shadow-md p-4 mb-4">
      <div className="flex items-center justify-between">
        <button
          onClick={anterior}
          disabled={indexActual === 0}
          className="p-2 rounded-full disabled:opacity-30"
        >
          <ChevronLeft size={24} className="text-primary" />
        </button>

        <div className="text-center">
          <p className="text-xs text-gray-500">Ronda actual</p>
          <p className="text-2xl font-bold text-primary">
            {rondaActual?.numero_ronda || '?'}
          </p>
          {rondaActual?.status === 'finalizada' && (
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">Finalizada</span>
          )}
          {rondaActual?.status === 'activa' && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Activa</span>
          )}
        </div>

        <button
          onClick={siguiente}
          disabled={indexActual === rondas.length - 1}
          className="p-2 rounded-full disabled:opacity-30"
        >
          <ChevronRight size={24} className="text-primary" />
        </button>
      </div>

      <div className="flex justify-center gap-1 mt-3">
        {rondas.map((r, idx) => (
          <button
            key={r.id}
            onClick={() => setRonda(r.id)}
            className={`w-8 h-8 rounded-full text-xs font-semibold transition ${
              String(r.id) === String(rondaSeleccionada)
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {r.numero_ronda}
          </button>
        ))}
      </div>
    </div>
  )
}