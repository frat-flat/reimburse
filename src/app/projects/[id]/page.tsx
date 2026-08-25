import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { actionCreateMember, actionConfirmSettlements } from '@/lib/actions';
import DeleteProjectButton from '@/components/DeleteProjectButton';
import DeleteExpenseButton from '@/components/DeleteExpenseButton';
import { Users, Plus, Edit2, Trash2, ArrowRight, ArrowLeft, Landmark, MessageSquare, AlertCircle } from 'lucide-react';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const { id: projectId } = await params;

  // プロジェクト情報とメンバー、支出情報を取得
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        orderBy: { name: 'asc' },
      },
      expenses: {
        include: {
          payments: { include: { member: true } },
          shares: { include: { member: true } },
        },
        orderBy: {
          expenseDate: 'desc',
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // 作成者が現在のログインユーザーか確認
  if (project.createdBy !== currentUser.id) {
    redirect('/dashboard');
  }

  const totalExpense = project.expenses.reduce((sum, e) => sum + e.amount, 0);

  // ステータスの表示マッピング
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="bg-emerald-100 text-emerald-800 text-sm px-3 py-1 rounded-full font-bold">精算中</span>;
      case 'settlement_confirmed':
        return <span className="bg-amber-100 text-amber-800 text-sm px-3 py-1 rounded-full font-bold">精算確定</span>;
      case 'completed':
        return <span className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full font-bold">完了</span>;
      default:
        return <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full font-bold">{status}</span>;
    }
  };


  // 精算確定のサーバーアクションラッパー
  const handleConfirmSettlements = async () => {
    'use server';
    await actionConfirmSettlements(projectId);
  };

  return (
    <div className="space-y-6">
      {/* 戻るリンク & ステータス */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 font-medium transition"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          ダッシュボードへ戻る
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">ステータス:</span>
          {getStatusBadge(project.status)}
        </div>
      </div>

      {/* プロジェクト基本情報カード */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{project.name}</h1>
            
            {/* プロジェクト管理ボタン (編集/削除) */}
            <div className="flex items-center gap-2">
              <Link
                href={`/projects/${projectId}/edit`}
                className="p-2 text-indigo-600 hover:text-indigo-850 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-colors shadow-sm flex items-center justify-center gap-1 text-sm font-semibold"
                title="プロジェクトを編集"
              >
                <Edit2 className="h-4 w-4" />
                <span>編集</span>
              </Link>
              <DeleteProjectButton projectId={projectId} />
            </div>
          </div>
          
          {project.description ? (
            <p className="text-gray-600 text-sm">{project.description}</p>
          ) : (
            <p className="text-gray-400 text-xs italic">説明はありません</p>
          )}
        </div>
        <div className="bg-indigo-50 rounded-xl p-4 flex flex-col justify-center items-center text-center">
          <span className="text-xs text-indigo-700 font-bold uppercase tracking-wider">総支出</span>
          <strong className="text-2xl md:text-3xl font-black text-indigo-950 mt-1">
            {totalExpense.toLocaleString()}円
          </strong>
        </div>
      </div>

      {/* 2カラム構成：左側（メンバー & アクション）、右側（支出一覧） */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* 左カラム：参加メンバー・メンバー追加 */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <h2 className="text-base font-bold text-gray-900">参加メンバー</h2>
              </div>
              <span className="text-xs font-bold text-gray-500">
                {project.members.length} 人
              </span>
            </div>

            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {project.members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between text-sm text-gray-800 bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg"
                >
                  <span className="font-semibold">{member.name}</span>
                </li>
              ))}
            </ul>

            {project.status === 'active' ? (
              <div className="pt-2 border-t border-gray-100">
                <Link
                  href={`/projects/${projectId}/members`}
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 rounded-lg text-xs transition border border-indigo-100 shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  メンバーを登録・管理する
                </Link>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-1.5 pt-2 border-t border-gray-100">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p>精算が確定または完了しているため、メンバーの登録・変更はできません。</p>
              </div>
            )}
          </div>

          {/* 精算へのメインアクション */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
            {project.status === 'active' ? (
              <>
                <Link
                  href={`/projects/${projectId}/settlements`}
                  className="w-full bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-200 font-bold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Landmark className="h-4 w-4" />
                  精算結果プレビューを見る
                </Link>
                <form action={handleConfirmSettlements}>
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    精算を確定する
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </>
            ) : (
              <Link
                href={`/projects/${projectId}/settlements`}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Landmark className="h-4 w-4" />
                確定済みの精算結果を見る
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        {/* 右カラム：支出一覧 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-indigo-600" />
                <h2 className="text-base font-bold text-gray-900">支出項目</h2>
              </div>
              
              {project.status === 'active' ? (
                <Link
                  href={`/projects/${projectId}/expenses/new`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition inline-flex items-center gap-1 shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  支出を追加
                </Link>
              ) : (
                <span className="text-xs text-gray-500 font-medium">支出追加不可 (ロック済)</span>
              )}
            </div>

            {project.expenses.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                登録されている支出項目はありません。
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {project.expenses.map((expense) => {
                  const payerName = expense.payments[0]?.member.name || '不明';
                  const shareMemberNames = expense.shares.map((s) => s.member.name).join(', ');
                  const formattedDate = expense.expenseDate
                    ? new Date(expense.expenseDate).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      })
                    : '';

                  return (
                    <div key={expense.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-gray-900">{expense.title}</h3>
                            {formattedDate && (
                              <span className="text-[10px] bg-gray-100 border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded-md font-bold">
                                {formattedDate}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            支払者: <strong className="text-gray-700">{payerName}</strong>
                            {' | '}
                            負担: <span className="text-gray-600" title={shareMemberNames}>
                              {expense.shares.length}人 ({expense.shares[0]?.member.name}...)
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <strong className="text-base font-black text-gray-900">
                            {expense.amount.toLocaleString()}円
                          </strong>
                          
                          {/* 編集・削除（ステータスactiveのみ） */}
                          {project.status === 'active' && (
                            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                              <Link
                                href={`/projects/${projectId}/expenses/${expense.id}/edit`}
                                className="p-1.5 hover:bg-gray-50 border-r border-gray-200 text-gray-500 hover:text-indigo-600 transition"
                                title="編集"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Link>
                              <DeleteExpenseButton expenseId={expense.id} />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {expense.memo && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-start gap-1">
                          <MessageSquare className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                          <p>{expense.memo}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
