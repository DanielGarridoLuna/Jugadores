import './globals.css'

export const metadata = {
  title: 'Torneos App - Jugadores',
  description: 'Plataforma para jugadores de torneos',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: 'yes',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-primary">
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}