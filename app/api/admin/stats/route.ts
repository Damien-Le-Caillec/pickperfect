import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { tr } from "zod/v4/locales";

export async function GET() {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    
    const [
        totalUsers, totalLists, totalItems, totalReservations,
        pointsAgg, newUsersThisWeek, bannedCount,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.list.count(),
        prisma.item.count(),
        prisma.reservation.count({ where: { status: 'CONFIRMED' } }),
        prisma.points.aggregate({ _sum: { totalPoints: true } }),
        prisma.user.count({
            where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 ) } },
        }),
        prisma.user.count({ where: { banned: true } }),
    ])

    return NextResponse.json({
        totalUsers,
        totalLists,
        totalItems,
        totalReservations,
        totalPointsDistributed: pointsAgg._sum.totalPoints ?? 0,
        newUsersThisWeek,
        bannedCount,
    })
}