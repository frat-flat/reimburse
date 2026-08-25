'use client';

import { useState, useTransition } from 'react';
import { actionLogin, actionRegister } from '@/lib/actions';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
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

  return (
    <div className="max-w-md w-full space-y-6 bg-white p-6 md:p-8 rounded-xl shadow-md border border-gray-100">
      <div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          立替精算システム
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              パスワード
            </label>
            <input
              name="password"
              type="password"
              required
              defaultValue="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {isPending ? '処理中...' : 'ログイン'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              ユーザー名
            </label>
            <input
              name="name"
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition"
              placeholder="管理者"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition"
              placeholder="パスワードを入力してください（空欄時は 'password'）"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {isPending ? '登録中...' : '登録してログイン'}
          </button>
        </form>
      )}
    </div>
  );
}

