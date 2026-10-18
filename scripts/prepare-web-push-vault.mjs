import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, 'supabase', '.env.web-push-setup.sql')
if (fs.existsSync(output)) throw new Error('El SQL privado ya existe. Consérvalo: regenerar las claves invalida las suscripciones.')
const env = fs.readFileSync(path.join(root, '.env'), 'utf8')
const configuredUrl = env.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*['"]?([^'"\r\n]+)/m)?.[1]?.trim()
const url = new URL(configuredUrl)
if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) throw new Error('Revisa NEXT_PUBLIC_SUPABASE_URL en .env')
const ecdh = crypto.createECDH('prime256v1')
ecdh.generateKeys()
const secrets = {
  pwa_vapid_public_key: ecdh.getPublicKey().toString('base64url'),
  pwa_vapid_private_key: ecdh.getPrivateKey().toString('base64url'),
  pwa_vapid_subject: 'https://aldebaran-torneos.vercel.app',
  pwa_webhook_secret: crypto.randomBytes(32).toString('hex'),
  pwa_function_url: url.origin + '/functions/v1/tournament-web-push',
}
const quote = value => "'" + value.replaceAll("'", "''") + "'"
let sql = '-- ARCHIVO PRIVADO. No subir a Git ni compartir. Ejecutar completo en SQL Editor.\nBEGIN;\n'
for (const [name, value] of Object.entries(secrets)) {
  sql += `DO $setup$\nBEGIN\n  IF EXISTS (SELECT 1 FROM vault.secrets WHERE name = ${quote(name)}) THEN\n    IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = ${quote(name)} AND decrypted_secret = ${quote(value)}) THEN\n      RAISE EXCEPTION 'Ya existe otra configuración para ${name}. No se cambiarán las claves.';\n    END IF;\n  ELSE\n    PERFORM vault.create_secret(${quote(value)}, ${quote(name)}, 'Notificaciones PWA Aldebaran');\n  END IF;\nEND;\n$setup$;\n\n`
}
sql += fs.readFileSync(path.join(root, 'supabase/migrations/202610180002_web_push_vault.sql'), 'utf8')
sql += '\nCOMMIT;\n'
fs.writeFileSync(output, sql, { mode: 0o600 })
console.log('SQL de activación preparado en supabase/.env.web-push-setup.sql. No se imprimieron secretos.')
