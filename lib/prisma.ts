import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// Connexion "pooled" de Neon (hôte en -pooler) : Prisma doit le savoir
// (pgbouncer=true) et, en serverless, limiter le nombre de connexions par instance.
function databaseUrl(): string | undefined {
    const url = process.env.DATABASE_URL
    if (!url || !url.includes('-pooler.')) return url
    const parsed = new URL(url)
    if (!parsed.searchParams.has('pgbouncer'))        parsed.searchParams.set('pgbouncer', 'true')
    if (!parsed.searchParams.has('connection_limit')) parsed.searchParams.set('connection_limit', '5')
    return parsed.toString()
}

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        datasourceUrl: databaseUrl(),
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}
