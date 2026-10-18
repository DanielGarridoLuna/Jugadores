-- Los secretos pwa_* se crean por separado en Vault, nunca en Secrets.
create extension if not exists pg_net with schema extensions;

create table if not exists public.web_push_subscriptions (
  id uuid primary key,
  player_id text not null,
  subscription jsonb not null,
  updated_at timestamptz not null default now(),
  last_test_at timestamptz
);
alter table public.web_push_subscriptions add column if not exists last_test_at timestamptz;
create unique index if not exists web_push_endpoint_unique on public.web_push_subscriptions ((subscription ->> 'endpoint'));
alter table public.web_push_subscriptions enable row level security;
revoke all on public.web_push_subscriptions from anon, authenticated;
grant all on public.web_push_subscriptions to service_role;

-- Esta es la ÚNICA clave de Vault que puede leer el navegador.
create or replace function public.get_web_push_public_key()
returns text language sql security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'pwa_vapid_public_key' limit 1;
$$;
revoke all on function public.get_web_push_public_key() from public;
grant execute on function public.get_web_push_public_key() to anon, authenticated;

-- La Edge Function lee exclusivamente estos cuatro secretos, usando su service_role integrado.
create or replace function public.get_web_push_server_config()
returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_object_agg(name, decrypted_secret)
  from vault.decrypted_secrets
  where name in ('pwa_vapid_public_key', 'pwa_vapid_private_key', 'pwa_vapid_subject', 'pwa_webhook_secret');
$$;
revoke all on function public.get_web_push_server_config() from public, anon, authenticated;
grant execute on function public.get_web_push_server_config() to service_role;

-- Identificación por Player ID, igual que el login actual; no es Supabase Auth.
-- La UUID privada identifica esta instalación y nunca se lista al navegador.
create or replace function public.save_web_push_subscription(capability uuid, target_player_id text, subscription jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if capability is null or not exists (select 1 from public.jugadores j where j.player_id::text = target_player_id) then
    raise exception 'Jugador no válido';
  end if;
  if subscription is null or not coalesce(
    (subscription ->> 'endpoint') ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com)/'
    and length(subscription #>> '{keys,p256dh}') between 80 and 100
    and length(subscription #>> '{keys,auth}') between 20 and 30
    and octet_length(subscription::text) < 8192, false) then
    raise exception 'Suscripción no válida';
  end if;
  insert into public.web_push_subscriptions (id, player_id, subscription)
    values (capability, target_player_id, subscription)
    on conflict (id) do update set player_id = excluded.player_id, subscription = excluded.subscription, updated_at = now();
end;
$$;

create or replace function public.remove_web_push_subscription(capability uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.web_push_subscriptions where id = capability;
$$;
revoke all on function public.save_web_push_subscription(uuid, text, jsonb) from public;
revoke all on function public.remove_web_push_subscription(uuid) from public;
grant execute on function public.save_web_push_subscription(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.remove_web_push_subscription(uuid) to anon, authenticated;

create or replace function public.queue_tournament_web_push(payload jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare function_url text; webhook_secret text; request_id bigint;
begin
  select decrypted_secret into function_url from vault.decrypted_secrets where name = 'pwa_function_url' limit 1;
  select decrypted_secret into webhook_secret from vault.decrypted_secrets where name = 'pwa_webhook_secret' limit 1;
  if function_url is null or webhook_secret is null then raise exception 'Avisos sin configurar'; end if;
  select net.http_post(
    url := function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', webhook_secret),
    body := payload, timeout_milliseconds := 15000
  ) into request_id;
  return request_id;
end;
$$;
revoke all on function public.queue_tournament_web_push(jsonb) from public, anon, authenticated;

create or replace function public.test_web_push_subscription(capability uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
begin
  update public.web_push_subscriptions set last_test_at = now()
    where id = capability and (last_test_at is null or last_test_at < now() - interval '30 seconds');
  if not found then raise exception 'Activa los avisos o espera 30 segundos para repetir la prueba'; end if;
  return public.queue_tournament_web_push(jsonb_build_object(
    'subscription_id', capability, 'title', 'Avisos activados',
    'body', 'Este dispositivo puede recibir los avisos de Torneos Aldebaran.', 'tag', 'prueba-aldebaran'
  ));
end;
$$;
revoke all on function public.test_web_push_subscription(uuid) from public;
grant execute on function public.test_web_push_subscription(uuid) to anon, authenticated;

create or replace function public.notify_match_web_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare round_number integer; round_status text; title text; body text; tag text;
begin
  select numero_ronda, status into round_number, round_status from public.rondas where id = new.ronda_id;
  if tg_op = 'INSERT' then
    if round_status <> 'activa' or round_status is null then return new; end if;
    title := 'Nueva ronda ' || round_number;
    tag := 'mesa-' || new.id::text;
  elsif new.confirmado is true and (old.confirmado is distinct from true or new.ganador_final is distinct from old.ganador_final or new.empate is distinct from old.empate) then
    title := 'Resultado confirmado';
    body := case when new.empate then 'Se registró un empate.' else 'El resultado de tu partida ya está confirmado.' end;
    tag := 'resultado-' || new.id::text;
  elsif round_status = 'activa' and (new.mesa is distinct from old.mesa or new.jugador1_id is distinct from old.jugador1_id or new.jugador2_id is distinct from old.jugador2_id) then
    title := 'Asignación actualizada · Ronda ' || round_number;
    tag := 'mesa-' || new.id::text;
  else return new;
  end if;
  if body is null then
    body := case when new.jugador2_id is null then 'Tienes BYE en esta ronda.' else 'Tu mesa asignada es la ' || coalesce(new.mesa::text, 'pendiente') || '.' end;
  end if;
  perform public.queue_tournament_web_push(jsonb_build_object(
    'player_ids', array_remove(array[new.jugador1_id::text, new.jugador2_id::text], null),
    'title', title, 'body', body, 'tag', tag
  ));
  return new;
exception when others then
  raise warning 'No se pudo encolar el aviso de partida: %', sqlerrm;
  return new;
end;
$$;
revoke all on function public.notify_match_web_push() from public, anon, authenticated;
drop trigger if exists match_web_push on public.matches;
create trigger match_web_push after insert or update on public.matches for each row execute function public.notify_match_web_push();

-- Cubre también rondas cuyos matches se crean antes de activarlas.
create or replace function public.notify_round_web_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare match_row record;
begin
  if new.status = 'activa' and old.status is distinct from 'activa' then
    for match_row in select * from public.matches where ronda_id = new.id loop
      perform public.queue_tournament_web_push(jsonb_build_object(
        'player_ids', array_remove(array[match_row.jugador1_id::text, match_row.jugador2_id::text], null),
        'title', 'Nueva ronda ' || new.numero_ronda,
        'body', case when match_row.jugador2_id is null then 'Tienes BYE en esta ronda.' else 'Tu mesa asignada es la ' || coalesce(match_row.mesa::text, 'pendiente') || '.' end,
        'tag', 'mesa-' || match_row.id::text
      ));
    end loop;
  end if;
  return new;
exception when others then
  raise warning 'No se pudo encolar el aviso de ronda: %', sqlerrm;
  return new;
end;
$$;
revoke all on function public.notify_round_web_push() from public, anon, authenticated;
drop trigger if exists round_web_push on public.rondas;
create trigger round_web_push after update on public.rondas for each row execute function public.notify_round_web_push();
