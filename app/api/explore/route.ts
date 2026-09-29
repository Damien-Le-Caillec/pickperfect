import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Détecte l'occasion depuis le titre
function detectOccasion(title: string): string {
    const t = title.toLowerCase()
    if (t.includes('anniversaire') || t.includes('anniv')) return 'Anniversaire'
    if (t.includes('mariage') || t.includes('wedding')) return 'Mariage'
    if (t.includes('naissance') || t.includes('bébé') || t.includes('bebe')) return 'Naissance'
    if (t.includes('noël') || t.includes('noel') || t.includes('christmas')) return 'Noël'
    if (t.includes('diplôme') || t.includes('diplome') || t.includes('bac')) return 'Diplôme'
    if (t.includes('fête') || t.includes('fete') || t.includes('party')) return 'Fête'
    if (t.includes('saint-valentin') || t.includes('valentin')) return 'Saint-Valentin'
    if (t.includes('crémaillère') || t.includes('cremaillere')) return 'Crémaillère'
    return 'Autre'
}

// Calcule le score de tendance
function trendingScore(list: {
    viewCount: number
    shareCount: number
    createdAt: Date
    updatedAt: Date
    items: { reserved: boolean } []
}): number {
    const reservedCount = list.items.filter(i => i.reserved).length
    const now = Date.now()
    const createdAgo = now - list.createdAt.getTime()
    const updatedAgo = now - list.updatedAt.getTime()

    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000
    const ONE_MONTH = 30 * 24 * 60 * 60 * 1000

    // Bonus de fraicheur
    let freshnessBonus = 0
    if (createdAgo < ONE_WEEK) freshnessBonus = 20
    else if (createdAgo < ONE_MONTH) freshnessBonus = 10

    // Bonus activité récente (modifiée cette semaine)
    const activityBonus = updatedAgo < ONE_WEEK ? 8 : 0

    return (
        list.viewCount * 1 +
        list.shareCount * 4 +
        reservedCount * 6 +
        freshnessBonus +
        activityBonus
    )
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab')  || 'trending' // trending | recent | soon
    const search = searchParams.get('search') || ''
    const occasion = searchParams.get('occasion') || ''
    const budget = searchParams.get('budget') || '' // low | mid | high

    //filtre de base : listes publiques avec au moins 1 item
    const baseWhere = {
        privacy: 'PUBLIC',
        items: { some: {} }, // au moins 1 item
        ...(search ? {
            title: { contains: search, mode: 'insensitive' as const },
        } : {}),
    }

    // Construire le filtre date pour l'onglet "Bientôt"
    const now = new Date()
    const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const lists = await prisma.list.findMany({
        where: {
            ...baseWhere,
            // Onglet "Bientôt" : événement dans les 30 prochaines jours
            ...(tab === 'soon' ? {
                eventDate: { gte: now, lte: in30d },
            } : {}),
        },
        include: {
            user: { select: { id: true, name: true, email: true } },
            items: { select: { reserved: true, price: true } },
            _count: { select: { items: true } },
        },
        orderBy: tab === 'recent'
            ? { createdAt: 'desc' }
            : tab === 'soon'
                ? { eventDate: 'asc' }
                : { viewCount: 'desc'}, // pré-tri pour perf, on re-trie après
            take:  200, // on prend large pour filter côté serveur
    })

    // Enrichir chaque liste
    let enriched = lists.map(list => {
        const occasion_detected = detectOccasion(list.title)
        const reservedCount = list.items.filter(i => i.reserved).length
        const totalItems = list._count.items
        const avgPrice = list.items.length > 0
            ? list.items.reduce((sum, i) => sum + (i.price ?? 0), 0) / list.items.length
            : 0
        const score = trendingScore({
            viewCount: list.viewCount,
            shareCount: list.shareCount,
            createdAt: list.createdAt,
            updatedAt: list.updatedAt,
            items: list.items,
        })

        return {
            id:          list.id,
            title:       list.title,
            description: list.description,
            eventDate:   list.eventDate,
            viewCount:   list.viewCount,
            shareCount:  list.shareCount,
            createdAt:   list.createdAt,
            totalItems,
            reservedCount,
            reservationPct: totalItems > 0
                ? Math.round((reservedCount / totalItems) * 100)
                : 0,
            avgPrice:    Math.round(avgPrice),
            occasion:    occasion_detected,
            score,
            owner: {
                name:  list.user.name,
                email: list.user.email,
                initials: list.user.name
                ? list.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : list.user.email[0].toUpperCase(),
            },
        }
    })

    // Filtre occasion
    if (occasion && occasion !== 'Tous') {
        enriched = enriched.filter(l => l.occasion === occasion)
    }

    // Filtre budget
    if (budget === 'low') enriched = enriched.filter(l => l.avgPrice > 0 && l.avgPrice < 50)
    if (budget === 'mid') enriched = enriched.filter(l => l.avgPrice >= 50 && l.avgPrice <= 150)
    if (budget === 'low') enriched = enriched.filter(l => l.avgPrice > 150)

    // Trier par score pour l'onglet trending
    if (tab === 'trending') {
        enriched.sort((a, b) => b.score - a.score)
    }

    // Stats globales pour l'en-tête
    const [totalPublicLists, totalReservations] = await Promise.all ([
        prisma.list.count({ where: { privacy: 'PUBLIC' } }),
        prisma.reservation.count({ where: { status: 'CONFIRMED' } }),
    ])

    return NextResponse.json({
        lists: enriched.slice(0, 48), // max 48 résultats
        total: enriched.length,
        stats: {
            totalPublicLists,
            totalReservations,
        },
    })
}