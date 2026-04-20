'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Trophy, Swords, LayoutList, User } from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: Trophy, label: 'Torneos' },
  { href: '/dashboard/ronda', icon: Swords, label: 'Ronda' },
  { href: '/dashboard/standings', icon: LayoutList, label: 'Standings' },
  { href: '/dashboard/perfil', icon: User, label: 'Perfil' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-md mx-auto">
        <div className="flex justify-around items-center py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
                  isActive ? 'text-primary' : 'text-gray-400'
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}