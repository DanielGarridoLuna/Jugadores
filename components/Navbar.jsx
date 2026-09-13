'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Trophy, Swords, User, Home, PlusCircle } from 'lucide-react'
import { useState } from 'react'
import TorneoModal from './TorneoModal'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/dashboard/price-wall', icon: Trophy, label: 'Price Wall' },
  { href: '/dashboard/torneo', icon: Swords, label: 'Torneo' },
  { href: '/dashboard/perfil', icon: User, label: 'Perfil' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [showModal, setShowModal] = useState(false)

  const itemsIzquierda = navItems.slice(0, 2)
  const itemsDerecha = navItems.slice(2)

  const isActiveLink = (href) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname === href
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[color:var(--border-neon)] bg-[color:var(--bg-panel)]/90 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,229,255,0.25)]">
        <div className="max-w-md mx-auto">
          <div className="flex justify-around items-center py-2 relative">
            {itemsIzquierda.map((item) => {
              const isActive = isActiveLink(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all ${
                    isActive
                      ? 'text-neon'
                      : 'text-muted hover:text-[color:var(--neon-cyan)]'
                  }`}
                >
                  <Icon
                    size={24}
                    strokeWidth={isActive ? 2.5 : 2}
                    style={isActive ? { filter: 'drop-shadow(0 0 6px var(--neon-cyan))' } : undefined}
                  />
                  <span className="text-xs mt-1 tracking-widest uppercase">{item.label}</span>
                </Link>
              )
            })}

            <button
              onClick={() => setShowModal(true)}
              className="flex flex-col items-center py-1 px-3 rounded-lg transition-all group"
            >
              <PlusCircle
                size={24}
                strokeWidth={2.5}
                className="text-neon-pink group-hover:scale-110 transition-transform"
                style={{ filter: 'drop-shadow(0 0 8px var(--neon-pink))' }}
              />
              <span className="text-xs mt-1 text-neon-pink font-semibold tracking-widest uppercase">
                Inscribirse
              </span>
            </button>

            {itemsDerecha.map((item) => {
              const isActive = isActiveLink(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all ${
                    isActive
                      ? 'text-neon'
                      : 'text-muted hover:text-[color:var(--neon-cyan)]'
                  }`}
                >
                  <Icon
                    size={24}
                    strokeWidth={isActive ? 2.5 : 2}
                    style={isActive ? { filter: 'drop-shadow(0 0 6px var(--neon-cyan))' } : undefined}
                  />
                  <span className="text-xs mt-1 tracking-widest uppercase">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      <TorneoModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  )
}