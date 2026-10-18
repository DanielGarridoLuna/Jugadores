# Avisos PWA mediante Supabase Vault

Esta versión no requiere variables nuevas en Edge Functions Secrets ni en Vercel. Reutiliza las variables integradas `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, comprobadas con `test-pwa-vault`, y lee la configuración privada mediante una RPC disponible solo para `service_role`.

## Activación desde el panel

1. Ya se preparó `supabase/.env.web-push-setup.sql` en este espacio de trabajo. Abrirlo localmente, copiarlo completo al SQL Editor del proyecto indicado en `.env` y ejecutarlo. Contiene las claves, la tabla de suscripciones, las funciones de acceso y los triggers; no ejecutar además la migración por separado. El archivo es privado y está ignorado por Git. Guardar una copia segura: no regenerar claves después de activar dispositivos.
2. Crear la Edge Function **tournament-web-push** y pegar el contenido de `supabase/functions/tournament-web-push/index.ts` en su `index.ts`. Pulsar **Deploy function** (o **Deploy updates** si ya existe).
3. En **Settings** de esa función, desactivar **Verify JWT with legacy secret** y guardar. Esto es específico de `tournament-web-push`: autentica cada envío con `x-webhook-secret` y lo compara con Vault antes de consultar suscripciones o enviar avisos. No cambiar la configuración de otras funciones. Una llamada manual con `{}` sin ese encabezado debe responder 401; es el comportamiento correcto.
4. Publicar los cambios de esta web en Vercel. No agregar variables VAPID en Vercel ni en Secrets.
5. En Brave Android, abrir **Mi Perfil → Activar avisos** y aceptar el permiso. Después pulsar **Enviar prueba**. La web confirma que solicitó la prueba, no que Android la recibió; confirmar visualmente que aparece la notificación.
6. Activar los avisos en dos dispositivos y crear una ronda con sus partidas. Verificar mesa para ambos, empate/victoria confirmada, corrección por administrador y cambio de mesa. Cerrar la PWA y repetir para probar el segundo plano. No hace falta reinstalar la PWA.

Si se prepara una copia nueva del repositorio, `node scripts/prepare-web-push-vault.mjs` genera un SQL privado nuevo. No usarlo para reemplazar una instalación activa: conservar siempre las claves originales.

## Comportamiento

- Match creado en ronda activa: un aviso con ronda y mesa, o BYE. Ronda y mesa se combinan para evitar dos avisos simultáneos.
- Ronda que pasa a activa después de crear matches: asignación a sus participantes.
- Cambio de mesa o participantes: nueva asignación para quienes están en la partida actualizada.
- Resultado que pasa a confirmado: aviso a ambos jugadores. También notifica correcciones del ganador o empate.
- Actualizaciones sin cambio de esos datos no reenvían avisos. Importaciones de partidas ya confirmadas no generan avisos de resultado por INSERT. Importaciones en rondas finalizadas no envían asignaciones.
- Se conservan Expo y `push_tokens` para la app Android. Los triggers viven en Supabase y funcionan aunque el cambio proceda de registro-torneos.
- Desactivar o cerrar sesión elimina la suscripción del dispositivo. Si no hay conexión y falla la baja del servidor, se conserva la sesión y se informa para reintentar.

## Permisos y secretos

`get_web_push_public_key` expone exclusivamente la clave VAPID pública. `get_web_push_server_config` devuelve únicamente cuatro secretos con nombres fijos y solo permite ejecución a `service_role`; nunca se otorga acceso general a Vault. La URL de envío y el secreto del webhook también se leen en SQL para encolar los avisos con `pg_net`.

La tabla de suscripciones tiene RLS, sin permisos directos para usuarios anónimos o autenticados. Una UUID aleatoria guardada en el dispositivo permite registrar y retirar su propia instalación. Los endpoints se limitan a los proveedores FCM, Mozilla y Apple; las suscripciones expiradas se eliminan al recibir HTTP 404/410. La prueba por dispositivo tiene un intervalo mínimo de 30 segundos.

El acceso actual a jugadores usa Player ID, no autenticación verificada. La suscripción conserva ese modelo: quien conozca otro Player ID puede registrar su dispositivo para sus avisos. Los mensajes no incluyen nombres, teléfonos ni el ganador, pero sí ronda y mesa. Antes de enviar información privada debe vincularse la suscripción a una identidad autenticada.

## Diagnóstico y límites

Pruebas locales: `node --test tests/web-push.test.mjs`. Estas usan dobles del navegador y del proveedor de push; no sustituyen la aplicación del SQL ni la prueba en un Android real.

Revisar los logs de `tournament-web-push` y `net._http_response` desde SQL Editor para ver fallos de envío. No copiar claves ni endpoints de dispositivos al chat. Los fallos de notificaciones no cancelan el registro de partidas. El envío usa TTL de 15 minutos y no tiene reintentos persistentes: fallos del proveedor o de red pueden perder avisos. Android y Brave pueden restringir la entrega por permisos o ahorro de batería.

Prueba de permisos sin mostrar secretos:

```sql
SELECT
  has_function_privilege('anon', 'public.get_web_push_server_config()', 'EXECUTE') AS anon_debe_ser_false,
  has_function_privilege('authenticated', 'public.get_web_push_server_config()', 'EXECUTE') AS authenticated_debe_ser_false,
  has_function_privilege('service_role', 'public.get_web_push_server_config()', 'EXECUTE') AS backend_debe_ser_true;
```

Después de comprobar el sistema se puede eliminar la prueba temporal anterior (no borra las claves PWA):

```sql
DROP FUNCTION IF EXISTS public.test_pwa_vault_access();
DELETE FROM vault.secrets WHERE name = 'pwa_vault_access_test';
```

Eliminar también `test-pwa-vault` desde Edge Functions si ya no se necesita.
