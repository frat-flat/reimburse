import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import EditProjectForm from './EditProjectForm';

interface EditProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const { id: projectId } = await params;

  // プロジェクト情報を取得
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    notFound();
  }

  // 作成者でなければダッシュボードに戻す
  if (project.createdBy !== currentUser.id) {
    redirect('/dashboard');
  }

  return (
    <div className="py-4">
      <EditProjectForm project={project} />
    </div>
  );
}
