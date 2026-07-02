import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth/sqlite-auth";

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
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

    const { url } = await request.json()
    if (!url) {
        return NextResponse.json({ error: 'URL requise' }, { status: 400 })
    }

    try {
        // Proxy pour contourner les blocages anti-bot
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
        const proxyRes = await fetch(proxyUrl, {
            signal: AbortSignal.timeout(15000),
        })

        if (!proxyRes.ok) {
            return NextResponse.json({ error: 'Impossible de lire cette page' }, { status: 400 })
        }

        const proxyData = await proxyRes.json()
        const html = proxyData.contents as string

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

    } catch (err: any) {
        console.error('Scraping error:', err)
        if (err.name === 'TimeoutError') {
            return NextResponse.json({ error: 'La page met trop de temps à répondre' }, { status: 408 })
        }
        return NextResponse.json({ error: err.message ?? 'Erreur lors de la récupération' }, { status: 500 })
    }
}