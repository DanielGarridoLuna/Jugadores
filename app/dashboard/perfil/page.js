'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { storage } from '@/utils/storage'
import { User, Edit2, Save, Phone, Calendar, Hash, LogOut, Trophy } from 'lucide-react'

export default function PerfilPage() {
  const router = useRouter()
  const playerId = storage.getItem('player_id')
  
  const [jugador, setJugador] = useState(null)
  const [editando, setEditando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [anio, setAnio] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  
  const [torneosPagadosMes, setTorneosPagadosMes] = useState(0)
  const [cargandoTorneos, setCargandoTorneos] = useState(true)

  useEffect(() => {
    if (playerId) {
      cargarPerfil()
      obtenerTorneosPagadosMes()
    } else {
      router.push('/')
    }
  }, [playerId])

  async function cargarPerfil() {
    const { data, error } = await supabase
      .from('jugadores')
      .select('*')
      .eq('player_id', playerId)
      .single()

    if (!error && data) {
      setJugador(data)
      setNombre(data.nombre)
      setTelefono(data.telefono || '')
      setAnio(data.anio_nacimiento || '')
    }
    setCargando(false)
  }

  async function obtenerTorneosPagadosMes() {
    setCargandoTorneos(true)
    
    const ahora = new Date()
    const año = ahora.getFullYear()
    const mes = ahora.getMonth() + 1
    
    const primerDia = `${año}-${String(mes).padStart(2, '0')}-01`
    const ultimoDia = new Date(año, mes, 0).toISOString().split('T')[0]
    
    const { data: jugadorData } = await supabase
      .from('jugadores')
      .select('id')
      .eq('player_id', playerId)
      .single()
    
    if (jugadorData) {
      const { count, error } = await supabase
        .from('inscripciones')
        .select('id', { count: 'exact', head: true })
        .eq('jugador_id', jugadorData.id)
        .eq('pagado', true)
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia)
      
      if (!error) {
        setTorneosPagadosMes(count || 0)
      }
    }
    
    setCargandoTorneos(false)
  }

  async function guardarCambios() {
    if (!nombre.trim()) {
      setMensaje('El nombre es obligatorio')
      setTimeout(() => setMensaje(null), 3000)
      return
    }

    setGuardando(true)
    const { error } = await supabase
      .from('jugadores')
      .update({
        nombre: nombre.trim(),
        telefono: telefono.replace(/\D/g, '') || null,
        anio_nacimiento: anio.replace(/\D/g, '') || null
      })
      .eq('player_id', playerId)

    if (!error) {
      setJugador(prev => ({ ...prev, nombre: nombre.trim(), telefono: telefono, anio_nacimiento: anio }))
      setEditando(false)
      setMensaje('Perfil actualizado correctamente')
      setTimeout(() => setMensaje(null), 3000)
    } else {
      setMensaje('Error al guardar cambios')
      setTimeout(() => setMensaje(null), 3000)
    }
    setGuardando(false)
  }

  const handleCerrarSesion = () => {
    storage.removeItem('player_id')
    storage.removeItem('jugador_nombre')
    storage.removeItem('torneo_seleccionado')
    router.push('/')
  }

  const torneosRestantes = 12 - torneosPagadosMes
  const esVip = torneosPagadosMes >= 12

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[color:var(--neon-cyan)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-neon">Mi Perfil</h1>
        {!editando && (
          <button
            onClick={() => setEditando(true)}
            className="btn-neon flex items-center gap-2"
          >
            <Edit2 size={16} /> Editar
          </button>
        )}
      </div>

      {mensaje && (
        <div className={`mb-4 p-3 rounded-lg text-center text-sm border ${
          mensaje.includes('correctamente')
            ? 'bg-green-500/10 text-green-400 border-green-500/40'
            : 'bg-red-500/10 text-red-400 border-red-500/40'
        }`}>
          {mensaje}
        </div>
      )}

      {!cargandoTorneos && (
        <div className={`mb-4 rounded-lg p-4 ${
          esVip
            ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-700/20 border border-yellow-500/60 shadow-[0_0_18px_rgba(234,179,8,0.4)]'
            : 'surface'
        }`}>
          <div className="flex items-center gap-3">
            <Trophy size={32} className={esVip ? 'text-yellow-400' : 'text-neon'} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-muted">
                Torneos de este mes
              </p>
              <p className={`text-3xl font-bold ${esVip ? 'text-yellow-400' : 'text-neon'}`}>
                {torneosPagadosMes} / 12
              </p>
            </div>
          </div>
          
          {esVip ? (
            <div className="mt-3 p-2 bg-white/5 rounded-lg border border-yellow-500/40">
              <p className="text-yellow-400 font-semibold text-sm text-center">
                ¡Felicidades! Has alcanzado la meta mensual.
              </p>
              <p className="text-yellow-400/80 text-xs text-center mt-1">
                Puedes solicitar acceso al grupo VIP contactando al administrador.
              </p>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-muted">
                Te faltan <span className="font-bold text-neon">{torneosRestantes}</span> torneos para llegar al grupo VIP.
              </p>
              <div className="mt-2 w-full bg-white/5 rounded-full h-2 border border-[color:var(--border-neon-soft)]">
                <div 
                  className="bg-[color:var(--neon-cyan)] h-full rounded-full transition-all duration-300 shadow-[0_0_10px_var(--neon-cyan)]"
                  style={{ width: `${(torneosPagadosMes / 12) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="surface overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-secondary p-6 flex justify-center">
          <div className="w-24 h-24 bg-[color:var(--bg-panel)] rounded-full flex items-center justify-center border border-[color:var(--border-neon)] shadow-[0_0_18px_rgba(0,229,255,0.4)]">
            <User size={48} className="text-neon" />
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="border-b border-[color:var(--border-neon-soft)] pb-3">
            <label className="flex items-center gap-2 text-xs text-muted mb-1 uppercase tracking-widest">
              <Hash size={14} /> Player ID
            </label>
            <p className="font-mono text-lg font-semibold text-[color:var(--text-main)]">{playerId}</p>
          </div>

          <div className="border-b border-[color:var(--border-neon-soft)] pb-3">
            <label className="flex items-center gap-2 text-xs text-muted mb-1 uppercase tracking-widest">
              <User size={14} /> Nombre completo
            </label>
            {editando ? (
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-white/5 border border-[color:var(--border-neon-soft)] rounded-lg p-2 text-[color:var(--text-main)] focus:outline-none focus:border-[color:var(--neon-cyan)] focus:shadow-[0_0_10px_rgba(0,229,255,0.4)]"
              />
            ) : (
              <p className="text-[color:var(--text-main)]">{jugador?.nombre}</p>
            )}
          </div>

          <div className="border-b border-[color:var(--border-neon-soft)] pb-3">
            <label className="flex items-center gap-2 text-xs text-muted mb-1 uppercase tracking-widest">
              <Phone size={14} /> Teléfono
            </label>
            {editando ? (
              <input
                type="tel"
                inputMode="numeric"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white/5 border border-[color:var(--border-neon-soft)] rounded-lg p-2 text-[color:var(--text-main)] focus:outline-none focus:border-[color:var(--neon-cyan)] focus:shadow-[0_0_10px_rgba(0,229,255,0.4)]"
              />
            ) : (
              <p className="text-[color:var(--text-main)]">{jugador?.telefono || 'No registrado'}</p>
            )}
          </div>

          <div className="pb-3">
            <label className="flex items-center gap-2 text-xs text-muted mb-1 uppercase tracking-widest">
              <Calendar size={14} /> Año de nacimiento
            </label>
            {editando ? (
              <input
                type="tel"
                inputMode="numeric"
                maxLength={4}
                value={anio}
                onChange={(e) => setAnio(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white/5 border border-[color:var(--border-neon-soft)] rounded-lg p-2 text-[color:var(--text-main)] focus:outline-none focus:border-[color:var(--neon-cyan)] focus:shadow-[0_0_10px_rgba(0,229,255,0.4)]"
              />
            ) : (
              <p className="text-[color:var(--text-main)]">{jugador?.anio_nacimiento || 'No registrado'}</p>
            )}
          </div>
        </div>
      </div>

      {editando ? (
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => {
              setEditando(false)
              setNombre(jugador?.nombre)
              setTelefono(jugador?.telefono || '')
              setAnio(jugador?.anio_nacimiento || '')
            }}
            className="flex-1 py-3 rounded-md font-semibold uppercase tracking-widest text-sm bg-white/5 text-[color:var(--text-main)] border border-[color:var(--border-neon-soft)] hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={guardarCambios}
            disabled={guardando}
            className="flex-1 py-3 rounded-md font-bold uppercase tracking-widest text-sm bg-[color:var(--neon-cyan)] text-[#05010F] border border-[color:var(--neon-cyan)] shadow-[0_0_18px_rgba(0,229,255,0.8)] hover:bg-[color:var(--neon-cyan)]/80 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save size={18} /> {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleCerrarSesion}
          className="w-full py-3 rounded-md font-bold uppercase tracking-widest text-sm bg-red-500/10 text-red-400 border border-red-500/40 hover:bg-red-500/20 hover:shadow-[0_0_14px_rgba(244,67,54,0.6)] transition-all flex items-center justify-center gap-2 mt-4"
        >
          <LogOut size={18} /> Cerrar Sesión
        </button>
      )}
    </div>
  )
}