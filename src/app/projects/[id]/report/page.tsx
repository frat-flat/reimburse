import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import ReportDashboard from '@/components/ReportDashboard';

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectReportPage({ params }: ReportPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const { id: projectId } = await params;

  // プロジェクト固有の情報を取得
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: true,
      expenses: {
        include: {
          payments: { include: { member: true } },
          shares: { include: { member: true } },
        },
        orderBy: { expenseDate: 'asc' },
      },
    },
  });

  if (!project || project.createdBy !== currentUser.id) {
    notFound();
  }

  // 1. 各メンバーの支払・負担集計および個別明細の作成
  const memberSummaries = project.members.map((m) => {
    // 支払明細 (立替)
    const paidDetails: { title: string; date: string; amount: number }[] = [];
    let totalPaid = 0;
    project.expenses.forEach((e) => {
      e.payments.forEach((p) => {
        if (p.memberId === m.id) {
          totalPaid += p.amount;
          const formattedDate = e.expenseDate
            ? new Date(e.expenseDate).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })
            : '-';
          paidDetails.push({
            title: e.title,
            date: formattedDate,
            amount: p.amount,
          });
        }
      });
    });

    // 負担明細 (消費)
    const sharedDetails: { title: string; date: string; amount: number }[] = [];
    let totalShared = 0;
    project.expenses.forEach((e) => {
      e.shares.forEach((s) => {
        if (s.memberId === m.id) {
          totalShared += s.shareAmount;
          const formattedDate = e.expenseDate
            ? new Date(e.expenseDate).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })
            : '-';
          sharedDetails.push({
            title: e.title,
            date: formattedDate,
            amount: s.shareAmount,
          });
        }
      });
    });

    return {
      name: m.name,
      totalPaid,
      totalShared,
      diff: totalPaid - totalShared,
      paidDetails,
      sharedDetails,
    };
  });

  // 2. 支出明細の整形
  const expenseSummaries = project.expenses.map((e) => {
    const formattedDate = e.expenseDate
      ? new Date(e.expenseDate).toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
      : '-';

    return {
      title: e.title,
      date: formattedDate,
      payer: e.payments[0]?.member.name || '不明',
      amount: e.amount,
      shareCount: e.shares.length,
    };
  });

  // 3. 基本サマリー指標
  const totalExpense = project.expenses.reduce((sum, e) => sum + e.amount, 0);
  const expenseCount = project.expenses.length;
  const memberCount = project.members.length;

  // 利用日期間の算出
  let dateRange = '-';
  if (project.expenses.length > 0) {
    const sortedDates = project.expenses
      .map((e) => e.expenseDate)
      .filter(Boolean)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    if (sortedDates.length > 0) {
      const first = new Date(sortedDates[0]).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
      const last = new Date(sortedDates[sortedDates.length - 1]).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
      dateRange = first === last ? first : `${first} 〜 ${last}`;
    }
  }

  return (
    <ReportDashboard
      projectName={project.name}
      projectId={projectId}
      memberSummaries={memberSummaries}
      expenseSummaries={expenseSummaries}
      totalExpense={totalExpense}
      memberCount={memberCount}
      expenseCount={expenseCount}
      dateRange={dateRange}
      projectDescription={project.description}
    />
  );
}
