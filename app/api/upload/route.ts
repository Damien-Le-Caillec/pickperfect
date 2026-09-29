import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth/sqlite-auth";
import sharp from "sharp";
import crypto from 'crypto';
import { saveImage } from '@/lib/storage'

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 4 * 1024 * 1024 // 4 Mo (Vercel refuse les requêtes > 4,5 Mo)

export async function POST(request: NextRequest) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
        return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 })
    }

    // Vérifications
    if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
            { error: 'Format non supporté. Utilisez JPG, PNG, WebP ou GIF.' },
            { status: 400 }
        )
    }
    if (file.size > MAX_SIZE) {
        return NextResponse.json(
            { error: 'Fichier trop lourd. Maximum 4 Mo.' },
            { status: 400 }
        )
    }

    // Lire le fichier
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Nom unique
    const hash = crypto.randomBytes(12).toString('hex')
    const filename = `${hash}.webp`

    // Optimiser + convertir en WebP avec sharp
    const webp = await sharp(buffer)
        .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer()

    const imageUrl = await saveImage('items', filename, webp)

    return NextResponse.json({ imageUrl })
}