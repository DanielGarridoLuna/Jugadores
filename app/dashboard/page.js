'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { storage } from '@/utils/storage'
import Image from 'next/image'
import { Calendar as CalendarIcon, Tag, FileText, Clock, DollarSign, Trophy, Skull, Crown, Rocket, ChevronLeft, ChevronRight } from 'lucide-react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale/es'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import ConfirmModal from '@/components/ConfirmModal'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: {
    es: es
  }
})

const carruselImagenes = [
  'https://zjcbsamqjuuhijqpugna.supabase.co/storage/v1/object/public/Carrusel/preventa%20(1200%20x%20600%20px)%20(900%20x%20500%20px)%20(800%20x%20400%20px).jpg.jpeg',
  'https://zjcbsamqjuuhijqpugna.supabase.co/storage/v1/object/public/Carrusel/1.jpg',
  'https://zjcbsamqjuuhijqpugna.supabase.co/storage/v1/object/public/Carrusel/2.jpg',
  'https://zjcbsamqjuuhijqpugna.supabase.co/storage/v1/object/public/Carrusel/3.jpg'
]

const calcularAlturaCalendario = (fecha) => {
  const año = fecha.getFullYear()
  const mes = fecha.getMonth()
  const primerDia = new Date(año, mes, 1)
  const ultimoDia = new Date(año, mes + 1, 0)

  const diaSemanaPrimero = (primerDia.getDay() + 6) % 7
  const totalDias = ultimoDia.getDate()
  const semanas = Math.ceil((diaSemanaPrimero + totalDias) / 7)

  return 100 + semanas * 80
}

export default function HomePage() {
  const [slideActual, setSlideActual] = useState(0)
  const [eventosCalendario, setEventosCalendario] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null)
  const [fechaCalendario, setFechaCalendario] = useState(new Date())
  const router = useRouter()
  const playerId = storage.getItem('player_id')

  const alturaCalendario = calcularAlturaCalendario(fechaCalendario)

  useEffect(() => {
    if (!playerId) {
      router.push('/')
      return
    }
    cargarEventos()
  }, [playerId])

  useEffect(() => {
    if (carruselImagenes.length === 0) return
    const intervalo = setInterval(() => {
      setSlideActual((prev) => (prev + 1) % carruselImagenes.length)
    }, 5000)
    return () => clearInterval(intervalo)
  }, [])

  async function cargarEventos() {
    setCargando(true)

    const fechaHoy = new Date().toISOString().split('T')[0]
    const { data: proximos } = await supabase
      .from('eventos_promocionales')
      .select('*')
      .eq('activo', true)
      .gte('fecha', fechaHoy)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true })

    if (proximos) {
      const eventos = proximos.map((evento) => {
        const fecha = new Date(evento.fecha + 'T00:00:00-06:00')
        if (evento.hora) {
          const [hora, minutos] = evento.hora.split(':')
          fecha.setHours(parseInt(hora), parseInt(minutos))
        }
        return {
          id: evento.id,
          title: evento.titulo,
          start: fecha,
          end: new Date(fecha.getTime() + 60 * 60 * 1000),
          desc: evento.descripcion || '',
          categoria: evento.categoria || 'Evento',
          fecha_original: evento.fecha,
          hora_original: evento.hora,
          precio: evento.precio || 0,
          imagen_url: evento.imagen_url || '',
          enlace: evento.enlace || ''
        }
      })
      setEventosCalendario(eventos)
    }

    setCargando(false)
  }

  const handleSelectEvent = (event) => {
    setEventoSeleccionado(event)
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setEventoSeleccionado(null)
  }

  const handleNavigate = (date) => {
    setFechaCalendario(date)
  }

  const irAlSlide = (index) => {
    setSlideActual(index)
  }

  const slideAnterior = () => {
    setSlideActual((prev) => (prev === 0 ? carruselImagenes.length - 1 : prev - 1))
  }

  const slideSiguiente = () => {
    setSlideActual((prev) => (prev + 1) % carruselImagenes.length)
  }

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return ''
    const partes = fechaStr.split('-')
    if (partes.length !== 3) return fechaStr
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${parseInt(partes[2])} ${meses[parseInt(partes[1]) - 1]} ${partes[0]}`
  }

  const formatearHora = (horaStr) => {
    if (!horaStr) return ''
    const partes = horaStr.split(':')
    if (partes.length < 2) return horaStr
    const hora = parseInt(partes[0])
    const minutos = partes[1]
    const ampm = hora >= 12 ? 'PM' : 'AM'
    const hora12 = hora % 12 || 12
    return `${hora12}:${minutos} ${ampm}`
  }

  const getEventColor = (categoria) => {
    const colors = {
      'League': '#4169E1',
      'Pokéween': '#FF6B35',
      'Cup': '#DC2626',
      'Pre-release': '#22C55E'
    }
    return colors[categoria] || '#4169E1'
  }

  const getEventIcon = (categoria) => {
    const icons = {
      'League': Trophy,
      'Pokéween': Skull,
      'Cup': Crown,
      'Pre-release': Rocket
    }
    return icons[categoria] || Trophy
  }

  const EventComponent = ({ event }) => {
    const IconComponent = getEventIcon(event.categoria)
    return (
      <div 
        className="text-xs p-1 truncate rounded flex items-center justify-center"
        style={{ 
          backgroundColor: getEventColor(event.categoria),
          color: 'white'
        }}
      >
        <IconComponent size={14} />
      </div>
    )
  }

 const CustomToolbar = ({ onNavigate, label }) => {
  const [mes, anio] = label.split(' ')

  return (
    <div className="flex flex-col items-center gap-3 mb-4">
      <div className="text-center">
        <span className="font-semibold text-lg text-neon uppercase tracking-widest block">
          {mes}
        </span>
        <span className="text-sm text-muted tracking-widest">
          {anio}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('PREV')}
          className="px-4 py-2 btn-neon rounded-md flex items-center gap-1"
        >
          <ChevronLeft size={16} />
          Anterior
        </button>
        <button
          onClick={() => onNavigate('NEXT')}
          className="px-4 py-2 btn-neon rounded-md flex items-center gap-1"
        >
          Siguiente
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[color:var(--neon-cyan)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-6">
      <div className="relative surface-strong overflow-hidden mb-6">
        <div className="relative h-48 md:h-64 w-full">
          {carruselImagenes.map((url, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-700 ${
                index === slideActual ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src={url}
                alt={`Carrusel ${index + 1}`}
                fill
                className="object-cover"
                priority={index === 0}
              />
            </div>
          ))}
        </div>

        {carruselImagenes.length > 1 && (
          <>
            <button
              onClick={slideAnterior}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={slideSiguiente}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {carruselImagenes.map((_, index) => (
                <button
                  key={index}
                  onClick={() => irAlSlide(index)}
                  className={`w-2 h-2 rounded-full transition ${
                    index === slideActual ? 'bg-white w-6' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="surface p-4">
        <h2 className="text-lg font-bold text-neon mb-3 flex items-center gap-2 uppercase tracking-widest">
          <CalendarIcon size={20} className="text-neon" />
          <span>Calendario de Eventos</span>
        </h2>

        {eventosCalendario.length === 0 ? (
          <p className="text-muted text-center py-4">No hay eventos próximos</p>
        ) : (
          <div style={{ height: `${alturaCalendario}px` }}>
            <Calendar
              localizer={localizer}
              culture="es"
              events={eventosCalendario}
              startAccessor="start"
              endAccessor="end"
              date={fechaCalendario}
              onSelectEvent={handleSelectEvent}
              onNavigate={handleNavigate}
              components={{
                event: EventComponent,
                toolbar: CustomToolbar
              }}
              messages={{
                next: 'Siguiente',
                previous: 'Anterior',
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
                day: 'Día',
                agenda: 'Agenda',
                date: 'Fecha',
                time: 'Hora',
                event: 'Evento',
              }}
              defaultView="month"
              views={['month']}
              style={{ height: '100%' }}
              className="custom-calendar"
            />
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={modalAbierto}
        onClose={cerrarModal}
        onConfirm={cerrarModal}
        title={eventoSeleccionado?.title || 'Detalles del Evento'}
        message={
          eventoSeleccionado ? (
            <div className="text-left space-y-2">
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-neon" />
                <span className="font-semibold">Fecha:</span>
                <span>{formatearFecha(eventoSeleccionado.fecha_original)}</span>
              </div>
              {eventoSeleccionado.hora_original && (
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-neon" />
                  <span className="font-semibold">Hora:</span>
                  <span>{formatearHora(eventoSeleccionado.hora_original)}</span>
                </div>
              )}
              {eventoSeleccionado.categoria && (
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-neon" />
                  <span className="font-semibold">Categoría:</span>
                  <span>{eventoSeleccionado.categoria}</span>
                </div>
              )}
              {eventoSeleccionado.desc && (
                <div className="flex items-start gap-2">
                  <FileText size={16} className="text-neon mt-0.5" />
                  <span className="font-semibold">Descripción:</span>
                  <span className="flex-1">{eventoSeleccionado.desc}</span>
                </div>
              )}
              {eventoSeleccionado.precio > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-neon" />
                  <span className="font-semibold">Precio:</span>
                  <span>${eventoSeleccionado.precio}</span>
                </div>
              )}
            </div>
          ) : ''
        }
        type="blue"
        confirmText="Cerrar"
        showCancel={false}
      />
    </div>
  )
}