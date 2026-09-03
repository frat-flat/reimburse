import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { actionLogout } from '@/lib/actions';
import { prisma } from '@/lib/prisma';
import { Calendar, Users, Receipt, UserCheck, User, LogOut } from 'lucide-react';

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
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-lg sm:text-xl font-black tracking-tight text-indigo-600 flex items-center gap-2 hover:opacity-90 flex-shrink-0">
            <img src="/logo.png" alt="TaTekæTa Logo" className="w-7 h-7 rounded-lg object-contain shadow-xs flex-shrink-0" />
            <span>TaTekæTa</span>
          </Link>
          
          {/* モバイル用ナビゲーション & ログアウト（アイコンのみで省スペース・重なり防止） */}
          <div className="flex items-center gap-0.5 sm:gap-1 md:hidden">
            <Link
              href="/dashboard"
              title="イベント一覧"
              className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
            >
              <Calendar className="h-5 w-5" />
            </Link>
            
            <Link
              href="/friends"
              title="Mate管理"
              className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition relative"
            >
              <Users className="h-5 w-5" />
              {mateNotificationCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] px-1 py-0.2 rounded-full font-black leading-none min-w-[12px] text-center shadow-sm">
                  {mateNotificationCount}
                </span>
              )}
            </Link>
            
            <Link
              href="/receipts"
              title="領収一覧"
              className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
            >
              <Receipt className="h-5 w-5" />
            </Link>
            
            <Link
              href="/members"
              title="ベースクルー登録"
              className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
            >
              <UserCheck className="h-5 w-5" />
            </Link>
            
            <Link
              href="/profile"
              title="マイページ"
              className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
            >
              <User className="h-5 w-5" />
            </Link>
            
            <form action={actionLogout} className="flex items-center">
              <button
                type="submit"
                title="ログアウト"
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>

        {/* デスクトップ用ナビゲーション & ログインステータス */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>イベント一覧</span>
            </Link>
            <Link href="/friends" className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition relative flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>Mate管理</span>
              {mateNotificationCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[8px] px-1.2 py-0.5 rounded-full font-black leading-none min-w-[12px] text-center shadow-sm">
                  {mateNotificationCount}
                </span>
              )}
            </Link>
            <Link href="/receipts" className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition flex items-center gap-1.5">
              <Receipt className="h-4 w-4" />
              <span>領収一覧</span>
            </Link>
            <Link href="/members" className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition flex items-center gap-1.5">
              <UserCheck className="h-4 w-4" />
              <span>ベースクルー登録</span>
            </Link>
            <Link href="/profile" className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition flex items-center gap-1.5">
              <User className="h-4 w-4" />
              <span>マイページ</span>
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700 font-medium bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
              ログイン: <strong className="text-gray-900">{currentUser.name}</strong>
            </span>
            <form action={actionLogout}>
              <button
                type="submit"
                className="text-sm font-medium text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <LogOut className="h-4 w-4" />
                <span>ログアウト</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
