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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-neon hover:text-neon-pink transition-colors"
        >
          <ArrowLeft size={20} /> Volver
        </Link>
      </div>

      {/* Formulario */}
      <div className="flex-1 flex flex-col justify-center px-5 pb-20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neon uppercase tracking-widest">Registro</h1>
          <p className="text-muted mt-2">Crea tu cuenta de jugador</p>
        </div>

        <div className="space-y-4">
          <input
            type="tel"
            inputMode="numeric"
            placeholder="Player ID *"
            className="w-full bg-white/5 border border-[color:var(--border-neon-soft)] rounded-lg px-4 py-3 text-base text-[color:var(--text-main)] placeholder-[color:var(--text-muted)] focus:outline-none focus:border-[color:var(--neon-cyan)] focus:shadow-[0_0_14px_rgba(0,229,255,0.5)] transition-all"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value.replace(/\D/g, ''))}
          />

          <input
            type="text"
            placeholder="Nombre completo *"
            className="w-full bg-white/5 border border-[color:var(--border-neon-soft)] rounded-lg px-4 py-3 text-base text-[color:var(--text-main)] placeholder-[color:var(--text-muted)] focus:outline-none focus:border-[color:var(--neon-cyan)] focus:shadow-[0_0_14px_rgba(0,229,255,0.5)] transition-all"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <input
            type="tel"
            inputMode="numeric"
            placeholder="Año de nacimiento (opcional)"
            maxLength={4}
            className="w-full bg-white/5 border border-[color:var(--border-neon-soft)] rounded-lg px-4 py-3 text-base text-[color:var(--text-main)] placeholder-[color:var(--text-muted)] focus:outline-none focus:border-[color:var(--neon-cyan)] focus:shadow-[0_0_14px_rgba(0,229,255,0.5)] transition-all"
            value={anio}
            onChange={(e) => setAnio(e.target.value.replace(/\D/g, ''))}
          />

          <input
            type="tel"
            inputMode="numeric"
            placeholder="Teléfono (opcional)"
            className="w-full bg-white/5 border border-[color:var(--border-neon-soft)] rounded-lg px-4 py-3 text-base text-[color:var(--text-main)] placeholder-[color:var(--text-muted)] focus:outline-none focus:border-[color:var(--neon-cyan)] focus:shadow-[0_0_14px_rgba(0,229,255,0.5)] transition-all"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
          />

          {error && (
            <p className="text-neon-pink text-sm text-center">{error}</p>
          )}

          <button
            onClick={registrar}
            disabled={isLoading}
            className="w-full py-3 rounded-lg font-bold text-lg uppercase tracking-widest mt-2 bg-[color:var(--secondary)] text-white border border-[color:var(--neon-violet)] shadow-[0_0_18px_rgba(124,77,255,0.6)] hover:shadow-[0_0_24px_rgba(124,77,255,0.9)] transition-all disabled:opacity-50 active:scale-95"
          >
            {isLoading ? 'Registrando...' : 'Registrarse'}
          </button>
        </div>
      </div>
    </div>
  )
}