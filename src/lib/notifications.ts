'use server';

import { prisma } from './prisma';
import { getCurrentUser } from './auth';
import { revalidatePath } from 'next/cache';

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
