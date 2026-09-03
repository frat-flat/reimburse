'use client';

import { useState, useTransition } from 'react';
import { actionLogin, actionRegister, actionResetPassword } from '@/lib/actions';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'reset'>('login');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 通常ログイン
  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const res = await actionLogin(formData);
      if (res && res.error) {
        setErrorMsg(res.error);
      }
    });
  };

  // ユーザー登録
  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await actionRegister(formData);
      if (res && res.error) {
        setErrorMsg(res.error);
      }
    });
  };

  // パスワード再設定
  const handleResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await actionResetPassword(formData);
      if (res && res.error) {
        setErrorMsg(res.error);
      } else if (res && res.success) {
        alert('パスワードの再設定が完了しました！新しいパスワードでログインしてください。');
        setActiveTab('login');
      }
    });
  };

  return (
    <div className="max-w-md w-full space-y-6 bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100">
      <div className="flex flex-col items-center">
        <img src="/logo.png" alt="TaTekæTa Logo" className="w-16 h-16 rounded-2xl shadow-md mb-3 object-contain" />
        <h2 className="text-center text-3xl font-black text-gray-900 tracking-tight">
          TaTekæTa
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          複数人での支出を簡単に割り勘・精算
        </p>
      </div>

      {/* エラー表示 */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center font-medium">
          {errorMsg}
        </div>
      )}

      {/* タブ切り替え */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => { setActiveTab('login'); setErrorMsg(null); }}
          className={`w-1/2 pb-3 text-center text-sm font-semibold border-b-2 ${
            activeTab === 'login'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          ログイン
        </button>
        <button
          onClick={() => { setActiveTab('register'); setErrorMsg(null); }}
          className={`w-1/2 pb-3 text-center text-sm font-semibold border-b-2 ${
            activeTab === 'register'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          新規アカウント登録
        </button>
      </div>

      {activeTab === 'login' ? (
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              name="email"
              type="email"
              required
              defaultValue="admin@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition text-gray-900 bg-white"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-semibold text-gray-700">
                パスワード
              </label>
              <button
                type="button"
                onClick={() => { setActiveTab('reset'); setErrorMsg(null); }}
                className="text-xs font-semibold text-indigo-650 hover:text-indigo-850 focus:outline-none transition cursor-pointer"
              >
                パスワードを忘れた場合
              </button>
            </div>
            <input
              name="password"
              type="password"
              required
              defaultValue="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition text-gray-900 bg-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 cursor-pointer"
          >
            {isPending ? '処理中...' : 'ログイン'}
          </button>
        </form>
      ) : activeTab === 'register' ? (
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              ユーザー名（フルネーム）
            </label>
            <input
              name="name"
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition text-gray-900 bg-white"
              placeholder="例: 山田 太郎"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              ※ パスワード忘れ時の本人照合で使用するため、姓名（フルネーム）で登録してください。
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition text-gray-900 bg-white"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              パスワード
            </label>
            <input
              name="password"
              type="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition text-gray-900 bg-white"
              placeholder="パスワードを入力してください（空欄時は 'password'）"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 cursor-pointer"
          >
            {isPending ? '登録中...' : '登録してログイン'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-lg leading-relaxed font-semibold">
            ※ デモ環境のため、登録済みの「メールアドレス」と「登録ユーザー名」が完全に一致した場合に、新しいパスワードへ直接再設定して更新できます。
          </p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition text-sm text-gray-900 bg-white"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              登録ユーザー名（表示名）
            </label>
            <input
              name="name"
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition text-sm text-gray-900 bg-white"
              placeholder="例: 吉田京平"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              新しいパスワード
            </label>
            <input
              name="newPassword"
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition text-sm text-gray-900 bg-white"
              placeholder="新しいパスワードを入力"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setErrorMsg(null); }}
              className="flex-1 bg-gray-100 hover:bg-gray-250 text-gray-700 font-bold py-2 rounded-lg text-xs transition border border-gray-200 cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-750 text-white font-bold py-2 rounded-lg text-xs transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isPending ? '再設定中...' : 'パスワードを再設定する'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

