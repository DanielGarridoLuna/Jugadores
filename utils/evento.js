import { supabase } from '@/lib/supabase'

const ARCHIVE_KEY = "eventos_archivados_map"

function leerMapaArchivados() {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function guardarMapaArchivados(mapa) {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(mapa))
}

export function esEventoArchivado(eventoId) {
  const mapa = leerMapaArchivados()
  return Boolean(mapa[String(eventoId)])
}

export function resolverEventoArchivado(evento) {
  if (evento && typeof evento === "object" && "archivado" in evento) {
    return Boolean(evento.archivado)
  }
  return esEventoArchivado(evento?.id ?? evento)
}

export function esErrorDuplicado(error) {
  return error?.code === "23505"
}

export async function setEventoArchivado(eventoId, archivado) {
  const mapa = leerMapaArchivados()
  const key = String(eventoId)
  if (archivado) {
    mapa[key] = true
  } else {
    delete mapa[key]
  }
  guardarMapaArchivados(mapa)

  const { error } = await supabase
    .from("eventos")
    .update({ archivado })
    .eq("id", eventoId)

  if (error) {
    console.warn("No se pudo persistir archivado en BD, usando respaldo local.", error.message)
    return false
  }

  return true
}

export async function obtenerEventos(torneo_id, opciones = {}) {
  const { includeArchivados = false } = opciones
  const { data } = await supabase
    .from("eventos")
    .select("*")
    .eq("torneo_id", torneo_id)
    .order("fecha", { ascending: false })

  const lista = data || []
  if (includeArchivados) return lista
  return lista.filter(ev => !resolverEventoArchivado(ev))
}

export async function obtenerEventoActual(torneo_id) {
  const fechaActual = new Date().toLocaleDateString('en-CA')
  
  const { data } = await supabase
    .from("eventos")
    .select("*")
    .eq("torneo_id", torneo_id)
    .eq("fecha", fechaActual)
    .maybeSingle()
  
  // Si existe pero está archivado, lo desarchivamos
  if (data?.archivado) {
    await supabase
      .from("eventos")
      .update({ archivado: false })
      .eq("id", data.id)
    return { ...data, archivado: false }
  }
  
  return data || null
}

export async function crearEvento(torneo_id, fecha) {
  const { data, error } = await supabase
    .from("eventos")
    .insert({
      torneo_id,
      fecha
    })
    .select()
    .single()

  if (error) {
    if (esErrorDuplicado(error)) {
      throw new Error("Ya existe un evento para este torneo en esta fecha")
    }
    throw error
  }
  return data
}

export async function crearEventoSiNoExiste(torneo_id) {
  const fechaActual = new Date().toLocaleDateString('en-CA')
  
  // Buscar si ya existe algún evento para la fecha actual (archivado o no)
  const { data: eventoExistente } = await supabase
    .from("eventos")
    .select("*")
    .eq("torneo_id", torneo_id)
    .eq("fecha", fechaActual)
    .maybeSingle()
  
  if (eventoExistente) {
    // Si existe, pero está archivado, lo desarchivamos
    if (eventoExistente.archivado) {
      await supabase
        .from("eventos")
        .update({ archivado: false })
        .eq("id", eventoExistente.id)
      return { ...eventoExistente, archivado: false }
    }
    return eventoExistente
  }
  
  // Crear nuevo evento con la fecha actual
  return await crearEvento(torneo_id, fechaActual)
}