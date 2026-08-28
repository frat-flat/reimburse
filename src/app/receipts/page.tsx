import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ReceiptsList from '@/components/ReceiptsList';
import { Receipt } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ReceiptsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  let receivedReceipts: any[] = [];
  let issuedReceipts: any[] = [];
  let dbError = false;

  try {
    // 1. 受け取った領収書 (自分が支払う側かつ領収書発行済み)
    receivedReceipts = await prisma.settlement.findMany({
      where: {
        status: 'receipt_issued',
        payerMember: {
          userId: currentUser.id,
        },
      },
      include: {
        project: true,
        payerMember: {
          include: {
            user: true,
          },
        },
        receiverMember: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        paidAt: 'desc',
      },
    });

    // 2. 発行した領収書 (自分が受け取る側かつ領収書発行済み)
    issuedReceipts = await prisma.settlement.findMany({
      where: {
        status: 'receipt_issued',
        receiverMember: {
          userId: currentUser.id,
        },
      },
      include: {
        project: true,
        payerMember: {
          include: {
            user: true,
          },
        },
        receiverMember: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        paidAt: 'desc',
      },
    });
  } catch (error) {
    console.error('Failed to load receipts list:', error);
    dbError = true;
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center shadow-sm">
          <Receipt className="h-5.5 w-5.5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">領収一覧</h1>
          <p className="text-xs text-gray-500 font-semibold mt-0.5">
            すべてのイベントで発行・受取された領収書を確認できます
          </p>
        </div>
      </div>

      {dbError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-sm font-bold text-red-700">
          データベースからのデータ取得に失敗しました。時間をおいて再度お試しください。
        </div>
      ) : (
        <ReceiptsList
          receivedReceipts={receivedReceipts}
          issuedReceipts={issuedReceipts}
        />
      )}
    </main>
  );
}
