import { prisma } from "@/lib/prisma";

export type NotificationType =
    | 'RESERVATION'
    | 'COMMENT'
    | 'GROUP_INVITE'
    | 'LIST_INVITE'
    | 'BADGE_EARNED'

interface CreateNotificationInput {
    userId: string
    type: NotificationType
    title: string
    message: string
    link?: string
}

export async function CreateNotification(input: CreateNotificationInput) {
    return prisma.notification.create({
        data: {
            userId: input.userId,
            type: input.type,
            title: input.title,
            message: input.message,
            link: input.link,
        },
    })
}

export async function getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
        where: { userId, read: false },
    })
}