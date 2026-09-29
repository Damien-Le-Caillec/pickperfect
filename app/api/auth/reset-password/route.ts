import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from 'bcrypt'
import { z } from 'zod'

const Schema = z.object({
    token : z.string().min(1),
    password: z.string().min(8, 'Minimun 8 caractères'),
})

// GET - Vérifier que le token est valide
export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
        return NextResponse.json({ valid: false, error: 'Token manquant' })
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
    })

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
        return NextResponse.json({ valid: false, error: 'Lien invalide ou expiré' })
    }

    return NextResponse.json({ valid: true })
}

// POST - Appliquer le nouveau mot de passe
export async function POST(request: NextRequest) {
    const body = await request.json()
    const parsed = Schema.safeParse(body)

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0].message },
            { status: 400 }
        )
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token: parsed.data.token },
    })

    if (!resetToken) {
        return NextResponse.json({ error: 'Lien invalide' }, { status: 400 })
    }
    if (resetToken.used) {
        return NextResponse.json({ error: 'Ce lien a déja été utilisé' }, { status: 400 })
    }
    if (resetToken.expiresAt < new Date()) {
        return NextResponse.json({ error: 'Ce lien a expiré' }, { status: 400 })
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(parsed.data.password, 12)

    // Mettre à jour + invalider le token en transaction
    await prisma.$transaction([
        prisma.user.update({
            where: { id: resetToken.userId },
            data: { hashedPassword },
        }),
        prisma.passwordResetToken.update({
            where: { token: parsed.data.token },
            data: { used: true},
        }),
        // Supprimer toutes les sessions existantes (sécurité)
        prisma.session.deleteMany({
            where: { userId: resetToken.userId },
        }),
    ])

    return NextResponse.json({ success: true })
}