'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { storage } from '@/utils/storage'
import { User, Edit2, Save, Phone, Calendar, Hash, LogOut } from 'lucide-react'

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

  useEffect(() => {
    if (playerId) {
      cargarPerfil()
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
    router.push('/')
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