'use server';

import { prisma } from './prisma';
import { getCurrentUser } from './auth';
import { revalidatePath } from 'next/cache';

export type NotificationType =
  | 'SYSTEM'
  | 'MATE_REQUEST'
  | 'MATE_ACCEPTED'
  | 'SETTLEMENT_PAID'
  | 'RECEIPT_ISSUED'
  | 'RECEIPT_REISSUE_REQUEST'
  | 'PROJECT_SHARE';

export interface CreateNotificationInput {
  userId: string;
  senderId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
}

/**
 * 個別ユーザー宛てに通知を作成
 */
export async function createNotification(input: CreateNotificationInput) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        senderId: input.senderId || null,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link || null,
      },
    });
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

/**
 * 全アクティブユーザー宛てに運営・システム通知を一斉配信
 */
export async function createSystemNotificationToAllUsers(data: {
  title: string;
  message: string;
  link?: string | null;
  type?: NotificationType;
}) {
  try {
    const users = await prisma.user.findMany({
      where: { status: 'active' },
      select: { id: true },
    });

    if (users.length === 0) return { count: 0 };

    const result = await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        senderId: null,
        type: data.type || 'SYSTEM',
        title: data.title,
        message: data.message,
        link: data.link || null,
      })),
    });

    return { count: result.count };
  } catch (error) {
    console.error('Failed to create broadcast system notification:', error);
    return { count: 0 };
  }
}

/**
 * ログインユーザーの通知一覧と未読件数を取得
 */
export async function actionGetNotifications() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { notifications: [], unreadCount: 0 };

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: currentUser.id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: currentUser.id,
        isRead: false,
      },
    });

    return { notifications, unreadCount };
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return { notifications: [], unreadCount: 0 };
  }
}

/**
 * 特定の通知を既読にする
 */
export async function actionMarkNotificationAsRead(notificationId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) return { error: '通知が見つかりません。' };
    if (notification.userId !== currentUser.id) {
      return { error: '権限がありません。' };
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return { error: '通知の更新に失敗しました。' };
  }
}

/**
 * ログインユーザーの全通知を一括で既読にする
 */
export async function actionMarkAllNotificationsAsRead() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  try {
    await prisma.notification.updateMany({
      where: {
        userId: currentUser.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return { error: '一括既読処理に失敗しました。' };
  }
}
