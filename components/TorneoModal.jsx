'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { storage } from '@/utils/storage'
import { getMexicoDateInputValue } from '@/utils/date'
import { obtenerEventoActual, crearEventoSiNoExiste } from '@/utils/evento'
import { X } from 'lucide-react'
import ConfirmModal from './ConfirmModal'

export default function TorneoModal({ isOpen, onClose }) {
  const [torneos, setTorneos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [inscripciones, setInscripciones] = useState({})
  const [inscribiendo, setInscribiendo] = useState(null)
  const [mensajeModal, setMensajeModal] = useState(null)
  const playerId = storage.getItem('player_id')

  useEffect(() => {
    if (isOpen && playerId) {
      cargarTorneos()
    }
  }, [isOpen, playerId])

  useEffect(() => {
    if (!isOpen) {
      setMensajeModal(null)
    }
  }, [isOpen])

  async function cargarTorneos() {
    setCargando(true)
    setMensajeModal(null)
    
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
    setMensajeModal(null)
    
    try {
      const { data: jugador } = await supabase
        .from('jugadores')
        .select('id')
        .eq('player_id', playerId)
        .single()
      
      if (!jugador) {
        setMensajeModal({
          type: 'danger',
          title: 'Error',
          message: 'Jugador no encontrado'
        })
        setInscribiendo(null)
        return
      }
      
      const fechaHoy = getMexicoDateInputValue()
      
      const { data: yaInscritoHoy } = await supabase
        .from('inscripciones')
        .select('id')
        .eq('jugador_id', jugador.id)
        .eq('torneo_id', torneoId)
        .eq('fecha', fechaHoy)
        .maybeSingle()
      
      if (yaInscritoHoy) {
        setMensajeModal({
          type: 'info',
          title: 'Ya inscrito',
          message: 'Ya estás inscrito en este torneo para hoy'
        })
        setInscripciones(prev => ({ ...prev, [torneoId]: true }))
        setInscribiendo(null)
        return
      }
      
      let eventoActual = await obtenerEventoActual(torneoId)
      
      if (!eventoActual) {
        eventoActual = await crearEventoSiNoExiste(torneoId)
        
        if (!eventoActual) {
          setMensajeModal({
            type: 'danger',
            title: 'Error',
            message: 'Error al inscribir'
          })
          setInscribiendo(null)
          return
        }
      }
      
      const { data: estado } = await supabase
        .from('torneo_estado')
        .select('registro_abierto')
        .single()
      
      const late = !estado?.registro_abierto
      
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
          setMensajeModal({
            type: 'info',
            title: 'Ya inscrito',
            message: 'Ya estás inscrito en este torneo'
          })
          setInscripciones(prev => ({ ...prev, [torneoId]: true }))
        } else {
          console.error('Error al inscribir:', error)
          setMensajeModal({
            type: 'danger',
            title: 'Error',
            message: 'Error al inscribir'
          })
        }
        setInscribiendo(null)
        return
      }
      
      setInscripciones(prev => ({ ...prev, [torneoId]: true }))
      setMensajeModal({
        type: 'success',
        title: '¡Inscripción exitosa!',
        message: `Te has inscrito a ${torneoNombre} correctamente`
      })
      
      setTimeout(() => cargarTorneos(), 1500)
      
    } catch (error) {
      console.error(error)
      setMensajeModal({
        type: 'danger',
        title: 'Error',
        message: 'Ocurrió un error al inscribir'
      })
    } finally {
      setInscribiendo(null)
    }
  }

  const cerrarMensajeModal = () => {
    setMensajeModal(null)
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
          onClick={onClose}
        />
        
        <div className="surface-strong relative max-w-md w-full max-h-[85vh] z-10 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[color:var(--border-neon-soft)]">
            <h2 className="text-lg font-bold text-neon uppercase tracking-widest">
              Inscribirse a Torneo
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-white/10 transition-colors text-muted hover:text-neon"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Contenido */}
          <div className="p-4 overflow-y-auto">
            {cargando ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-[color:var(--neon-cyan)] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : torneos.length === 0 ? (
              <div className="bg-white/5 border border-[color:var(--border-neon-soft)] rounded-lg p-8 text-center">
                <p className="text-muted">No hay torneos activos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {torneos.map(t => {
                  const inscrito = inscripciones[t.id]
                  return (
                    <div key={t.id} className="bg-white/5 border border-[color:var(--border-neon-soft)] rounded-lg p-4">
                      <h3 className="font-bold text-[color:var(--text-main)]">{t.nombre}</h3>
                      {t.descripcion && (
                        <p className="text-muted text-sm mt-1">{t.descripcion}</p>
                      )}
                      
                      {inscrito === true ? (
                        <div className="mt-3 bg-green-500/10 text-green-400 border border-green-500/40 px-4 py-2 rounded-md text-xs text-center uppercase tracking-widest font-bold shadow-[0_0_10px_rgba(34,197,94,0.4)]">
                          Ya inscrito
                        </div>
                      ) : (
                        <button
                          onClick={() => inscribir(t.id, t.nombre)}
                          disabled={inscribiendo === t.id}
                          className="mt-3 w-full py-2 rounded-md text-xs font-bold uppercase tracking-widest bg-[color:var(--secondary)] text-white border border-[color:var(--neon-violet)] shadow-[0_0_14px_rgba(124,77,255,0.6)] hover:shadow-[0_0_20px_rgba(124,77,255,0.9)] transition-all disabled:opacity-50"
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
        </div>
      </div>

      {/* Modal de mensaje (ConfirmModal) */}
      {mensajeModal && (
        <ConfirmModal
          isOpen={true}
          onClose={cerrarMensajeModal}
          onConfirm={cerrarMensajeModal}
          title={mensajeModal.title}
          message={mensajeModal.message}
          type={mensajeModal.type === 'success' ? 'success' : mensajeModal.type === 'danger' ? 'danger' : 'blue'}
          confirmText="Entendido"
          showCancel={false}
        />
      )}
    </>
  )
}