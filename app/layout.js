import './globals.css'

export const metadata = {
  title: 'Torneos App - Jugadores',
  description: 'Plataforma para jugadores de torneos',
  applicationName: 'Torneos Aldebaran',
  appleWebApp: {
    capable: true,
    title: 'Torneos Aldebaran',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport = {
  themeColor: '#05010F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: 'yes',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}
