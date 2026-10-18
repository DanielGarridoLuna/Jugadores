-- Ejecutar en SQL Editor para retirar las pruebas del proyecto publicado.
-- No modifica suscripciones, claves de Vault ni triggers de torneos.
BEGIN;

DROP FUNCTION IF EXISTS public.test_web_push_subscription(uuid);
DROP FUNCTION IF EXISTS public.test_pwa_vault_access();

COMMIT;
