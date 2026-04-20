'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { storage } from '@/utils/storage'

export default function DashboardLayout({ children }) {
  const [cargando, setCargando] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const playerId = storage.getItem('player_id')
    
    if (!playerId) {
      router.push('/')
    }
    setCargando(false)
  }, [router])

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <>
      <div className="pb-20 min-h-screen bg-gray-100">
        {children}
      </div>
      <Navbar />
    </>
  )
}