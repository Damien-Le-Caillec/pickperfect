// Applique les migrations Prisma pendant le build Vercel.
// Neon fournit une URL "pooled" (DATABASE_URL) pour l'app et une URL directe
// (DATABASE_URL_UNPOOLED) : les migrations doivent passer par la connexion directe.
import { execSync } from 'node:child_process'

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!url) {
    console.error('DATABASE_URL manquant : ajoute la base Neon au projet Vercel (Storage → Neon).')
    process.exit(1)
}

execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env:   { ...process.env, DATABASE_URL: url },
})
