import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import MasterMemberManager from './MasterMemberManager';

export default async function MembersPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  // ログインユーザーの共通マスタメンバーを取得
  const masterMembers = await prisma.masterMember.findMany({
    where: { userId: currentUser.id },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="space-y-6 max-w-xl mx-auto py-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">共通メンバー登録・管理</h2>
      </div>

      <MasterMemberManager initialMembers={masterMembers} />
    </div>
  );
}
