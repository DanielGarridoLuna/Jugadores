'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function RegistroPage() {
  const [playerId, setPlayerId] = useState('')
  const [nombre, setNombre] = useState('')
  const [anio, setAnio] = useState('')
  const [telefono, setTelefono] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const validar = () => {
    if (!/^[0-9]+$/.test(playerId)) {
      setError('Player ID solo debe contener números')
      return false
    }
    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return false
    }
    if (telefono && !/^[0-9]+$/.test(telefono)) {
      setError('Teléfono solo debe contener números')
      return false
    }
    if (anio && (!/^[0-9]{4}$/.test(anio) || anio < 1900 || anio > new Date().getFullYear())) {
      setError('Año inválido (4 dígitos)')
      return false
    }
    return true
  }

  const registrar = async () => {
    if (!validar()) return

    setIsLoading(true)
    setError('')

    try {
      // Verificar si ya existe
      const { data: existe } = await supabase
        .from('jugadores')
        .select('id')
        .or(`player_id.eq.${playerId},telefono.eq.${telefono}`)
        .limit(1)

      if (existe && existe.length > 0) {
        setError('Ya existe un jugador con ese Player ID o teléfono')
        setIsLoading(false)
        return
      }

      // Registrar jugador
      const { data: jugador, error: insertError } = await supabase
        .from('jugadores')
        .insert({
          player_id: playerId,
          nombre: nombre.trim(),
          anio_nacimiento: anio || null,
          telefono: telefono || null
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (jugador) {
        localStorage.setItem('player_id', jugador.player_id)
        localStorage.setItem('jugador_nombre', jugador.nombre)
        router.push('/dashboard')
      }
    } catch (error) {
      console.log(error)
      setError('Error al registrar jugador')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      {/* Header */}
      <div className="p-4">
        <Link href="/" className="inline-flex items-center gap-2 text-white">
          <ArrowLeft size={20} /> Volver
        </Link>
      </div>

      {/* Formulario */}
      <div className="flex-1 flex flex-col justify-center px-5 pb-20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Registro</h1>
          <p className="text-white/80 mt-2">Crea tu cuenta de jugador</p>
        </div>

        <div className="space-y-4">
          <input
            type="tel"
            inputMode="numeric"
            placeholder="Player ID *"
            className="w-full bg-white rounded-xl px-4 py-3 text-base text-gray-800 placeholder-gray-400"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value.replace(/\D/g, ''))}
          />

          <input
            type="text"
            placeholder="Nombre completo *"
            className="w-full bg-white rounded-xl px-4 py-3 text-base text-gray-800 placeholder-gray-400"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <input
            type="tel"
            inputMode="numeric"
            placeholder="Año de nacimiento (opcional)"
            maxLength={4}
            className="w-full bg-white rounded-xl px-4 py-3 text-base text-gray-800 placeholder-gray-400"
            value={anio}
            onChange={(e) => setAnio(e.target.value.replace(/\D/g, ''))}
          />

          <input
            type="tel"
            inputMode="numeric"
            placeholder="Teléfono (opcional)"
            className="w-full bg-white rounded-xl px-4 py-3 text-base text-gray-800 placeholder-gray-400"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
          />

          {error && (
            <p className="text-yellow-200 text-sm text-center">{error}</p>
          )}

          <button
            onClick={registrar}
            disabled={isLoading}
            className="w-full bg-secondary text-white py-3 rounded-xl font-bold text-lg mt-2 disabled:opacity-50 transition active:scale-95"
          >
            {isLoading ? 'Registrando...' : 'Registrarse'}
          </button>
        </div>
      </div>
    </div>
  )
}