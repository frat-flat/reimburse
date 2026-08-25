import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import ReportActions from '@/components/ReportActions';
import { Calendar, Users, ShoppingBag, Landmark } from 'lucide-react';

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
    <div className="space-y-6 max-w-5xl mx-auto print:bg-white print:p-0">
      {/* 上部コントロール (印刷・CSV) */}
      <ReportActions
        projectName={project.name}
        projectId={projectId}
        members={memberSummaries}
        expenses={expenseSummaries}
      />

      {/* 印刷用の見出しヘッダー (画面上は非表示、印刷時のみ表示) */}
      <div className="hidden print:block border-b-2 border-gray-900 pb-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">プロジェクト精算レポート</h1>
        <p className="text-sm text-gray-500 mt-1">
          プロジェクト名: <strong className="text-gray-800">{project.name}</strong>
          {project.description && ` | ${project.description}`}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">出力日: {new Date().toLocaleDateString('ja-JP')}</p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-3 print:border-gray-300">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg print:bg-transparent">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">総支出</span>
            <strong className="text-base font-extrabold text-gray-900">{totalExpense.toLocaleString()}円</strong>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-3 print:border-gray-300">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg print:bg-transparent">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">参加メンバー</span>
            <strong className="text-base font-extrabold text-gray-900">{memberCount}人</strong>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-3 print:border-gray-300">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg print:bg-transparent">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">支出件数</span>
            <strong className="text-base font-extrabold text-gray-900">{expenseCount}件</strong>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-3 print:border-gray-300">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg print:bg-transparent">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">利用期間</span>
            <strong className="text-xs font-extrabold text-gray-800 block truncate">{dateRange}</strong>
          </div>
        </div>
      </div>

      {/* メンバー別集計テーブル */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0">
        <h2 className="text-base font-bold text-gray-900 border-l-4 border-indigo-600 pl-2">
          メンバー別支払・負担内訳
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse print:text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 print:bg-gray-100">
                <th className="py-2.5 px-3 font-semibold text-gray-600">メンバー名</th>
                <th className="py-2.5 px-3 font-semibold text-gray-600 text-right">支払額 (立替合計)</th>
                <th className="py-2.5 px-3 font-semibold text-gray-600 text-right">負担額 (消費合計)</th>
                <th className="py-2.5 px-3 font-semibold text-gray-600 text-right">差額 (精算金額)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {memberSummaries.map((m) => {
                const isCreditor = m.diff > 0;
                const isDebtor = m.diff < 0;
                return (
                  <tr key={m.name} className="hover:bg-gray-50/50 print:hover:bg-transparent">
                    <td className="py-3 px-3 font-bold text-gray-950">{m.name}</td>
                    <td className="py-3 px-3 text-right font-medium text-gray-800">{m.totalPaid.toLocaleString()}円</td>
                    <td className="py-3 px-3 text-right font-medium text-gray-850">{m.totalShared.toLocaleString()}円</td>
                    <td className={`py-3 px-3 text-right font-black ${
                      isCreditor 
                        ? 'text-emerald-700 print:text-emerald-800' 
                        : isDebtor 
                        ? 'text-red-600 print:text-red-700' 
                        : 'text-gray-550'
                    }`}>
                      {m.diff > 0 ? `+${m.diff.toLocaleString()}` : m.diff.toLocaleString()}円
                      <span className="text-[10px] font-normal text-gray-500 block">
                        {isCreditor ? '返金を受け取る' : isDebtor ? '不足分を支払う' : '過不足なし'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 支出明細テーブル */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0 print:pt-4">
        <h2 className="text-base font-bold text-gray-900 border-l-4 border-indigo-600 pl-2">
          支出明細一覧
        </h2>
        {expenseSummaries.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">登録されている支出はありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse print:text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 print:bg-gray-100">
                  <th className="py-2.5 px-3 font-semibold text-gray-600">支出名</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-600">利用日</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-600">支払者</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-600 text-right">金額</th>
                  <th className="py-2.5 px-3 font-semibold text-gray-600 text-center">負担人数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenseSummaries.map((e, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 print:hover:bg-transparent">
                    <td className="py-3 px-3 font-bold text-gray-900">{e.title}</td>
                    <td className="py-3 px-3 text-gray-600">{e.date}</td>
                    <td className="py-3 px-3 text-gray-700 font-semibold">{e.payer}</td>
                    <td className="py-3 px-3 text-right font-black text-gray-950">{e.amount.toLocaleString()}円</td>
                    <td className="py-3 px-3 text-center text-gray-600 font-medium">{e.shareCount}人</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* メンバー個別明細セクション */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0 print:pt-4">
        <h2 className="text-base font-bold text-gray-900 border-l-4 border-indigo-600 pl-2 print:border-l-4">
          メンバー別個別詳細明細
        </h2>
        <div className="space-y-8 divide-y divide-gray-200 print:divide-y-0 print:space-y-6">
          {memberSummaries.map((m) => (
            <div key={m.name} className="space-y-3 pt-6 first:pt-0 print:break-inside-avoid print:pt-4 print:border-t print:border-gray-200">
              <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100 print:bg-gray-100/50">
                <h3 className="font-extrabold text-sm text-gray-900">{m.name} の明細</h3>
                <span className="text-xs font-bold text-indigo-750">
                  差額: {m.diff > 0 ? `+${m.diff.toLocaleString()}` : m.diff.toLocaleString()}円
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 支払った立替明細 */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded">
                    ● 支払った立替明細 (小計: {m.totalPaid.toLocaleString()}円)
                  </h4>
                  {m.paidDetails.length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic pl-2">支払った項目はありません。</p>
                  ) : (
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                          <th className="pb-1 px-2">利用日</th>
                          <th className="pb-1 px-2">項目名</th>
                          <th className="pb-1 px-2 text-right">金額</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {m.paidDetails.map((pd, i) => (
                          <tr key={i} className="text-gray-700">
                            <td className="py-1.5 px-2">{pd.date}</td>
                            <td className="py-1.5 px-2 font-semibold">{pd.title}</td>
                            <td className="py-1.5 px-2 text-right">{pd.amount.toLocaleString()}円</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* 参加した負担明細 */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded">
                    ● 参加した負担明細 (小計: {m.totalShared.toLocaleString()}円)
                  </h4>
                  {m.sharedDetails.length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic pl-2">負担した項目はありません。</p>
                  ) : (
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                          <th className="pb-1 px-2">利用日</th>
                          <th className="pb-1 px-2">項目名</th>
                          <th className="pb-1 px-2 text-right">自己負担額</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {m.sharedDetails.map((sd, i) => (
                          <tr key={i} className="text-gray-700">
                            <td className="py-1.5 px-2">{sd.date}</td>
                            <td className="py-1.5 px-2 font-semibold">{sd.title}</td>
                            <td className="py-1.5 px-2 text-right">{sd.amount.toLocaleString()}円</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
