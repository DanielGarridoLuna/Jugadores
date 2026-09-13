'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { storage } from '@/utils/storage'
import { Ticket, ArrowUp, ArrowDown } from 'lucide-react'
import Image from 'next/image'
import ConfirmModal from '@/components/ConfirmModal'

export default function PriceWallPage() {
  const router = useRouter()
  const playerId = storage.getItem('player_id')

  const [premios, setPremios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [orden, setOrden] = useState('desc')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [premioSeleccionado, setPremioSeleccionado] = useState(null)

  useEffect(() => {
    if (!playerId) {
      router.push('/')
      return
    }
    cargarPremios()
  }, [playerId, orden])

  async function cargarPremios() {
    setCargando(true)
    const { data, error } = await supabase
      .from('premios')
      .select('*')
      .eq('activo', true)
      .order('tickets', { ascending: orden === 'asc' })

    if (!error && data) {
      setPremios(data)
    }
    setCargando(false)
  }

  const abrirModal = (premio) => {
    setPremioSeleccionado(premio)
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setPremioSeleccionado(null)
  }

  return (
    <div className="p-4 pb-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-neon mb-2">Muro de Premios</h1>
        <p className="text-muted text-sm mb-4">Canjea tus tickets por increíbles premios</p>

        {/* Toggle orden */}
        <div className="flex gap-2">
          <button
            onClick={() => setOrden('desc')}
            className={`flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              orden === 'desc' ? 'btn-neon-active' : 'btn-neon'
            }`}
          >
            <ArrowDown size={14} />
            Mayor
          </button>
          <button
            onClick={() => setOrden('asc')}
            className={`flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              orden === 'asc' ? 'btn-neon-active' : 'btn-neon'
            }`}
          >
            <ArrowUp size={14} />
            Menor
          </button>
        </div>
      </div>

      {/* Grid de premios */}
      {cargando ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[color:var(--neon-cyan)] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : premios.length === 0 ? (
        <div className="surface p-8 text-center">
          <p className="text-muted">No hay premios disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {premios.map((premio) => {
            const agotado = premio.stock <= 0
            return (
              <div key={premio.id} className="surface p-3 flex flex-col">
                {/* Imagen */}
                <button
                  onClick={() => abrirModal(premio)}
                  className="relative w-full aspect-square rounded-md overflow-hidden mb-2 group"
                >
                  {premio.imagen_url ? (
                    <Image
                      src={premio.imagen_url}
                      alt={premio.nombre}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-[color:var(--bg-panel-2)] flex items-center justify-center">
                      <Ticket size={32} className="text-muted" />
                    </div>
                  )}

                  {/* Overlay agotado */}
                  {agotado && (
                    <>
                      <div className="absolute inset-0 bg-black/70" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-neon-pink font-bold text-xs tracking-widest uppercase border border-[color:var(--neon-pink)] px-2 py-1 rounded">
                          Agotado
                        </span>
                      </div>
                    </>
                  )}
                </button>

                {/* Nombre */}
                <h3 className="font-bold text-sm text-[color:var(--text-main)] truncate mb-1">
                  {premio.nombre}
                </h3>

                {/* Tickets */}
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Ticket size={14} className="text-yellow-500" />
                  <span className="text-xs font-semibold text-yellow-500">
                    {premio.tickets} tickets
                  </span>
                </div>

                {/* Stock */}
                <p className={`text-[11px] ${agotado ? 'text-neon-pink' : 'text-muted'}`}>
                  {agotado ? 'Agotado' : `${premio.stock} disponibles`}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de detalle */}
      <ConfirmModal
        isOpen={modalAbierto}
        onClose={cerrarModal}
        onConfirm={cerrarModal}
        title={premioSeleccionado?.nombre || 'Premio'}
        message={
          premioSeleccionado ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-full aspect-square rounded-md overflow-hidden">
                {premioSeleccionado.imagen_url ? (
                  <Image
                    src={premioSeleccionado.imagen_url}
                    alt={premioSeleccionado.nombre}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 90vw, 400px"
                  />
                ) : (
                  <div className="w-full h-full bg-[color:var(--bg-panel-2)] flex items-center justify-center">
                    <Ticket size={48} className="text-muted" />
                  </div>
                )}

                {premioSeleccionado.stock <= 0 && (
                  <>
                    <div className="absolute inset-0 bg-black/70" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-neon-pink font-bold text-sm tracking-widest uppercase border border-[color:var(--neon-pink)] px-3 py-1.5 rounded">
                        Agotado
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Ticket size={16} className="text-yellow-500" />
                <span className="text-sm font-semibold text-yellow-500">
                  {premioSeleccionado.tickets} tickets
                </span>
              </div>

              <p className={`text-xs ${premioSeleccionado.stock <= 0 ? 'text-neon-pink' : 'text-muted'}`}>
                {premioSeleccionado.stock <= 0
                  ? 'Agotado'
                  : `${premioSeleccionado.stock} disponibles`}
              </p>
            </div>
          ) : ''
        }
        type="blue"
        confirmText="Cerrar"
        showCancel={false}
      />
    </div>
  )
}