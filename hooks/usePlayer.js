'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function usePlayer(playerId) {
  const [player, setPlayer] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!playerId) {
      setCargando(false);
      return;
    }

    async function cargarPlayer() {
      const { data, error } = await supabase
        .from('jugadores')
        .select('*')
        .eq('player_id', playerId)
        .single();

      if (!error && data) {
        setPlayer(data);
      }
      setCargando(false);
    }

    cargarPlayer();
  }, [playerId]);

  const actualizarPlayer = async (datos) => {
    const { error } = await supabase
      .from('jugadores')
      .update(datos)
      .eq('player_id', playerId);

    if (!error) {
      setPlayer(prev => ({ ...prev, ...datos }));
      return true;
    }
    return false;
  };

  return { player, cargando, actualizarPlayer };
}