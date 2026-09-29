import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET() {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const logs = await prisma.activityLog.findMany({
        include: {
            user: { select: { name: true, email: true } },
            list: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    })

    return NextResponse.json(logs)
}