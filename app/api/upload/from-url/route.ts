import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth/sqlite-auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import crypto from 'crypto'
import { error } from "console";
import { mk } from "zod/locales";

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

    const { imageUrl } = await request.json()
    if (!imageUrl) {
        return NextResponse.json({ error: 'URL requise' }, { status: 400 })
    }

    try {
        const res = await fetch(imageUrl,{
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

        const buffer = Buffer.from(await res.arrayBuffer())

        if (buffer.length > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'Image trop lourde' }, { status: 400 })
        }

        const hash = crypto.randomBytes(12).toString('hex')
        const filename = `${hash}.webp`

        const uploadDir = join(process.cwd(), 'public', 'uploads', 'items')
        await mkdir(uploadDir, { recursive: true })

        await sharp(buffer)
            .resize(800, 800, {
                fit: 'cover',
                position: 'centre',
                withoutEnlargement: true,
            })
            .webp({ quality: 85 })
            .toFile(join(uploadDir, filename))

        return NextResponse.json({ imageUrl: `/uploads/items/${filename}`})
    } catch (err: any) {
        return NextResponse.json({ error: 'Erreur lors du traitement' }, { status: 500 })
    }
}