/** @type {import('next').NextConfig} */
const nextConfig = {
    // Nécessaire pour le deploiement Docker
    output: 'standalone',

    images: {
        remotePatterns: [
            // Amazon
            { protocol: 'https', hostname: 'm.media-amazon.com'              },
            { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com' },
            { protocol: 'https', hostname: 'images-eu.ssl-images-amazon.com' },
            { protocol: 'https', hostname: '**.amazon.fr'                    },
            // FNAC
            { protocol: 'https', hostname: '**.fnac-static.com'              },
            { protocol: 'https', hostname: 'static.fnac-static.com'          },
            // Darty
            { protocol: 'https', hostname: '**.darty.com'                    },
            { protocol: 'https', hostname: 'medias.darty.com'                },
            // Cdiscount
            { protocol: 'https', hostname: '**.cdiscount.com'                },
            // Etsy
            { protocol: 'https', hostname: 'i.etsystatic.com'                },
            // ManoMano
            { protocol: 'https', hostname: '**.manomano.fr'                  },
            // Générique — Open Graph de n'importe quel site
            { protocol: 'https', hostname: '**'                              },
        ],
    },

    async headers() {
        return [
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