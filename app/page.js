'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { storage } from '@/utils/storage'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const [identificador, setIdentificador] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const playerId = storage.getItem('player_id')
    if (playerId) {
      router.push('/dashboard')
    }
  }, [router])

  const buscarJugador = async () => {
    const valor = identificador.trim()
    if (!valor) {
      setError('Ingresa tu Player ID o número de teléfono')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('jugadores')
        .select('player_id, nombre, telefono')
        .or(`player_id.eq.${valor},telefono.eq.${valor}`)

      if (error) throw error

      if (data && data.length > 0) {
        const jugador = data[0]
        storage.setItem('player_id', jugador.player_id)
        storage.setItem('jugador_nombre', jugador.nombre)
        router.push('/dashboard')
      } else {
        setError('Jugador no encontrado')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Ocurrió un error al buscar el jugador')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-5 py-10 bg-primary">
      <div className="items-center mb-10">
        <div className="flex justify-center">
          <div className="w-40 h-40   flex items-center justify-center ">
            <Image
              src="/logo.png"
              alt="Logo Torneos"
              width={160}
              height={160}
              className="object-cover"
              priority
            />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white text-center">Sistema de torneos</h1>
      </div>

      <div className="px-5">
        <p className="text-white text-center font-medium mb-3">Player ID o Teléfono</p>

        <input
          type="tel"
          inputMode="numeric"
          placeholder="Ej: 12345 o 5551234567"
          className="w-full text-center bg-white rounded-xl px-4 py-3 text-base text-gray-800 placeholder-gray-400 border-0 focus:outline-none focus:ring-2 focus:ring-secondary"
          value={identificador}
          onChange={(e) => setIdentificador(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && buscarJugador()}
        />

        {error && (
          <p className="text-yellow-200 text-sm text-center mt-3">{error}</p>
        )}

        <button
  onClick={buscarJugador}
  disabled={isLoading}
  className="w-full py-3 rounded-xl font-bold text-lg mt-5 disabled:opacity-50 transition active:scale-95"
  style={{ backgroundColor: '#4F15E0', color: 'white' }}
>
  {isLoading ? 'Buscando...' : 'Iniciar sesión'}
</button>

        <div className="mt-4 text-center">
          <Link href="/registro" className="text-white text-sm underline">
            ¿No tienes cuenta? Regístrate
          </Link>
        </div>
      </div>
    </div>
  )
}