import { NextRequest, NextResponse } from 'next/server'
import { prisma }                    from '@/lib/prisma'
import { sendEmail }                 from '@/lib/email/mailer'

// Cette route est appelée par un cron job quotidien
// Protégée par un secret token
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const today    = new Date()
  const month    = today.getMonth() + 1
  const day      = today.getDate()

  // Trouver tous les anniversaires qui correspondent à aujourd'hui + remindDays
  const birthdays = await prisma.birthday.findMany({
    include: { user: { select: { email: true, name: true } } },
  })

  let sent = 0

  for (const b of birthdays) {
    if (b.remindDays === 0) continue

    const bDate    = new Date(b.date)
    const bMonth   = bDate.getMonth() + 1
    const bDay     = bDate.getDate()

    // Calculer quand envoyer le rappel
    const triggerDate = new Date(today.getFullYear(), bMonth - 1, bDay)
    triggerDate.setDate(triggerDate.getDate() - b.remindDays)

    // Vérifier si c'est aujourd'hui qu'on doit envoyer
    if (triggerDate.getMonth() + 1 === month && triggerDate.getDate() === day) {
      await sendEmail({
        to:      b.user.email,
        notification: true,
        subject: `Anniversaire de ${b.name} dans ${b.remindDays} jour${b.remindDays !== 1 ? 's' : ''}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:40px auto;background:white;border-radius:16px;padding:40px;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
            <h1 style="font-size:24px;font-weight:800;margin-bottom:8px">
                Rappel d'anniversaire
            </h1>
            <p style="color:#57534E;line-height:1.65;margin-bottom:24px">
              L'anniversaire de <strong>${b.name}</strong> est dans 
              <strong>${b.remindDays} jour${b.remindDays !== 1 ? 's' : ''}</strong>
              (le ${bDay.toString().padStart(2,'0')}/${bMonth.toString().padStart(2,'0')}).
            </p>
            ${b.relatedListId ? `
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/lists/${b.relatedListId}" 
                 style="display:inline-block;background:linear-gradient(135deg,#FF9A8B,#E8826F);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700">
                Voir la liste de ${b.name}
              </a>
            ` : `
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/explore"
                 style="display:inline-block;background:linear-gradient(135deg,#FF9A8B,#E8826F);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700">
                Trouver un cadeau
              </a>
            `}
            <p style="color:#A8A29E;font-size:13px;margin-top:32px;padding-top:24px;border-top:1px solid #E7E5E4">
              Vous recevez cet email car vous avez configuré un rappel d'anniversaire sur PickPerfect.<br>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/birthdays">Gérer mes rappels</a>
            </p>
          </div>
        `,
      }).catch(() => {})
      sent++
    }
  }

  return NextResponse.json({ success: true, sent })
}