import { NextRequest, NextResponse }            from 'next/server'
import { cookies }                              from 'next/headers'
import { prisma }                               from '@/lib/prisma'
import { validateSession }                      from '@/lib/auth/sqlite-auth'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

async function getSession() {
    const cookieStore = await cookies()
    const id          = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

const pdfStyles = StyleSheet.create({
    page: {
        padding:         40,
        fontFamily:      'Helvetica',
        backgroundColor: '#FAFAF9',
    },
    header: {
        marginBottom:  24,
        paddingBottom: 16,
        borderBottom:  '2px solid #FF9A8B',
    },
    title: {
        fontSize:   28,
        fontWeight: 'bold',
        color:      '#1C1917',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        color:    '#78716C',
    },
    item: {
        flexDirection:  'row',
        alignItems:     'flex-start',
        paddingVertical: 10,
        borderBottom:   '1px solid #E7E5E4',
        gap:            12,
    },
    itemNumber: {
        width:       24,
        height:      24,
        borderRadius: 12,
        backgroundColor: '#FF9A8B',
        alignItems:  'center',
        justifyContent: 'center',
        flexShrink:  0,
    },
    itemNumText: { fontSize: 10, color: 'white', fontWeight: 'bold' },
    itemBody:    { flex: 1 },
    itemTitle:   { fontSize: 13, fontWeight: 'bold', color: '#1C1917', marginBottom: 2 },
    itemDesc:    { fontSize: 10, color: '#78716C', marginBottom: 4 },
    itemMeta:    { flexDirection: 'row', gap: 12 },
    itemPrice:   { fontSize: 11, color: '#FF9A8B', fontWeight: 'bold' },
    itemUrl:     { fontSize: 9,  color: '#A78BFA' },
    reserved:    { fontSize: 10, color: '#10B981', fontWeight: 'bold' },
    footer: {
        position:   'absolute',
        bottom:     30,
        left:       40,
        right:      40,
        fontSize:   9,
        color:      '#A8A29E',
        textAlign:  'center',
        borderTop:  '1px solid #E7E5E4',
        paddingTop: 8,
    },
})

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params

    const list = await prisma.list.findUnique({
        where:   { id },
        include: {
        items: { orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] },
        user:  { select: { name: true } },
        },
    })

    if (!list) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const canView =
        list.userId === session.userId ||
        list.privacy !== 'PRIVATE' ||
        await prisma.listMember.findFirst({ where: { listId: id, userId: session.userId } })

    if (!canView) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const PRIORITY_LABELS: Record<number, string> = { 3: '★★★', 2: '★★☆', 1: '★☆☆' }

    const buffer = await renderToBuffer(
        <Document>
        <Page size="A4" style={pdfStyles.page}>
            {/* Header */}
            <View style={pdfStyles.header}>
            <Text style={pdfStyles.title}>{list.title}</Text>
            <Text style={pdfStyles.subtitle}>
                {list.user.name ? `Liste de ${list.user.name}` : 'Liste de cadeaux'}
                {list.eventDate ? ` · ${new Date(list.eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
                {list.budget ? ` · Budget : ${list.budget}€` : ''}
            </Text>
            </View>

            {/* Items */}
            {list.items.map((item, i) => (
            <View key={item.id} style={pdfStyles.item}>
                <View style={pdfStyles.itemNumber}>
                <Text style={pdfStyles.itemNumText}>{i + 1}</Text>
                </View>
                <View style={pdfStyles.itemBody}>
                <Text style={pdfStyles.itemTitle}>
                    {item.title}
                    {item.priority ? `  ${PRIORITY_LABELS[item.priority] ?? ''}` : ''}
                </Text>
                {item.description && (
                    <Text style={pdfStyles.itemDesc}>{item.description}</Text>
                )}
                <View style={pdfStyles.itemMeta}>
                    {item.price && <Text style={pdfStyles.itemPrice}>{item.price.toFixed(2)} €</Text>}
                    {item.url   && <Text style={pdfStyles.itemUrl}>{item.url.slice(0, 60)}{item.url.length > 60 ? '…' : ''}</Text>}
                    {item.reserved && <Text style={pdfStyles.reserved}>✓ Réservé</Text>}
                </View>
                </View>
            </View>
            ))}

            {/* Footer */}
            <Text style={pdfStyles.footer} fixed>
            {list.items.length} cadeaux · Généré par PickPerfect · pickperfect.ton-domaine.com
            </Text>
        </Page>
        </Document>
    )

    return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${list.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`,
        },
    })
}