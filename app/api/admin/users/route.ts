import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { Session } from "inspector/promises";
import { email } from "zod";

export async function GET(request: NextRequest) {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    
    const search = request.nextUrl.searchParams.get('search') ?? ''

    const users = await prisma.user.findMany({
        where: search ? {
            OR: [
                { email: { contains: search } },
                { name: { contains: search } },
            ],
        } : undefined,
        select: {
            id: true, email: true, name: true, role: true, banned: true,
            createdAt: true, lastLoginAt: true, loginCount: true,
            _count: { select: { lists: true, reservations: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    })

    return NextResponse.json(users)
}