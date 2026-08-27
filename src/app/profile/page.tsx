import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { actionUpdateProfile } from '@/lib/actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  // データベースから最新のユーザー情報を取得
  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
  });

  if (!user) {
    redirect('/login');
  }

  const { success, error } = await searchParams;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">マイページ</h1>
          <p className="text-xs text-gray-500 mt-1">
            アカウント情報や、領収書発行時の発行元（あなた）の情報を設定します。
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-xs font-bold text-indigo-650 hover:text-indigo-800 transition"
        >
          ダッシュボードへ戻る
        </Link>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3.5 rounded-xl">
          プロフィールを更新しました！
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-bold p-3.5 rounded-xl">
          {error}
        </div>
      )}

      {/* ユーザーアカウント情報 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-gray-800 border-l-4 border-indigo-600 pl-2">
          アカウント情報
        </h2>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="block text-gray-400 font-bold mb-0.5">登録ユーザー名 (姓名)</span>
            <strong className="text-gray-800 font-extrabold">{user.name}</strong>
          </div>
          <div>
            <span className="block text-gray-400 font-bold mb-0.5">メールアドレス</span>
            <strong className="text-gray-800 font-extrabold">{user.email}</strong>
          </div>
        </div>
      </div>

      {/* 領収書発行元情報設定フォーム */}
      <form
        action={async (formData: FormData) => {
          'use server';
          const res = await actionUpdateProfile(formData);
          if (res.success) {
            redirect('/profile?success=true');
          } else {
            redirect(`/profile?error=${encodeURIComponent(res.error || 'エラーが発生しました')}`);
          }
        }}
        className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4"
      >
        <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800 border-l-4 border-indigo-600 pl-2">
            領収書の発行元情報
          </h2>
          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">
            インボイス対応
          </span>
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed font-semibold">
          イベントで精算金を受け取る（領収書を発行する）際に、領収書の署名欄に印字されるあなたの情報を入力してください。
        </p>

        <div className="space-y-3.5 text-xs">
          {/* 発行者名 */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              発行元 氏名または会社名・屋号
            </label>
            <input
              type="text"
              name="receiptIssuerName"
              defaultValue={user.receiptIssuerName || user.name}
              placeholder="例: 小笠原 太一 / 合同会社オガサワラ"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
            />
          </div>

          {/* インボイス番号 */}
          <div>
            <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
              <span>適格請求書発行事業者登録番号 (インボイス番号)</span>
              <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1 py-0.2 rounded font-semibold">任意</span>
            </label>
            <input
              type="text"
              name="receiptIssuerRegNo"
              defaultValue={user.receiptIssuerRegNo || ''}
              placeholder="例: T1234567890123"
              maxLength={14}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 郵便番号 */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                郵便番号
              </label>
              <input
                type="text"
                name="receiptIssuerZip"
                defaultValue={user.receiptIssuerZip || ''}
                placeholder="例: 100-0001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
              />
            </div>

            {/* 電話番号 */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                電話番号
              </label>
              <input
                type="tel"
                name="receiptIssuerTel"
                defaultValue={user.receiptIssuerTel || ''}
                placeholder="例: 090-0000-0000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* 住所 */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              住所
            </label>
            <input
              type="text"
              name="receiptIssuerAddress"
              defaultValue={user.receiptIssuerAddress || ''}
              placeholder="例: 東京都千代田区千代田1-1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-bold py-2 rounded-xl text-xs transition shadow-sm active:scale-98 cursor-pointer"
          >
            発行元情報を保存する
          </button>
        </div>
      </form>
    </div>
  );
}
