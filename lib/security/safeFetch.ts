import { lookup } from 'dns/promises'
import { isIP } from 'net'

// Refuse les adresses internes (localhost, réseau privé, métadonnées cloud…)
function isPrivateAddress(ip: string): boolean {
    if (isIP(ip) === 6) {
        const v6 = ip.toLowerCase()
        if (v6 === '::1' || v6 === '::') return true
        if (v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80')) return true
        const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
        return mapped ? isPrivateAddress(mapped[1]) : false
    }
    const [a, b] = ip.split('.').map(Number)
    return (
        a === 0 || a === 10 || a === 127 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 100 && b >= 64 && b <= 127) ||
        a >= 224
    )
}

// Vérifie qu'une URL est http(s) et pointe vers une adresse publique
export async function assertPublicUrl(raw: string): Promise<URL> {
    let url: URL
    try {
        url = new URL(raw)
    } catch {
        throw new Error('URL invalide')
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Seules les URL http(s) sont acceptées')
    }
    const addresses = await lookup(url.hostname, { all: true }).catch(() => [])
    if (addresses.length === 0) throw new Error('Site introuvable')
    if (addresses.some(a => isPrivateAddress(a.address))) {
        throw new Error('Adresse non autorisée')
    }
    return url
}

// fetch qui revérifie chaque redirection (max 3) pour éviter de rebondir vers le réseau interne
export async function safeFetch(raw: string, init: RequestInit = {}, maxRedirects = 3): Promise<Response> {
    let current = raw
    for (let i = 0; i <= maxRedirects; i++) {
        await assertPublicUrl(current)
        const res = await fetch(current, { ...init, redirect: 'manual' })
        const location = res.headers.get('location')
        if (res.status >= 300 && res.status < 400 && location) {
            current = new URL(location, current).href
            continue
        }
        return res
    }
    throw new Error('Trop de redirections')
}
