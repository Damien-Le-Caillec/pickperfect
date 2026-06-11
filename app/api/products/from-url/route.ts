import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const { url } = await request.json()

    if (!url) {
        return NextResponse.json({ error: 'URL requise' }, { status: 400 })
    }

    // Valider que c'est bien une URL
    try {
        new URL(url)
    } catch {
        return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
    }

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; PickPerfect/1.0)',
                'Accept-Language': 'fr-FR,fr;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
            },
            signal: AbortSignal.timeout(8000),
        })

        const html = await res.text()

        // Fonction helper pour extraire les balises meta
        const getMeta = (name: string): string => {
            const patterns = [
                new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
                new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, 'i'),
                new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
                new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'),
            ]
            for (const p of patterns) {
                const m = html.match(p)
                if (m?.[1]) return m[1].trim()
            }
            return ''
        }

        // Extraire titre
        const title =
            getMeta('og:title') ||
            getMeta('twitter:title') ||
            html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
            'Produit sans nom'

        // Extraire description
        const description =
        getMeta('og:description') ||
        getMeta('description') ||
        ''

        // Extraire image
        const imageUrl =
        getMeta('og:image') ||
        getMeta('twitter:image') ||
        ''

        // Extraire prix (patterns e-commerce courants)
        const priceStr =
        getMeta('product:price:amount') ||
        html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
        html.match(/"price"\s*:\s*"?([0-9]+[.,][0-9]{2})"?/)?.[1] ||
        ''

        const price = priceStr
        ? parseFloat(priceStr.replace(',', '.').replace(/[^0-9.]/g, ''))
        : undefined

        return NextResponse.json({
            title: title.slice(0, 200),
            description: description.slice(0, 500),
            imageUrl: imageUrl || null,
            price: price && !isNaN(price) ? price : undefined,
            currency: 'EUR',
            url,
        })
    } catch {
        return NextResponse.json(
            { error: 'Impossible de récupérer les infos. Remplis manuellement.' },
            { status: 422 }
        )
    }
}