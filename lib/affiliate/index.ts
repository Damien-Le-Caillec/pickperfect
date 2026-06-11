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
        if (host.includes('cdisount.')) return 'cdiscount'
        if (host.includes('etsy.com')) return 'etsy'
        if (host.includes('manomano.')) return 'manomano'
    } catch {}
    return 'unknow'
}

export function generateAffiliateLink(url: string):
AffiliateResult | null {
    const merchant = detectMerchant(url)
    if (merchant === 'unknow') return null

    const rate = COMMISSION_RATES[merchant] || 0.03

    // Construire le lien selon le marchand
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
            // Pour les autres marchands, le lien reste tel quel
            // (à compléter quand tu auras les comptes affiliés)
            }
    } catch {}
    
    return {link, merchant, rate}
}