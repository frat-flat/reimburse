import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import ExpenseForm from '../ExpenseForm';

interface NewExpensePageProps {
  params: Promise<{ id: string }>;
}

export default async function NewExpensePage({ params }: NewExpensePageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const { id: projectId } = await params;

  // プロジェクト情報とメンバーを取得
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: true,
    },
  });

  if (!project) {
    notFound();
  }

  // 精算中（active）でなければ戻す
  if (project.status !== 'active') {
    redirect(`/projects/${projectId}`);
  }

  // 権限検証: オーナー または 共有クルーであること
  const isOwner = project.createdBy === currentUser.id;
  let projectShare = null;
  if (!isOwner) {
    try {
      projectShare = await prisma.projectShare.findFirst({
        where: {
          projectId,
          userId: currentUser.id,
        },
      });
    } catch (err) {
      console.error('Failed to check project share:', err);
    }
  }

  if (!isOwner && !projectShare) {
    redirect('/dashboard');
  }

  const members = project.members.map((m) => ({
    id: m.id,
    name: m.name,
  }));

  return (
    <div className="py-4">
      <ExpenseForm projectId={projectId} members={members} />
    </div>
  );
}
