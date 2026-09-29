import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth/sqlite-auth";
import sharp from "sharp";
import crypto from 'crypto'
import { safeFetch } from "@/lib/security/safeFetch";
import { rateLimitResponse } from "@/lib/security/rateLimit";
import { saveImage } from '@/lib/storage'

const MAX_BYTES = 10 * 1024 * 1024

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

export async function POST(request: NextRequest) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const limited = rateLimitResponse(`upload-url:${session.userId}`, { limit: 30, windowMs: 60 * 1000 })
    if (limited) return limited

    const { imageUrl } = await request.json()
    if (!imageUrl || typeof imageUrl !== 'string') {
        return NextResponse.json({ error: 'URL requise' }, { status: 400 })
    }

    try {
        // safeFetch refuse les adresses internes (protection SSRF)
        const res = await safeFetch(imageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(10000),
        })

        if (!res.ok) {
            return NextResponse.json({ error: 'Image inaccessible' }, { status: 400 })
        }

        const contentType = res.headers.get('content-type') ?? ''
        if (!contentType.startsWith('image/')) {
            return NextResponse.json({ error: 'URL ne pointe pas vers une image' }, { status: 400 })
        }

        if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) {
            return NextResponse.json({ error: 'Image trop lourde' }, { status: 400 })
        }

        const buffer = Buffer.from(await res.arrayBuffer())

        if (buffer.length > MAX_BYTES) {
            return NextResponse.json({ error: 'Image trop lourde' }, { status: 400 })
        }

        const hash = crypto.randomBytes(12).toString('hex')
        const filename = `${hash}.webp`

        const webp = await sharp(buffer)
            .resize(800, 800, {
                fit: 'cover',
                position: 'centre',
                withoutEnlargement: true,
            })
            .webp({ quality: 85 })
            .toBuffer()

        return NextResponse.json({ imageUrl: await saveImage('items', filename, webp) })
    } catch (err) {
        console.error('Upload from URL error:', err)
        return NextResponse.json({ error: "Impossible de récupérer l'image" }, { status: 400 })
    }
}