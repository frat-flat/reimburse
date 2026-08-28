import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { actionUpdateProfile } from '@/lib/actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ProfileForm from '@/components/ProfileForm';

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

      <ProfileForm
        initialData={{
          receiptIssuerName: user.receiptIssuerName,
          receiptIssuerZip: user.receiptIssuerZip,
          receiptIssuerAddress: user.receiptIssuerAddress,
          receiptIssuerTel: user.receiptIssuerTel,
          receiptIssuerRegNo: user.receiptIssuerRegNo,
          bankCode: user.bankCode,
          bankName: user.bankName,
          branchCode: user.branchCode,
          branchName: user.branchName,
          accountType: user.accountType,
          accountNumber: user.accountNumber,
          accountHolder: user.accountHolder,
          paypayUrl: user.paypayUrl,
          showBankAccount: user.showBankAccount,
          showPaypay: user.showPaypay,
          stampImage: user.stampImage,
          stampSize: user.stampSize,
          stampOffsetX: user.stampOffsetX,
          stampOffsetY: user.stampOffsetY,
          stampOpacity: user.stampOpacity,
        }}
        updateAction={async (formData: FormData) => {
          'use server';
          return await actionUpdateProfile(formData);
        }}
      />
    </div>
  );
}
