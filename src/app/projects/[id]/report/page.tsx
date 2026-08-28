import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import ReportDashboard from '@/components/ReportDashboard';
import { calculateSettlements } from '@/lib/settlement';

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
      members: {
        include: {
          user: true,
        },
      },
      expenses: {
        include: {
          payments: { include: { member: true } },
          shares: { include: { member: true } },
        },
        orderBy: { expenseDate: 'asc' },
      },
      settlements: {
        include: {
          payerMember: true,
          receiverMember: {
            include: {
              user: true,
            },
          },
        },
      },
      projectShares: true,
    },
  });

  if (!project) {
    notFound();
  }

  // 共有状況を取得
  const projectShares = await prisma.projectShare.findMany({
    where: { projectId },
  });

  const isOwner = project.createdBy === currentUser.id;
  const userShare = projectShares.find((s) => s.userId === currentUser.id);

  // 主催者でもなく、共有もされていない場合はアクセス不可
  if (!isOwner && !userShare) {
    notFound();
  }

  // 閲覧権限ロール
  const userRole = isOwner ? 'owner' : (userShare?.role as 'editor' | 'viewer_all' | 'viewer_personal' | undefined) || 'viewer_all';

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

  // 自分に紐づいているメンバーを取得
  const linkedMember = project.members.find(
    (m) => m.userId === currentUser.id || m.name === currentUser.name
  );

  // メンバー別集計のフィルタリング（主催者と編集者以外は自身の分のみ）
  let displayMemberSummaries = memberSummaries;
  if (userRole !== 'owner' && userRole !== 'editor' && linkedMember) {
    displayMemberSummaries = memberSummaries.filter((m) => m.name === linkedMember.name);
  }

  // 支出の個人フィルタリング（主催者と編集者以外は自身の分のみ）
  let displayExpenses = project.expenses;
  if (userRole !== 'owner' && userRole !== 'editor' && linkedMember) {
    displayExpenses = project.expenses.filter((e) => {
      const isPayer = e.payments.some((p) => p.memberId === linkedMember.id);
      const isSharer = e.shares.some((s) => s.memberId === linkedMember.id);
      return isPayer || isSharer;
    });
  }

  // 2. 支出明細の整形
  const expenseSummaries = displayExpenses.map((e) => {
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
  const totalExpense = displayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const expenseCount = displayExpenses.length;
  const memberCount = (userRole !== 'owner' && userRole !== 'editor') ? 1 : project.members.length;

  // 4. 精算・送金ルート指示の計算・構築
  const memberBalances = project.members.map((m) => {
    let paid = 0;
    let share = 0;
    project.expenses.forEach((e) => {
      e.payments.forEach((p) => { if (p.memberId === m.id) paid += p.amount; });
      e.shares.forEach((s) => { if (s.memberId === m.id) share += s.shareAmount; });
    });
    return {
      userId: m.id,
      name: m.name,
      paid,
      share,
      balance: paid - share,
    };
  });

  const isConfirmed = project.status === 'settlement_confirmed' || project.status === 'completed';
  let settlementsList: any[] = [];

  if (isConfirmed) {
    settlementsList = project.settlements.map((s) => {
      const recMember = project.members.find((m) => m.id === s.receiverMemberId);
      const recUser = recMember?.user;
      const showBank = recMember?.showBankAccount !== false && recUser?.bankName && recUser?.accountNumber && recUser?.accountHolder;
      const showPaypay = recMember?.showPaypay !== false && recUser?.paypayUrl;

      return {
        fromUserId: s.payerMemberId,
        fromUserName: s.payerMember.name,
        toUserId: s.receiverMemberId,
        toUserName: s.receiverMember.name,
        amount: s.amount,
        status: s.status,
        toUserBankInfo: showBank ? {
          bankName: recUser.bankName,
          bankCode: recUser.bankCode,
          branchName: recUser.branchName,
          branchCode: recUser.branchCode,
          accountType: recUser.accountType,
          accountNumber: recUser.accountNumber,
          accountHolder: recUser.accountHolder,
        } : null,
        toUserPaypayInfo: showPaypay ? {
          url: recUser.paypayUrl,
        } : null,
      };
    });
  } else {
    const calculated = calculateSettlements(
      memberBalances.map((mb) => ({ userId: mb.userId, balance: mb.balance }))
    );
    settlementsList = calculated.map((c) => {
      const recMember = project.members.find((m) => m.id === c.toUserId);
      const recUser = recMember?.user;
      const fromMember = project.members.find((m) => m.id === c.fromUserId);
      const showBank = recMember?.showBankAccount !== false && recUser?.bankName && recUser?.accountNumber && recUser?.accountHolder;
      const showPaypay = recMember?.showPaypay !== false && recUser?.paypayUrl;

      return {
        fromUserId: c.fromUserId,
        fromUserName: fromMember?.name || '不明',
        toUserId: c.toUserId,
        toUserName: recMember?.name || '不明',
        amount: c.amount,
        status: 'pending',
        toUserBankInfo: showBank ? {
          bankName: recUser.bankName,
          bankCode: recUser.bankCode,
          branchName: recUser.branchName,
          branchCode: recUser.branchCode,
          accountType: recUser.accountType,
          accountNumber: recUser.accountNumber,
          accountHolder: recUser.accountHolder,
        } : null,
        toUserPaypayInfo: showPaypay ? {
          url: recUser.paypayUrl,
        } : null,
      };
    });
  }

  // 閲覧者の場合：自分に関係する（自分が支払う、または自分が受け取る）精算ルートのみに絞り込む
  if (userRole !== 'owner' && userRole !== 'editor' && linkedMember) {
    settlementsList = settlementsList.filter(
      (s) => s.fromUserId === linkedMember.id || s.toUserId === linkedMember.id
    );
  }

  // 利用日期間の算出
  let dateRange = '-';
  if (displayExpenses.length > 0) {
    const sortedDates = displayExpenses
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
      memberSummaries={displayMemberSummaries}
      expenseSummaries={expenseSummaries}
      totalExpense={totalExpense}
      memberCount={memberCount}
      expenseCount={expenseCount}
      dateRange={dateRange}
      projectDescription={project.description}
      userRole={userRole}
      settlementsList={settlementsList}
    />
  );
}
