import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth/sqlite-auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import crypto from 'crypto';
import { buffer } from "stream/consumers";

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

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
            { error: 'Fichier trop lourd. Maximum 5 Mo.' },
            { status: 400 }
        )
    }

    // Lire le fichier
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Nom unique
    const hash = crypto.randomBytes(12).toString('hex')
    const filename = `${hash}.webp`

    // Dossier de destination
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'items')
    await mkdir(uploadDir, { recursive: true })

    // Optimiser + convertir en WebP avec sharp
    await sharp(buffer)
        .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toFile(join(uploadDir, filename))

    const imageUrl = `/uploads/items/${filename}`

    return NextResponse.json({ imageUrl })
}