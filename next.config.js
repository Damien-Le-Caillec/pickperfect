// URL publique du site : NEXT_PUBLIC_APP_URL si défini, sinon celle fournie par Vercel
// (adresse de la branche pour un déploiement de test, adresse principale sinon)
const vercelHost = process.env.VERCEL_ENV === 'preview'
    ? process.env.VERCEL_BRANCH_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
const appUrl = process.env.NEXT_PUBLIC_APP_URL || (vercelHost ? `https://${vercelHost}` : undefined)

/** @type {import('next').NextConfig} */
const nextConfig = {
    env: appUrl ? { NEXT_PUBLIC_APP_URL: appUrl } : {},

    // Nécessaire pour le deploiement Docker
    output: 'standalone',

    // next/image n'est pas utilisé : aucun domaine distant autorisé
    // (évite que /_next/image serve de proxy d'images ouvert)
    images: {
        remotePatterns: [],
    },

    // Fichiers uploadés après le build : servis par app/api/uploads
    async rewrites() {
        return [
            { source: '/uploads/:path*', destination: '/api/uploads/:path*' },
        ]
    },

    async headers() {
        return [
            {
                // En-têtes de sécurité pour tout le site
                source: '/:path*',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                ],
            },
            {
                source: '/api/:path*',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                ],
            },
        ]
    },
}

module.exports = nextConfig