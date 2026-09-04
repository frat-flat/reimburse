import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { actionCreateMember, actionConfirmSettlements } from '@/lib/actions';
import DeleteProjectButton from '@/components/DeleteProjectButton';
import ExpenseList from '@/components/ExpenseList';
import ProjectShareSection from '@/components/ProjectShareSection';
import { Users, Plus, Edit2, ArrowRight, ArrowLeft, Landmark, AlertCircle, FileText } from 'lucide-react';

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
          attachments: true,
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

  // プロジェクト共有リストを別途 try/catch で取得
  let projectShares: any[] = [];
  try {
    projectShares = await prisma.projectShare.findMany({
      where: { projectId },
      include: { user: true },
    });
  } catch (err) {
    console.error('Failed to fetch project shares. Table might not exist yet:', err);
  }

  // アクセス権限チェック (作成者本人、または共有された友達)
  const isOwner = project.createdBy === currentUser.id;
  let projectShare: any = null;

  if (!isOwner) {
    try {
      projectShare = await prisma.projectShare.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: currentUser.id,
          },
        },
      });
    } catch (err) {
      console.error('Failed to check individual project share:', err);
    }
  }

  if (!isOwner && !projectShare) {
    redirect('/dashboard');
  }

  let userRole = isOwner ? 'owner' : (projectShare?.role || 'viewer_all');
  if (userRole === 'viewer') {
    userRole = 'viewer_all';
  }

  // 友達一覧を取得（発起人の場合のみフェッチ）
  let friends: { id: string; name: string; email: string }[] = [];
  if (isOwner) {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: currentUser.id, status: 'accepted' },
          { friendId: currentUser.id, status: 'accepted' },
        ],
      },
      include: {
        user: true,
        friend: true,
      },
    });
    friends = friendships.map((f) => {
      return f.userId === currentUser.id ? f.friend : f.user;
    });
  }

  // 自分に紐づいているメンバーを取得
  const linkedMember = project.members.find(
    (m) => m.userId === currentUser.id || m.name === currentUser.name
  );

  // 個人閲覧(viewer_personal)の場合、自分に関わる支出のみにフィルタリング
  let displayExpenses = project.expenses;
  if (userRole === 'viewer_personal' && linkedMember) {
    displayExpenses = project.expenses.filter((e) => {
      const isPayer = e.payments.some((p) => p.memberId === linkedMember.id);
      const isSharer = e.shares.some((s) => s.memberId === linkedMember.id);
      return isPayer || isSharer;
    });
  }

  const totalExpense = displayExpenses.reduce((sum, e) => sum + e.amount, 0);

  // ステータスの表示マッピング
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-3 py-1 rounded-full font-extrabold">
            精算中
          </span>
        );
      case 'settlement_confirmed':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-3 py-1 rounded-full font-extrabold">
            精算確定
          </span>
        );
      case 'completed':
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs px-3 py-1 rounded-full font-extrabold">
            完了
          </span>
        );
      default:
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-3 py-1 rounded-full font-extrabold">
            {status}
          </span>
        );
    }
  };

  // 精算確定のサーバーアクションラッパー
  const handleConfirmSettlements = async () => {
    'use server';
    await actionConfirmSettlements(projectId);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 戻るリンク & ステータス */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs sm:text-sm text-slate-500 hover:text-indigo-600 font-bold transition group"
        >
          <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-0.5 transition-transform" />
          ダッシュボードへ戻る
        </Link>
        <div className="flex items-center gap-1.5">
          {getStatusBadge(project.status)}
        </div>
      </div>

      {/* イベント基本情報ヒーローカード */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                {project.name}
              </h1>
            </div>
            
            {project.description ? (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {project.description}
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">説明はありません</p>
            )}
          </div>

          {/* 右側：総支出額サマリー */}
          <div className="flex items-center gap-3 self-stretch md:self-auto">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-2xl p-4 sm:p-5 flex-1 md:flex-initial flex flex-col justify-center items-center text-center min-w-[160px] shadow-2xs">
              <span className="text-[11px] text-indigo-700 font-extrabold uppercase tracking-wider">
                イベント総支出
              </span>
              <strong className="text-2xl sm:text-3xl font-black text-indigo-950 font-mono mt-0.5">
                {totalExpense.toLocaleString()}<span className="text-sm font-sans font-bold ml-1">円</span>
              </strong>
            </div>

            {/* 管理ボタン群 */}
            <div className="flex flex-col sm:flex-row items-center gap-1.5 flex-shrink-0">
              <Link
                href={`/projects/${projectId}/report`}
                className="w-full sm:w-auto p-2.5 sm:px-3 text-emerald-700 hover:bg-emerald-50 bg-white rounded-xl border border-emerald-200 transition shadow-2xs flex items-center justify-center gap-1.5 text-xs font-bold"
                title="レポートを表示"
              >
                <FileText className="h-4 w-4 text-emerald-600" />
                <span>レポート</span>
              </Link>
              {isOwner && (
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <Link
                    href={`/projects/${projectId}/edit`}
                    className="flex-1 sm:flex-initial p-2.5 sm:px-3 text-slate-700 hover:bg-slate-50 bg-white rounded-xl border border-slate-200 transition shadow-2xs flex items-center justify-center gap-1.5 text-xs font-bold"
                    title="イベントを編集"
                  >
                    <Edit2 className="h-4 w-4 text-slate-500" />
                    <span>編集</span>
                  </Link>
                  <DeleteProjectButton projectId={projectId} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2カラム構成：左側（メンバー & アクション）、右側（支出一覧） */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 items-start">
        {/* 左カラム：参加メンバー・メンバー追加 & アクション */}
        <div className="space-y-5 sm:space-y-6">
          {/* 精算へのメインアクション */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2.5">
            <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              精算アクション
            </h2>
            {project.status === 'active' ? (
              <div className="space-y-2">
                <Link
                  href={`/projects/${projectId}/settlements`}
                  className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 active:scale-98"
                >
                  <Landmark className="h-4 w-4" />
                  <span>精算結果プレビューを見る</span>
                </Link>
                {isOwner && (
                  <form action={handleConfirmSettlements}>
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                    >
                      <span>精算を確定する</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <Link
                href={`/projects/${projectId}/settlements`}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 active:scale-98"
              >
                <Landmark className="h-4 w-4" />
                <span>確定済みの精算結果を見る</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {/* 参加メンバーカード */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Users className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-extrabold text-slate-900">参加メンバー</h2>
              </div>
              <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
                {project.members.length} 人
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {project.members.map((member) => (
                <span
                  key={member.id}
                  className="inline-flex items-center gap-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl font-bold"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  {member.name}
                </span>
              ))}
            </div>

            {project.status === 'active' ? (
              isOwner && (
                <div className="pt-2 border-t border-slate-100">
                  <Link
                    href={`/projects/${projectId}/members`}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition border border-slate-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    メンバーを管理・追加する
                  </Link>
                </div>
              )
            ) : (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 flex items-start gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p>精算が確定しているため、メンバー構成はロックされています。</p>
              </div>
            )}
          </div>

          {/* イベント共有設定 (crew登録: 主催者のみ) */}
          {isOwner && (
            <ProjectShareSection
              projectId={projectId}
              friends={friends}
              members={project.members}
              projectShares={projectShares}
            />
          )}
        </div>

        {/* 右カラム：支出一覧 */}
        <div className="lg:col-span-2 space-y-4">
          <ExpenseList
            initialExpenses={displayExpenses}
            projectId={projectId}
            projectStatus={project.status}
            isOwner={isOwner}
            userRole={userRole}
            currentUserId={currentUser.id}
          />
        </div>
      </div>
    </div>
  );
}
