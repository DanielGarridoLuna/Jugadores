export default function manifest() {
  return {
    id: '/',
    name: 'Torneos Aldebaran - Jugadores',
    short_name: 'Aldebaran',
    description: 'Consulta tus torneos, rondas y resultados en Aldebaran.',
    lang: 'es',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#05010F',
    theme_color: '#05010F',
    icons: [
      { src: '/icons/icon-192.png?v=3', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png?v=3', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png?v=3', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
