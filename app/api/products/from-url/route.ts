import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth/sqlite-auth";
import { rateLimitResponse } from "@/lib/security/rateLimit";
import { assertPublicUrl, safeFetch } from "@/lib/security/safeFetch";

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
}

// Récupère le HTML : via le proxy allorigins (contourne certains anti-bots), sinon en direct
async function fetchHtml(url: string): Promise<string | null> {
    try {
        const proxyRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {
            signal: AbortSignal.timeout(10000),
        })
        if (proxyRes.ok) {
            const data = await proxyRes.json()
            if (typeof data.contents === 'string' && data.contents.length > 0) return data.contents
        }
    } catch {}

    const res = await safeFetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    return (await res.text()).slice(0, 3_000_000)
}

function extractImages(html: string, baseUrl: string): string[] {
    const images: string[] = []
    const seen = new Set<string>()

    const add = (src: string) => {
        if (!src) return
        if (src.startsWith('data:')) return
        if (src.includes('.svg')) return
        if (src.includes('pixel') || src.includes('tracker') || src.includes('1x1')) return

        try {
            const absolute = src.startsWith('http') ? src : new URL(src, baseUrl).href
            if (!seen.has(absolute)) {
                seen.add(absolute)
                images.push(absolute)
            }
        } catch {}
    }

    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
        ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
    if (ogMatch?.[1]) add(ogMatch[1])

    const twMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
    if (twMatch?.[1]) add(twMatch[1])

    const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
    for (const match of jsonLdMatches) {
        try {
            const data = JSON.parse(match[1])
            const imgs = data.image ?? data.images ?? data['@graph']?.[0]?.image ?? []
            const arr  = Array.isArray(imgs) ? imgs : [imgs]
            for (const img of arr) {
                if (typeof img === 'string') add(img)
                else if (img?.url) add(img.url)
            }
        } catch {}
    }

    const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)
    for (const match of imgMatches) {
        const src = match[1]
        if (
            src.includes('product') || src.includes('large') || src.includes('main') ||
            src.includes('primary') || src.includes('full') || src.includes('zoom')
        ) {
            add(src)
        }
    }

    return images.slice(0, 8)
}

export async function POST(request: NextRequest) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const limited = rateLimitResponse(`from-url:${session.userId}`, { limit: 20, windowMs: 60 * 1000 })
    if (limited) return limited

    const { url } = await request.json()
    if (!url || typeof url !== 'string') {
        return NextResponse.json({ error: 'URL requise' }, { status: 400 })
    }

    try {
        await assertPublicUrl(url)
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 400 })
    }

    try {
        const html = await fetchHtml(url)

        if (!html) {
            return NextResponse.json({ error: 'Page vide ou inaccessible' }, { status: 400 })
        }

        // ---- Titre ----
        const title =
            html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)?.[1] ??
            html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
            ''

        // ---- Prix ----
        let price: number | null = null

        const jsonLd = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)
        if (jsonLd) {
            try {
                const data = JSON.parse(jsonLd[1])
                const p = data.offers?.price ?? data.price ?? data['@graph']?.[0]?.offers?.price
                if (p) price = parseFloat(String(p).replace(',', '.'))
            } catch {}
        }

        if (!price) {
            const priceMatch =
                html.match(/<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i) ??
                html.match(/<meta[^>]*itemprop=["']price["'][^>]*content=["']([^"']+)["']/i)
            if (priceMatch?.[1]) price = parseFloat(priceMatch[1].replace(',', '.'))
        }

        if (!price) {
            const priceText = html.match(/(\d+[,\.]\d{2})\s*€/)?.[1]
            if (priceText) price = parseFloat(priceText.replace(',', '.'))
        }

        // ---- Description ----
        const description =
            html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
            html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
            null

        // ---- Images ----
        const images = extractImages(html, url)

        return NextResponse.json({
            title:       title.slice(0, 200),
            price:       price && !isNaN(price) ? Math.round(price * 100) / 100 : null,
            description: description?.slice(0, 500) ?? null,
            imageUrl:    images[0] ?? null,
            images,
        })

    } catch (err) {
        console.error('Scraping error:', err)
        if ((err as Error).name === 'TimeoutError') {
            return NextResponse.json({ error: 'La page met trop de temps à répondre' }, { status: 408 })
        }
        return NextResponse.json({ error: 'Impossible de lire cette page' }, { status: 500 })
    }
}