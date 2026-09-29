import { NextRequest, NextResponse } from 'next/server'
import { cookies }                   from 'next/headers'
import { prisma }                    from '@/lib/prisma'
import { validateSession }           from '@/lib/auth/sqlite-auth'
import QRCode                        from 'qrcode'
import { hasReward }                 from '@/lib/points/rewards'
import { getAccentColor }            from '@/lib/profile/theme'

async function getSession() {
  const cookieStore = await cookies()
  const id          = cookieStore.get('auth_session')?.value
  if (!id) return null
  return validateSession(id)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params

  const list = await prisma.list.findUnique({
    where: { id },
    select: { userId: true, shareToken: true, title: true },
  })
  if (!list || list.userId !== session.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const url = list.shareToken
    ? `${process.env.NEXT_PUBLIC_APP_URL}/l/${list.shareToken}`
    : `${process.env.NEXT_PUBLIC_APP_URL}/lists/${id}`

  // Récompense r6 : QR code aux couleurs du profil
  let dark = '#1C1917'
  if (await hasReward(session.userId, 'r6')) {
    const owner = await prisma.user.findUnique({ where: { id: session.userId }, select: { accentColor: true } })
    dark = getAccentColor(owner?.accentColor)
  }

  const svg = await QRCode.toString(url, {
    type:          'svg',
    width:         300,
    margin:        2,
    color: {
      dark,
      light: '#FAFAF9',
    },
  })

  return new NextResponse(svg, {
    headers: {
      'Content-Type':        'image/svg+xml',
      'Content-Disposition': `attachment; filename="qr-${list.title.replace(/[^a-zA-Z0-9]/g, '-')}.svg"`,
    },
  })
}