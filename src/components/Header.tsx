import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { actionLogout } from '@/lib/actions';
import { prisma } from '@/lib/prisma';

export default async function Header() {
  const currentUser = await getCurrentUser();
  
  if (!currentUser) return null;

  // 未読のMate通知数をカウント
  let mateNotificationCount = 0;
  try {
    const pendingReceivedCount = await prisma.friendship.count({
      where: {
        friendId: currentUser.id,
        status: 'pending',
      },
    });

    const unreadAcceptedCount = await prisma.friendship.count({
      where: {
        userId: currentUser.id,
        status: 'accepted',
        isReadBySender: false,
      },
    });

    mateNotificationCount = pendingReceivedCount + unreadAcceptedCount;
  } catch (e) {
    console.error('Failed to load mate notification count:', e);
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 print:hidden">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-indigo-600 flex items-center gap-1.5 hover:opacity-90">
            <span>立替精算システム</span>
          </Link>
          
          {/* モバイル用ナビゲーション & ログアウト */}
          <div className="flex items-center gap-2.5 md:hidden">
            <Link href="/dashboard" className="text-xs font-bold text-gray-600 hover:text-indigo-600 transition">
              イベント
            </Link>
            <Link href="/friends" className="text-xs font-bold text-gray-600 hover:text-indigo-600 transition relative">
              <span>Mate管理</span>
              {mateNotificationCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[8px] px-1 py-0.2 rounded-full font-black leading-none min-w-[12px] text-center shadow-sm">
                  {mateNotificationCount}
                </span>
              )}
            </Link>
            <Link href="/receipts" className="text-xs font-bold text-gray-600 hover:text-indigo-600 transition">
              領収一覧
            </Link>
            <Link href="/members" className="text-xs font-bold text-gray-600 hover:text-indigo-600 transition">
              ベースクルー登録
            </Link>
            <Link href="/profile" className="text-xs font-bold text-gray-600 hover:text-indigo-600 transition">
              マイページ
            </Link>
            <form action={actionLogout}>
              <button type="submit" className="text-xs text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 px-2 py-1 rounded">
                ログアウト
              </button>
            </form>
          </div>
        </div>

        {/* デスクトップ用ナビゲーション & ログインステータス */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition">
              イベント一覧
            </Link>
            <Link href="/friends" className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition relative">
              <span>Mate管理</span>
              {mateNotificationCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[8px] px-1.2 py-0.5 rounded-full font-black leading-none min-w-[12px] text-center shadow-sm">
                  {mateNotificationCount}
                </span>
              )}
            </Link>
            <Link href="/receipts" className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition">
              領収一覧
            </Link>
            <Link href="/members" className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition">
              ベースクルー登録
            </Link>
            <Link href="/profile" className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition">
              マイページ
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700 font-medium bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
              ログイン: <strong className="text-gray-900">{currentUser.name}</strong>
            </span>
            <form action={actionLogout}>
              <button
                type="submit"
                className="text-sm font-medium text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
