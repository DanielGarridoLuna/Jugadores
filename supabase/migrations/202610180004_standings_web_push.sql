-- Ejecutar completo en SQL Editor. Reutiliza Vault y la Edge Function existente.
BEGIN;

CREATE OR REPLACE FUNCTION public.notify_standing_web_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.player_id IS NULL OR NEW.evento_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Guardar exactamente la misma clasificación no produce otro aviso.
  IF TG_OP = 'UPDATE' THEN
    IF NEW.posicion IS NOT DISTINCT FROM OLD.posicion
       AND NEW.player_id IS NOT DISTINCT FROM OLD.player_id
       AND NEW.evento_id IS NOT DISTINCT FROM OLD.evento_id THEN
      RETURN NEW;
    END IF;
  END IF;

  -- No avisar por cargas de eventos archivados ni por jugadores sin suscripción.
  IF NOT EXISTS (
    SELECT 1 FROM public.eventos e
    WHERE e.id = NEW.evento_id AND e.archivado IS NOT TRUE
  ) OR NOT EXISTS (
    SELECT 1 FROM public.web_push_subscriptions s
    WHERE s.player_id = NEW.player_id::text
  ) THEN
    RETURN NEW;
  END IF;

  -- Un destinatario por fila: una carga con N jugadores no manda N avisos a cada uno.
  PERFORM public.queue_tournament_web_push(jsonb_build_object(
    'player_ids', ARRAY[NEW.player_id::text],
    'title', CASE WHEN TG_OP = 'INSERT' THEN 'Clasificación publicada' ELSE 'Clasificación actualizada' END,
    'body', 'Ya puedes consultar los standings de tu torneo en la app.',
    'tag', 'standings-' || NEW.evento_id::text
  ));

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Un fallo del aviso no debe impedir guardar la clasificación.
  RAISE WARNING 'No se pudo encolar el aviso de standings: %', SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_standing_web_push()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS standing_web_push ON public.standings;
CREATE TRIGGER standing_web_push
AFTER INSERT OR UPDATE ON public.standings
FOR EACH ROW EXECUTE FUNCTION public.notify_standing_web_push();

COMMIT;
