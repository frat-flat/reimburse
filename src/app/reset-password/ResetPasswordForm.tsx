'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { actionCompletePasswordReset } from '@/lib/actions';

export default function ResetPasswordForm({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);

    if (formData.get('newPassword') !== formData.get('confirmPassword')) {
      setErrorMsg('確認用パスワードが一致しません。');
      return;
    }

    startTransition(async () => {
      const res = await actionCompletePasswordReset(formData);
      if (res && res.error) {
        setErrorMsg(res.error);
      } else if (res && res.success) {
        setDone(true);
      }
    });
  };

  return (
    <div className="max-w-md w-full space-y-6 bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-center text-2xl font-black text-gray-900 tracking-tight">
        パスワードの再設定
      </h2>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center font-medium">
          {errorMsg}
        </div>
      )}

      {!token ? (
        <p className="text-sm text-gray-700 text-center">
          再設定リンクが正しくありません。ログイン画面からもう一度メールを送信してください。
        </p>
      ) : done ? (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-lg leading-relaxed font-semibold text-center">
          パスワードを再設定しました。新しいパスワードでログインしてください。
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              新しいパスワード
            </label>
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition text-sm text-gray-900 bg-white"
              placeholder="8文字以上"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              新しいパスワード（確認）
            </label>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition text-sm text-gray-900 bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 cursor-pointer"
          >
            {isPending ? '再設定中...' : 'パスワードを再設定する'}
          </button>
        </form>
      )}

      <div className="text-center">
        <Link href="/login" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
          ログイン画面へ戻る
        </Link>
      </div>
    </div>
  );
}
