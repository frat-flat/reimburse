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
        role: share.role as 'viewer' | 'editor',
        ownerName: proj.creator.name,
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // ステータスの日本語表示マッピング
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold">精算中</span>;
      case 'settlement_confirmed':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-semibold">精算確定</span>;
      case 'completed':
        return <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-1 rounded-full font-semibold">完了</span>;
      default:
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-semibold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">マイプロジェクト</h1>
        <p className="text-sm text-gray-600 mt-1">
          現在参加している精算プロジェクトの一覧です。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* 左側：プロジェクト一覧 */}
        <div className="lg:col-span-2 space-y-8">
          {/* マイプロジェクト (発起人) */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <span>自分で作成したプロジェクト ({projects.length})</span>
            </h2>
            {projects.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 shadow-sm">
                <FolderPlus className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p className="font-semibold text-sm text-gray-700">作成したプロジェクトはありません</p>
                <p className="text-xs text-gray-500 mt-1">右側のフォームから新しく作成してください。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block bg-white border border-gray-200 hover:border-indigo-300 rounded-xl p-5 hover:shadow-md transition-all duration-200 group relative"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900 text-base group-hover:text-indigo-600 transition-colors line-clamp-1 pr-6">
                        {project.name}
                      </h3>
                      <div className="flex-shrink-0">{getStatusBadge(project.status)}</div>
                    </div>
                    {project.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 mb-4">
                        {project.description}
                      </p>
                    )}
                    <div className="space-y-2 mt-auto pt-4 border-t border-gray-100 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span className="font-medium text-gray-700">参加者 {project.memberCount}人</span>
                        <span className="text-gray-400">({project.membersText})</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-indigo-500" />
                          <span className="font-medium text-gray-700">総支出: </span>
                          <strong className="text-gray-900 text-sm">
                            {project.totalExpense.toLocaleString()}円
                          </strong>
                        </div>
                        <span className="text-indigo-650 font-medium inline-flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                          詳細 <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 共有されたプロジェクト */}
          <div className="space-y-3 pt-6 border-t border-gray-200">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <span>友達から共有されたプロジェクト ({sharedProjects.length})</span>
            </h2>
            {sharedProjects.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 shadow-sm">
                <Users className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                <p className="text-xs text-gray-500">共有されたプロジェクトはありません</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sharedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block bg-white border border-gray-200 hover:border-indigo-300 rounded-xl p-5 hover:shadow-md transition-all duration-200 group relative"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900 text-base group-hover:text-indigo-600 transition-colors line-clamp-1 pr-6">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold border ${
                          project.role === 'editor' 
                            ? 'bg-indigo-50 border-indigo-100 text-indigo-750' 
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}>
                          {project.role === 'editor' ? '編集可能' : '閲覧のみ'}
                        </span>
                        {getStatusBadge(project.status)}
                      </div>
                    </div>
                    {project.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 mb-4">
                        {project.description}
                      </p>
                    )}
                    <div className="space-y-2 mt-auto pt-4 border-t border-gray-100 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span className="font-medium text-gray-700">参加者 {project.memberCount}人</span>
                        <span className="text-gray-400">({project.membersText})</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-indigo-500" />
                          <span className="font-medium text-gray-700">発起人: <strong className="text-gray-800">{project.ownerName}</strong></span>
                        </div>
                        <span className="text-indigo-650 font-medium inline-flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                          詳細 <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右側：プロジェクト作成フォーム */}
        <CreateProjectForm masterMembers={masterMembers} />
      </div>
    </div>
  );
}
