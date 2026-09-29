import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from '@/lib/prisma'
import { validateSession } from "@/lib/auth/sqlite-auth";
import sharp from "sharp";
import crypto from 'crypto'
import { saveImage } from '@/lib/storage'

async function getSession() {
    const cookieStore = await cookies()
    const id          = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

export async function POST(request: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    
    if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 400 })
    }
    if (file.size > 4 * 1024 * 1024) {
        return NextResponse.json({ error: 'Image trop lourde (4 Mo maximum)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${crypto.randomBytes(12).toString('hex')}.webp`

    // Carré 200x200 centré
    let webp: Buffer
    try {
        webp = await sharp(buffer)
            .resize(200, 200, { fit: 'cover', position: 'centre' })
            .webp({ quality: 90 })
            .toBuffer()
    } catch {
        return NextResponse.json({ error: 'Image illisible' }, { status: 400 })
    }

    const avatarUrl = await saveImage('avatars', filename, webp)

    await prisma.user.update({
        where: { id: session.userId },
        data: { avatarUrl },
    })

    return NextResponse.json({ avatarUrl })
}