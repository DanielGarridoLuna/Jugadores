// utils/evento.js
import { supabase } from '@/lib/supabase'

export async function obtenerEventoActual(torneo_id) {
  const { data } = await supabase
    .from('eventos')
    .select('*')
    .eq('torneo_id', torneo_id)
    .eq('archivado', false)
    .order('fecha', { ascending: false })
    .limit(1)

  return data?.[0] || null
}