// Taux de commission indicatifs (utilisés pour les statistiques)
const COMMISSION_RATES: Record<string, number> = {
    amazon: 0.05,
    fnac: 0.04,
    darty: 0.04,
    cdiscount: 0.02,
    etsy: 0.06,
    manomano: 0.05,
}

interface AffiliateResult {
    link: string
    merchant: string
    rate: number
}

export function detectMerchant(url: string): string {
    try {
        const host = new URL(url).hostname.replace('www.', '')
        if (host.includes('amazon.')) return 'amazon'
        if (host.includes('fnac.com')) return 'fnac'
        if (host.includes('darty.com')) return 'darty'
        if (host.includes('cdiscount.')) return 'cdiscount'
        if (host.includes('etsy.com')) return 'etsy'
        if (host.includes('manomano.')) return 'manomano'
    } catch {}
    return 'unknown'
}

// Lien "deeplink" des plateformes d'affiliation (Awin, Effiliation…) :
// la variable d'env contient le lien de tracking avec {url} à la place de l'URL produit, ex.
// CDISCOUNT_AFFILIATE_TEMPLATE="https://www.awin1.com/cread.php?awinmid=6948&awinaffid=123456&ued={url}"
function fromTemplate(merchant: string, url: string): string | null {
    const template = process.env[`${merchant.toUpperCase()}_AFFILIATE_TEMPLATE`]
    if (!template || !template.includes('{url}')) return null
    return template.replace('{url}', encodeURIComponent(url))
}

export function generateAffiliateLink(url: string): AffiliateResult | null {
    const merchant = detectMerchant(url)
    if (merchant === 'unknown') return null

    const rate = COMMISSION_RATES[merchant] || 0.03

    // Un template configuré est prioritaire (fonctionne pour tous les marchands)
    const templated = fromTemplate(merchant, url)
    if (templated) return { link: templated, merchant, rate }

    let link = url

    try {
        const parsed = new URL(url)

        switch (merchant) {
            case 'amazon': {
                const tag = process.env.AMAZON_AFFILIATE_TAG
                if (tag) {
                    parsed.searchParams.set('tag', tag)
                    link = parsed.toString()
                }
                break
            }
            case 'fnac': {
                const id = process.env.FNAC_AFFILIATE_ID
                if (id) {
                    parsed.searchParams.set('affiliation_id', id)
                    link = parsed.toString()
                }
                break
            }
            case 'darty': {
                const id = process.env.DARTY_PARTNER_ID
                if (id) {
                    parsed.searchParams.set('pid', id)
                    link = parsed.toString()
                }
                break
            }
            // Cdiscount, Etsy, ManoMano : uniquement via *_AFFILIATE_TEMPLATE
        }
    } catch {}

    // Pas d'identifiant configuré : pas de lien affilié
    if (link === url) return null

    return { link, merchant, rate }
}
