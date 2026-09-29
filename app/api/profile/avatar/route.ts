import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from '@/lib/prisma'
import { validateSession } from "@/lib/auth/sqlite-auth";
import { mkdir } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import crypto from 'crypto'

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
    
    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${crypto.randomBytes(12).toString('hex')}.webp`
    const dir = join(process.cwd(), 'public', 'uploads', 'avatars')

    await mkdir(dir, { recursive: true })

    // Carré 200x200 centré
    await sharp(buffer)
        .resize(200, 200, { fit: 'cover', position: 'centre' })
        .webp({ quality: 90 })
        .toFile(join(dir, filename))

    const avatarUrl = `/uploads/avatars/${filename}`

    await prisma.user.update({
        where: { id: session.userId },
        data: { avatarUrl },
    })

    return NextResponse.json({ avatarUrl })
}