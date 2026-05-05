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
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Mi Perfil</h1>
        {!editando && (
          <button
            onClick={() => setEditando(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm"
          >
            <Edit2 size={16} /> Editar
          </button>
        )}
      </div>

      {mensaje && (
        <div className={`mb-4 p-3 rounded-xl text-center ${
          mensaje.includes('correctamente') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {mensaje}
        </div>
      )}

      {!cargandoTorneos && (
        <div className={`mb-4 rounded-xl p-4 shadow-md ${esVip ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-primary/20 to-secondary/20'}`}>
          <div className="flex items-center gap-3">
            <Trophy size={32} className={esVip ? 'text-white' : 'text-primary'} />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${esVip ? 'text-white' : 'text-gray-600'}`}>
                Torneos de este mes
              </p>
              <p className={`text-3xl font-bold ${esVip ? 'text-white' : 'text-primary'}`}>
                {torneosPagadosMes} / 12
              </p>
            </div>
          </div>
          
          {esVip ? (
            <div className="mt-3 p-2 bg-white/20 rounded-lg">
              <p className="text-white font-semibold text-sm text-center">
                🎉 ¡Felicidades! Has alcanzado la meta mensual.
              </p>
              <p className="text-white/90 text-xs text-center mt-1">
                Puedes solicitar acceso al grupo VIP contactando al administrador.
              </p>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-gray-600">
                Te faltan <span className="font-bold text-primary">{torneosRestantes}</span> torneos para llegar al grupo VIP.
              </p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(torneosPagadosMes / 12) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-secondary p-6 flex justify-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
            <User size={48} className="text-primary" />
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <label className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Hash size={14} /> Player ID
            </label>
            <p className="font-mono text-lg font-semibold text-gray-800">{playerId}</p>
          </div>

          <div className="border-b border-gray-100 pb-3">
            <label className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <User size={14} /> Nombre completo
            </label>
            {editando ? (
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-primary"
              />
            ) : (
              <p className="text-gray-800">{jugador?.nombre}</p>
            )}
          </div>

          <div className="border-b border-gray-100 pb-3">
            <label className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Phone size={14} /> Teléfono
            </label>
            {editando ? (
              <input
                type="tel"
                inputMode="numeric"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-primary"
              />
            ) : (
              <p className="text-gray-800">{jugador?.telefono || 'No registrado'}</p>
            )}
          </div>

          <div className="pb-3">
            <label className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Calendar size={14} /> Año de nacimiento
            </label>
            {editando ? (
              <input
                type="tel"
                inputMode="numeric"
                maxLength={4}
                value={anio}
                onChange={(e) => setAnio(e.target.value.replace(/\D/g, ''))}
                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-primary"
              />
            ) : (
              <p className="text-gray-800">{jugador?.anio_nacimiento || 'No registrado'}</p>
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
            className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-xl font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={guardarCambios}
            disabled={guardando}
            className="flex-1 bg-primary text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Save size={18} /> {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleCerrarSesion}
          className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 mt-4"
        >
          <LogOut size={18} /> Cerrar Sesión
        </button>
      )}
    </div>
  )
}