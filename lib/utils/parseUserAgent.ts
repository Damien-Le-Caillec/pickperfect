export function parseUserAgent(ua: string | null): { browser: string; os: string; icon: string } {
    if (!ua) return { browser: 'Inconnu', os: 'Inconnu', icon: 'fa-question-circle' }

    let browser = 'Navigateur inconnu'
    let icon = 'fa-globe'
    if (ua.includes('Edg/')) { browser =  'Edge'; icon = 'fa-edge' }
    else if (ua.includes('Chrome')) { browser =  'Chrome'; icon = 'fa-chrome' }
    else if (ua.includes('Firefox')) { browser =  'Firefox'; icon = 'fa-firefox' }
    else if (ua.includes('Safari')) { browser =  'Safari'; icon = 'fa-safari' }

    let os = 'Système inconnu'
    if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Mac OS')) os = 'macOS'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
    else if (ua.includes('Linux')) os = 'Linux'

    return { browser, os, icon }
}