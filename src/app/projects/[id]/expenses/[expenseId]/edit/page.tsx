import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import ExpenseForm from '../../ExpenseForm';

interface EditExpensePageProps {
  params: Promise<{
    id: string;
    expenseId: string;
  }>;
}

export default async function EditExpensePage({ params }: EditExpensePageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const { id: projectId, expenseId } = await params;

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

  // 支出と支払・負担レコードを取得
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      payments: true,
      shares: true,
    },
  });

  if (!expense || expense.projectId !== projectId) {
    notFound();
  }

  const members = project.members.map((m) => ({
    id: m.id,
    name: m.name,
  }));

  // ExpenseForm用に整形
  const formattedExpense = {
    id: expense.id,
    title: expense.title,
    amount: expense.amount,
    splitType: expense.splitType as 'equal' | 'percentage' | 'fixed' | 'ratio' | 'fixed_equal',
    payerMemberId: expense.payments[0]?.memberId || '',
    expenseDate: expense.expenseDate
      ? (() => {
          const d = new Date(expense.expenseDate);
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${d.getFullYear()}-${month}-${day}`;
        })()
      : '',
    shares: expense.shares.map((s) => ({
      memberId: s.memberId,
      percentage: s.percentage,
    })),
    // クライアントで金額指定時の初期値として使うため追加
    sharesData: expense.shares.map((s) => ({
      memberId: s.memberId,
      shareAmount: s.shareAmount,
    })),
  };

  return (
    <div className="py-4">
      <ExpenseForm
        projectId={projectId}
        members={members}
        expense={formattedExpense}
      />
    </div>
  );
}
