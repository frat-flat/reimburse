'use client';

import React, { useState, useTransition } from 'react';
import { actionSendFriendRequest } from '@/lib/actions';
import { Mail, UserPlus, AlertCircle } from 'lucide-react';

export default function AddMateForm() {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    if (!email.trim()) return;

    startTransition(async () => {
      const res = await actionSendFriendRequest(email);
      if (res && res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('Mate申請を送信しました！');
        // フォームをリセット
        (e.target as HTMLFormElement).reset();
      }
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
        <UserPlus className="h-5 w-5 text-indigo-650" />
        <h2 className="text-base font-bold text-gray-900">Mateを追加する</h2>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs flex items-start gap-1.5 font-medium animate-fade-in">
          <AlertCircle className="h-4 w-4 text-red-650 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-250 text-emerald-700 px-3 py-2 rounded-lg text-xs flex items-start gap-1.5 font-bold animate-fade-in">
          <svg className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            メールアドレス
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="email"
              name="email"
              required
              placeholder="example@mail.com"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-gray-700"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-bold py-2 rounded-lg text-xs transition shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {isPending ? '送信中...' : 'Mate申請を送る'}
        </button>
      </form>
    </div>
  );
}
