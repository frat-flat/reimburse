import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { calculateSettlements } from '@/lib/settlement';
import ReceiptModal from '@/components/ReceiptModal';
import BankInfoModal from '@/components/BankInfoModal';
import DisclosureToggles from '@/components/DisclosureToggles';
import SwipeStatusButton from '@/components/SwipeStatusButton';
import {
  actionConfirmSettlements,
  actionUnlockSettlements,
} from '@/lib/actions';
import { ArrowLeft, Landmark, AlertTriangle, ArrowRight, Sparkles, RefreshCw, Smartphone, Eye } from 'lucide-react';

interface SettlementsPageProps {
  params: Promise<{ id: string }>;
}

export default async function SettlementsPage({ params }: SettlementsPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const { id: projectId } = await params;

  // プロジェクト情報、メンバー、支出、精算一覧を取得
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: {
          user: true,
        },
      },
      expenses: {
        include: {
          payments: true,
          shares: true,
        },
      },
      settlements: {
        include: {
          payerMember: true,
          receiverMember: {
            include: {
              user: true,
            },
          },
        },
      },
      projectShares: true,
    },
  });

  if (!project) {
    notFound();
  }

  // 作成者（管理者）または共有メンバーのチェック
  const isOwner = project.createdBy === currentUser.id;
  const userShare = project.projectShares.find((ps) => ps.userId === currentUser.id);

  if (!isOwner && !userShare) {
    redirect('/dashboard');
  }

  const userRole = isOwner
    ? 'owner'
    : (userShare?.role as 'editor' | 'viewer_all' | 'viewer_personal' | undefined) ||
      'viewer_all';

  // 1. 各メンバーの純残高を集計
  const memberBalances = project.members.map((m) => {
    let totalPaid = 0;
    let totalShare = 0;

    project.expenses.forEach((e) => {
      e.payments.forEach((p) => {
        if (p.memberId === m.id) totalPaid += p.amount;
      });
      e.shares.forEach((s) => {
        if (s.memberId === m.id) totalShare += s.shareAmount;
      });
    });

    return {
      userId: m.id, // calculateSettlements 汎用キー名
      name: m.name,
      paid: totalPaid,
      share: totalShare,
      balance: totalPaid - totalShare,
    };
  });

  // 不変条件チェック
  const sumBalances = memberBalances.reduce((sum, mb) => sum + mb.balance, 0);
  const totalExpense = project.expenses.reduce((sum, e) => sum + e.amount, 0);

  // 2. 精算リストの構築
  let settlementsList: {
    id?: string;
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    toUserName: string;
    amount: number;
    status: 'pending' | 'paid' | 'receipt_issued';
  }[] = [];

  const isConfirmed = project.status === 'settlement_confirmed' || project.status === 'completed';

  // 紐づいているメンバーと領収書情報を解決
  const linkedMember = project.members.find((m) => m.userId === currentUser.id || m.name === currentUser.name);
  const dateString = new Date(project.updatedAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const issuerInfo = {
    name: currentUser.receiptIssuerName,
    zip: currentUser.receiptIssuerZip,
    address: currentUser.receiptIssuerAddress,
    tel: currentUser.receiptIssuerTel,
    regNo: currentUser.receiptIssuerRegNo,
  };

  if (isConfirmed) {
    // 確定済みの場合はDBから取得したデータを使用
    settlementsList = project.settlements.map((s) => ({
      id: s.id,
      fromUserId: s.payerMemberId,
      fromUserName: s.payerMember.name,
      toUserId: s.receiverMemberId,
      toUserName: s.receiverMember.name,
      amount: s.amount,
      status: s.status as 'pending' | 'paid' | 'receipt_issued',
    }));
  } else {
    // プレビュー状態の場合はリアルタイムに計算
    const calculated = calculateSettlements(
      memberBalances.map((mb) => ({ userId: mb.userId, balance: mb.balance }))
    );
    settlementsList = calculated.map((c) => ({
      fromUserId: c.fromUserId,
      fromUserName: project.members.find((m) => m.id === c.fromUserId)?.name || '不明',
      toUserId: c.toUserId,
      toUserName: project.members.find((m) => m.id === c.toUserId)?.name || '不明',
      amount: c.amount,
      status: 'pending' as 'pending' | 'paid' | 'receipt_issued',
    }));
  }

  // 閲覧者の場合：自分に関係する（自分が支払う、または自分が受け取る）精算ルートのみに絞り込む
  if (!isOwner && userRole !== 'editor' && linkedMember) {
    settlementsList = settlementsList.filter(
      (s) => s.fromUserId === linkedMember.id || s.toUserId === linkedMember.id
    );
  }


  // 確定処理のアクションラッパー
  const handleConfirm = async () => {
    'use server';
    await actionConfirmSettlements(projectId);
  };

  // 確定解除のアクションラッパー
  const handleUnlock = async () => {
    'use server';
    await actionUnlockSettlements(projectId);
  };



  return (
    <div className="space-y-6">
      {/* 上部ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 font-medium transition"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          イベント詳細へ戻る
        </Link>
        <div className="flex items-center gap-2 text-xs md:text-sm font-semibold text-gray-500 bg-white border border-gray-200 px-3 py-1 rounded-lg">
          <span>状態:</span>
          {project.status === 'active' ? (
            <span className="text-emerald-700 font-bold">プレビュー (未確定)</span>
          ) : project.status === 'settlement_confirmed' ? (
            <span className="text-amber-700 font-bold">精算確定 (ロック済)</span>
          ) : (
            <span className="text-gray-700 font-bold">精算完了</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* 左側：精算ルート取引リスト */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-sm space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Landmark className="h-5.5 w-5.5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">{isConfirmed ? '精算結果' : '精算シミュレーター'}</h2>
              </div>
              <span className="text-xs text-gray-500 font-semibold">
                送金取引: {settlementsList.length} 件
              </span>
            </div>

            {/* システム不変条件の警告表示 (デバッグ用) */}
            {Math.abs(sumBalances) > 0.1 && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-bold">データの不整合が検出されました</p>
                  <p>純残高の合計が0円になっていません。管理者にお問い合わせください。</p>
                </div>
              </div>
            )}

            {settlementsList.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500 font-medium">
                <Sparkles className="mx-auto h-8 w-8 text-indigo-400 mb-2" />
                全員の立替・負担額が既に一致しています。精算は不要です！
              </div>
            ) : (
              <div className="space-y-3">
                {settlementsList.map((s, idx) => {
                  const recMember = project.members.find((m) => m.id === s.toUserId);
                  const recUser = recMember?.user;
                  return (
                    <div
                      key={s.id || idx}
                      className={`flex items-center justify-between border rounded-xl p-4 transition-all ${
                        s.status === 'paid' || s.status === 'receipt_issued'
                          ? 'bg-gray-50 border-gray-200 opacity-60'
                          : 'bg-white border-indigo-100 shadow-sm'
                      }`}
                    >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full mb-1">
                          支払う
                        </span>
                        <strong className="text-base font-extrabold text-gray-900">{s.fromUserName}</strong>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full mb-1">
                          受け取る
                        </span>
                        <strong className="text-base font-extrabold text-gray-900">{s.toUserName}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <strong className="text-lg md:text-xl font-black text-indigo-950">
                        {s.amount.toLocaleString()}円
                      </strong>

                      {/* 支払済みチェックボタントグル（確定時のみ） */}
                      {isConfirmed && s.id && (
                        <div className="flex items-center gap-2">
                          {/* 領収書発行ボタン：
                              1. 主催者 (isOwner) の場合は、デモ確認・印刷テスト用にすべての支払済取引で領収書発行が可能
                              2. 一般メンバーの場合は、自分がReceiver（受け取る側）かつ「支払済(paid)」になっている取引のみ発行可能 */}
                          {isConfirmed && (s.status === 'paid' || s.status === 'receipt_issued') && (isOwner || (linkedMember && s.toUserId === linkedMember.id)) && (
                            <ReceiptModal
                              payerName={s.fromUserName}
                              receiverName={s.toUserName}
                              amount={s.amount}
                              projectName={project.name}
                              dateString={dateString}
                              issuerInfo={{
                                name: recUser?.receiptIssuerName || recUser?.name || s.toUserName,
                                zip: recUser?.receiptIssuerZip || '',
                                address: recUser?.receiptIssuerAddress || '',
                                tel: recUser?.receiptIssuerTel || '',
                                regNo: recUser?.receiptIssuerRegNo || '',
                                stampImage: recUser?.stampImage || '',
                                stampSize: recUser?.stampSize || 60,
                              }}
                            />
                          )}

                          {/* 送金元（支払う側）の時の送金アクションショートカット（または主催者のデモ用） */}
                          {(isOwner || (linkedMember && s.fromUserId === linkedMember.id)) && (
                            <div className="flex items-center gap-1.5 mr-1">
                              {/* PayPayで送金 */}
                              {project.allowPaypay !== false && recUser?.paypayUrl && recMember?.showPaypay !== false && (
                                <a
                                  href={recUser.paypayUrl.startsWith('http') ? recUser.paypayUrl : `https://paypay.me/${recUser.paypayUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-extrabold py-1 px-2.5 rounded-lg transition inline-flex items-center gap-1 shadow-sm cursor-pointer"
                                >
                                  <Smartphone className="h-3 w-3 text-red-500" />
                                  <span>PayPayで送金</span>
                                </a>
                              )}

                              {/* 銀行振込先口座情報 */}
                              {project.allowBankTransfer !== false && recUser?.bankName && recUser?.accountNumber && recUser?.accountHolder && recMember?.showBankAccount !== false && (
                                <BankInfoModal
                                  bankName={recUser.bankName}
                                  bankCode={recUser.bankCode}
                                  branchName={recUser.branchName || ''}
                                  branchCode={recUser.branchCode}
                                  accountType={recUser.accountType || '普通'}
                                  accountNumber={recUser.accountNumber}
                                  accountHolder={recUser.accountHolder}
                                />
                              )}
                            </div>
                          )}

                          <SwipeStatusButton
                            settlementId={s.id}
                            currentStatus={s.status as 'pending' | 'paid' | 'receipt_issued'}
                            canOperate={!!linkedMember && s.toUserId === linkedMember.id}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 右側：確定/解除のアクション & プロジェクト統計 */}
        <div className="space-y-6">
          {/* このイベントでの決済情報の開示トグル（共有メンバー自身の場合のみ） */}
          {linkedMember && (
            <DisclosureToggles
              memberId={linkedMember.id}
              initialShowBank={linkedMember.showBankAccount}
              initialShowPaypay={linkedMember.showPaypay}
            />
          )}

          {/* 精算コントロールカード */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
              精算アクション
            </h3>

            {isOwner ? (
              project.status === 'active' ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    ※ 現在はプレビュー計算です。「精算を確定する」を押すと計算結果が保存され、支出の追加・編集がロックされます。
                  </p>
                  <form action={handleConfirm}>
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-98"
                    >
                      この内容で精算を確定する
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    ※ 精算は確定されています。メンバーや支出の追加・修正を行う場合は、精算確定を一時的に解除してください。
                  </p>
                  <form action={handleUnlock}>
                    <button
                      type="submit"
                      className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-98"
                    >
                      <RefreshCw className="h-4 w-4" />
                      精算確定を解除
                    </button>
                  </form>
                </div>
              )
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-650 leading-relaxed font-bold bg-slate-50 p-3.5 border border-slate-200 rounded-lg">
                  {project.status === 'active'
                    ? '⚠️ 精算の確定は、イベントの主催者（オーナー）のみが行えます。確定されるまで今しばらくお待ちください。'
                    : '✅ 精算は主催者によって確定（ロック）されています。追加の支出修正等は制限されています。'}
                </p>
              </div>
            )}
          </div>

          {/* イベント金額統計 */}
          <div className="bg-indigo-950 text-indigo-100 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-300">
              イベント統計
            </h3>
            <div className="space-y-2.5 divide-y divide-indigo-900 text-xs">
              <div className="flex justify-between py-1.5">
                <span className="text-indigo-300">総支出</span>
                <strong className="text-sm text-white font-extrabold">
                  {totalExpense.toLocaleString()}円
                </strong>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-indigo-300">参加人数</span>
                <strong className="text-sm text-white font-extrabold">
                  {project.members.length}人
                </strong>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-indigo-300">平均負担額</span>
                <strong className="text-sm text-white font-extrabold">
                  {project.members.length > 0
                    ? Math.round(totalExpense / project.members.length).toLocaleString()
                    : 0}
                  円
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 下部：個人別内訳 */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">個人別内訳</h2>

        {/* 1. 自身の横長ワイドカード */}
        {(() => {
          const myBalance = linkedMember ? memberBalances.find((mb) => mb.userId === linkedMember.id) : null;
          if (!myBalance) return null;

          const isCreditor = myBalance.balance > 0.001;
          const isDebtor = myBalance.balance < -0.001;
          return (
            <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  {myBalance.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">あなたの内訳</h3>
                  <p className="text-xs text-gray-500 font-semibold">{myBalance.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm font-semibold text-gray-700 md:border-l md:border-indigo-100 md:pl-6 flex-1 max-w-md">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">支払った額 (立替):</span>
                  <span className="text-gray-900 font-black text-base">{myBalance.paid.toLocaleString()}円</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">本来の負担:</span>
                  <span className="text-gray-900 font-black text-base">{myBalance.share.toLocaleString()}円</span>
                </div>
              </div>

              <div className={`p-4 rounded-xl text-center font-bold border min-w-[160px] ${
                isCreditor
                  ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                  : isDebtor
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-gray-50 border-gray-150 text-gray-650'
              }`}>
                <div className="text-[10px] uppercase tracking-wider mb-0.5 opacity-85">
                  {isCreditor ? '受取額' : isDebtor ? '支払額' : '過不足なし'}
                </div>
                <strong className="text-lg font-black">
                  {Math.abs(myBalance.balance).toLocaleString()}円
                </strong>
              </div>
            </div>
          );
        })()}

        {/* 2. 他のメンバーの格子カード (主催者・編集者のみ表示) */}
        {(() => {
          const otherBalances = memberBalances.filter((mb) => {
            if (linkedMember && mb.userId === linkedMember.id) return false;
            return isOwner || userRole === 'editor';
          });
          if (otherBalances.length === 0) return null;

          return (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                他のクルーの内訳
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {otherBalances.map((mb) => {
                  const isCreditor = mb.balance > 0.001;
                  const isDebtor = mb.balance < -0.001;

                  return (
                    <div
                      key={mb.userId}
                      className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <h4 className="font-extrabold text-gray-900 text-sm border-b border-gray-100 pb-2 mb-3">
                          {mb.name}
                        </h4>
                        <div className="space-y-1.5 text-xs text-gray-500 mb-4">
                          <div className="flex justify-between">
                            <span>支払った額:</span>
                            <span className="font-semibold text-gray-800">
                              {mb.paid.toLocaleString()}円
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>本来の負担:</span>
                            <span className="font-semibold text-gray-800">
                              {mb.share.toLocaleString()}円
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`mt-auto p-2.5 rounded-lg text-center text-xs font-bold border ${
                          isCreditor
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                            : isDebtor
                            ? 'bg-red-50 border-red-100 text-red-800'
                            : 'bg-gray-50 border-gray-100 text-gray-650'
                        }`}
                      >
                        <div className="text-[10px] uppercase tracking-wider mb-0.5 opacity-85">
                          {isCreditor ? '受取額' : isDebtor ? '支払額' : '過不足なし'}
                        </div>
                        <strong className="text-sm font-black">
                          {Math.abs(mb.balance).toLocaleString()}円
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
