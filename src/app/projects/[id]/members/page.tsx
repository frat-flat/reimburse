import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import MemberManager from './MemberManager';

interface MembersPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MembersPage({ params }: MembersPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const { id: projectId } = await params;

  // プロジェクト情報とメンバーリストを取得
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: true,
    },
  });

  if (!project) {
    notFound();
  }

  // 作成者（管理者）でなければダッシュボードに戻す
  if (project.createdBy !== currentUser.id) {
    redirect('/dashboard');
  }

  const isLocked = project.status !== 'active';

  return (
    <div className="space-y-6 max-w-xl mx-auto py-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">メンバー登録・管理</h2>
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center text-xs text-gray-500 hover:text-indigo-600 transition font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-0.5" />
          プロジェクト詳細へ戻る
        </Link>
      </div>

      <MemberManager
        projectId={projectId}
        initialMembers={project.members}
        isLocked={isLocked}
      />
    </div>
  );
}
