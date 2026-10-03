import { prisma } from './prisma';
import { sendNotificationEmail } from './email';

// サーバー内部専用の通知作成ヘルパー。
// 'use server' ファイルから export するとクライアントから直接呼べてしまうため、Server Action とは別モジュールに置く。

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
 * 個別ユーザー宛てに通知を作成＆登録メールアドレスへ自動配信
 */
export async function createNotification(input: CreateNotificationInput) {
  try {
    // 通知作成とユーザー情報取得を並列実行（3往復から1往復へ短縮）
    const [notification, recipient, sender] = await Promise.all([
      prisma.notification.create({
        data: {
          userId: input.userId,
          senderId: input.senderId || null,
          type: input.type,
          title: input.title,
          message: input.message,
          link: input.link || null,
        },
      }),
      prisma.user.findUnique({
        where: { id: input.userId },
        select: { email: true, name: true },
      }),
      input.senderId
        ? prisma.user.findUnique({
            where: { id: input.senderId },
            select: { name: true },
          })
        : Promise.resolve(null),
    ]);

    const senderName = sender?.name || null;

    if (recipient?.email) {
      sendNotificationEmail({
        to: recipient.email,
        toName: recipient.name,
        title: input.title,
        message: input.message,
        link: input.link,
        senderName,
        type: input.type,
      }).catch((err) => console.error('[Notification Email Error]:', err));
    }

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

/**
 * 全アクティブユーザー宛てに運営・システム通知を一斉配信＆メール配信
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
      select: { id: true, email: true, name: true },
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

    // メール一括配信
    users.forEach((u) => {
      if (u.email) {
        sendNotificationEmail({
          to: u.email,
          toName: u.name,
          title: data.title,
          message: data.message,
          link: data.link,
          senderName: 'TaTekæTa 運営',
          type: data.type || 'SYSTEM',
        }).catch((err) => console.error('[Broadcast Email Error]:', err));
      }
    });

    return { count: result.count };
  } catch (error) {
    console.error('Failed to create broadcast system notification:', error);
    return { count: 0 };
  }
}
