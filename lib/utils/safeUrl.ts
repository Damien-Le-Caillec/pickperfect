// N'accepte que les liens http(s) — bloque javascript:, data:, etc.
export function isHttpUrl(value: string): boolean {
    try {
        const { protocol } = new URL(value)
        return protocol === 'http:' || protocol === 'https:'
    } catch {
        return false
    }
}

// href sûr pour l'affichage (undefined si le lien n'est pas http(s))
export function safeHref(value?: string | null): string | undefined {
    return value && isHttpUrl(value) ? value : undefined
}
