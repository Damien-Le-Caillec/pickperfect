import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join, normalize, sep, extname } from 'path'

// Sert les fichiers uploadés à l'exécution (public/uploads) : Next ne sert de
// façon fiable que les fichiers présents dans public/ au démarrage du serveur.
// /uploads/* est redirigé ici par la rewrite de next.config.js.
const ROOT = join(process.cwd(), 'public', 'uploads')

const TYPES: Record<string, string> = {
    '.webp': 'image/webp',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params
    const file = normalize(join(ROOT, ...path))

    // Empêche de sortir du dossier uploads (../)
    if (!file.startsWith(ROOT + sep)) {
        return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    }

    const type = TYPES[extname(file).toLowerCase()]
    if (!type) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    try {
        const data = await readFile(file)
        return new NextResponse(new Uint8Array(data), {
            headers: {
                'Content-Type':           type,
                'Cache-Control':          'public, max-age=31536000, immutable',
                'X-Content-Type-Options': 'nosniff',
            },
        })
    } catch {
        return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    }
}
