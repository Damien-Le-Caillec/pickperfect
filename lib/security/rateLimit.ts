interface RateLimitEntry {
    count: number
    resetAt: number
}

const store = new Map<string, RateLimitEntry>()

setInterval(() => {
    const now = Date.now()
    store.forEach((entry, key) => {
        if (entry.resetAt < now) store.delete(key)
    })
}, 60 * 1000)

interface RateLimitOptions {
    limit: number
    windowMs: number
}

interface RateLimitResult {
    allowed: boolean
    remaining: number
    resetAt: number
}

export function checkRateLimit(
    identifier: string,
    options: RateLimitOptions
): RateLimitResult {
    const now = Date.now()
    const entry = store.get(identifier)

    if (!entry || entry.resetAt < now) {
        const newEntry: RateLimitEntry = {
            count : 1,
            resetAt: now + options.windowMs,
        }
        store.set(identifier, newEntry)
        return { allowed: true, remaining: options.limit - 1, resetAt: newEntry.resetAt }
    }

    entry.count++

    return {
        allowed: entry.count <= options.limit,
        remaining: Math.max(0, options.limit - entry.count),
        resetAt: entry.resetAt,
    }
}

// IP du client (premier élément de x-forwarded-for si derrière un reverse proxy)
export function getClientIp(headers: Headers): string {
    const forwarded = headers.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0].trim()
    return headers.get('x-real-ip') ?? 'unknown'
}

// Réponse 429 standard, ou null si la requête est autorisée
export function rateLimitResponse(identifier: string, options: RateLimitOptions): Response | null {
    const limit = checkRateLimit(identifier, options)
    if (limit.allowed) return null
    const retryAfter = Math.ceil((limit.resetAt - Date.now()) / 1000)
    return Response.json(
        { error: `Trop de requêtes. Réessayez dans ${Math.ceil(retryAfter / 60)} minute(s)` },
        { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
    )
}
