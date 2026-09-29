/** @type {import('next').NextConfig} */
const nextConfig = {
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