import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Bell } from 'lucide-react';
import NotificationsListView from './NotificationsListView';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  let notifications: any[] = [];
  let dbError = false;

  try {
    notifications = await prisma.notification.findMany({
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
      take: 100,
    });
  } catch (error) {
    console.error('Failed to load notifications page:', error);
    dbError = true;
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center shadow-sm">
          <Bell className="h-5.5 w-5.5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">お知らせ・通知一覧</h1>
          <p className="text-xs text-gray-500 font-semibold mt-0.5">
            Mate申請、精算・領収書の発行受取、運営からのシステム案内を確認できます
          </p>
        </div>
      </div>

      {dbError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-sm font-bold text-red-700">
          通知の取得に失敗しました。時間をおいて再度お試しください。
        </div>
      ) : (
        <NotificationsListView initialNotifications={notifications} />
      )}
    </main>
  );
}
