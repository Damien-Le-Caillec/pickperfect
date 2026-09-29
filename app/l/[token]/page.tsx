import { prisma }   from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'

export default async function SharedListPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const list = await prisma.list.findUnique({
    where: { shareToken: token },
  })

  if (!list) notFound()

  // Incrémenter les vues
  await prisma.list.update({
    where: { id: list.id },
    data:  { viewCount: { increment: 1 } },
  })

  redirect(`/lists/${list.id}`)
}