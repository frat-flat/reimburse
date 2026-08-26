import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { actionLogout } from '@/lib/actions';

export default async function Header() {
  const currentUser = await getCurrentUser();
  
  if (!currentUser) return null;

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
            <Link href="/friends" className="text-xs font-bold text-gray-600 hover:text-indigo-600 transition">
              Mate管理
            </Link>
            <Link href="/members" className="text-xs font-bold text-gray-600 hover:text-indigo-600 transition">
              ベースクルー登録
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
            <Link href="/friends" className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition">
              Mate管理
            </Link>
            <Link href="/members" className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition">
              ベースクルー登録
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
