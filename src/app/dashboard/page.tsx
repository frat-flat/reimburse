import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CreateProjectForm from './CreateProjectForm';
import { FolderPlus, Users, DollarSign, ArrowRight } from 'lucide-react';

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  // 自分が管理しているプロジェクト一覧を取得
  const projectsRaw = await prisma.project.findMany({
    where: { createdBy: currentUser.id },
    include: {
      members: true,
      expenses: true,
    },
  });

  // 友達から共有されたプロジェクト一覧を取得
  let sharedSharesRaw: any[] = [];
  try {
    sharedSharesRaw = await prisma.projectShare.findMany({
      where: { userId: currentUser.id },
      include: {
        project: {
          include: {
            members: true,
            expenses: true,
            creator: true,
          },
        },
      },
    });
  } catch (err) {
    console.error('Failed to fetch projectShares. Table might not exist yet:', err);
  }

  // ログインユーザーの共通マスタメンバーを取得
  const masterMembers = await prisma.masterMember.findMany({
    where: { userId: currentUser.id },
    orderBy: { createdAt: 'asc' },
  });

  const projects = projectsRaw
    .map((proj) => {
      const totalExpense = proj.expenses.reduce((sum, e) => sum + e.amount, 0);
      return {
        id: proj.id,
        name: proj.name,
        description: proj.description,
        status: proj.status,
        memberCount: proj.members.length,
        membersText: proj.members.map((mem) => mem.name).join(' / '),
        totalExpense,
        createdAt: proj.createdAt,
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const sharedProjects = sharedSharesRaw
    .map((share) => {
      const proj = share.project;
      const totalExpense = proj.expenses.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);
      return {
        id: proj.id,
        name: proj.name,
        description: proj.description,
        status: proj.status,
        memberCount: proj.members.length,
        membersText: proj.members.map((mem: { name: string }) => mem.name).join(' / '),
        totalExpense,
        createdAt: proj.createdAt,
        role: share.role as 'editor' | 'viewer_all' | 'viewer_personal' | 'viewer',
        ownerName: proj.creator.name,
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // ステータスの日本語表示マッピング
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
            精算中
          </span>
        );
      case 'settlement_confirmed':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
            精算確定
          </span>
        );
      case 'completed':
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
            完了
          </span>
        );
      default:
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">マイイベント</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            参加・作成した精算イベントの確認と管理ができます。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* 左側：イベント一覧 */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          {/* マイイベント (発起人) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>自分で作成したイベント</span>
                <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">
                  {projects.length}
                </span>
              </h2>
            </div>

            {projects.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-10 text-center text-slate-500 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <FolderPlus className="h-6 w-6" />
                </div>
                <p className="font-extrabold text-sm text-slate-800">作成したイベントはありません</p>
                <p className="text-xs text-slate-500 mt-1">右側のフォームから新しくイベントを作成してください。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block bg-white border border-slate-200/80 hover:border-indigo-300 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md active:scale-[0.99] transition-all duration-200 group relative"
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h3 className="font-extrabold text-slate-900 text-base group-hover:text-indigo-600 transition-colors line-clamp-1 flex-1">
                        {project.name}
                      </h3>
                      <div className="flex-shrink-0">{getStatusBadge(project.status)}</div>
                    </div>
                    {project.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                        {project.description}
                      </p>
                    )}
                    <div className="space-y-2.5 mt-auto pt-3 border-t border-slate-100 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 bg-slate-100/80 text-slate-700 font-bold px-2 py-0.5 rounded-md text-[11px]">
                          <Users className="h-3 w-3 text-slate-500" />
                          {project.memberCount}人
                        </span>
                        <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
                          {project.membersText}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-bold text-slate-500">総支出:</span>
                          <strong className="text-indigo-950 font-black font-mono text-base">
                            {project.totalExpense.toLocaleString()}円
                          </strong>
                        </div>
                        <span className="text-xs font-bold text-indigo-600 inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          詳細 <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 共有されたイベント */}
          <div className="space-y-3 pt-4 sm:pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>Mateから共有されたイベント</span>
                <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
                  {sharedProjects.length}
                </span>
              </h2>
            </div>

            {sharedProjects.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-10 text-center text-slate-500 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Users className="h-5 w-5" />
                </div>
                <p className="text-xs text-slate-500">現在、Mateから共有されているイベントはありません</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                {sharedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block bg-white border border-slate-200/80 hover:border-indigo-300 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md active:scale-[0.99] transition-all duration-200 group relative"
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h3 className="font-extrabold text-slate-900 text-base group-hover:text-indigo-600 transition-colors line-clamp-1 flex-1">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold border ${
                          project.role === 'editor' 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                            : project.role === 'viewer_personal'
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}>
                          {project.role === 'editor' ? '編集可能' : project.role === 'viewer_personal' ? '個人閲覧' : '全体閲覧'}
                        </span>
                        {getStatusBadge(project.status)}
                      </div>
                    </div>
                    {project.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                        {project.description}
                      </p>
                    )}
                    <div className="space-y-2.5 mt-auto pt-3 border-t border-slate-100 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 bg-slate-100/80 text-slate-700 font-bold px-2 py-0.5 rounded-md text-[11px]">
                          <Users className="h-3 w-3 text-slate-500" />
                          {project.memberCount}人
                        </span>
                        <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
                          {project.membersText}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-bold text-slate-500">発起人:</span>
                          <strong className="text-slate-800 font-bold text-xs">{project.ownerName}</strong>
                        </div>
                        <span className="text-xs font-bold text-indigo-600 inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          詳細 <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右側：イベント作成フォーム */}
        <CreateProjectForm masterMembers={masterMembers} />
      </div>
    </div>
  );
}
