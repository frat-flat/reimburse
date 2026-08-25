'use client';

import React from 'react';
import { Printer, Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface MemberSummary {
  name: string;
  totalPaid: number;
  totalShared: number;
  diff: number;
  paidDetails: { title: string; date: string; amount: number }[];
  sharedDetails: { title: string; date: string; amount: number }[];
}

interface ExpenseSummary {
  title: string;
  date: string;
  payer: string;
  amount: number;
  shareCount: number;
}

interface ReportActionsProps {
  projectName: string;
  projectId: string;
  members: MemberSummary[];
  expenses: ExpenseSummary[];
  selectedMemberName?: string;
  showMemberTable?: boolean;
  showExpenseTable?: boolean;
  showMemberDetails?: boolean;
}

export default function ReportActions({
  projectName,
  projectId,
  members,
  expenses,
  selectedMemberName,
  showMemberTable = true,
  showExpenseTable = true,
  showMemberDetails = true,
}: ReportActionsProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleCSVExport = () => {
    let csv = '\uFEFF'; // UTF-8 BOM for Excel compatibility

    // 1. プロジェクト基本情報
    csv += `■ プロジェクトレポート: ${projectName}\n`;
    if (selectedMemberName) {
      csv += `対象メンバー,${selectedMemberName}\n`;
    }
    csv += `出力日時,${new Date().toLocaleString('ja-JP')}\n\n`;

    // 2. メンバー別集計テーブル
    if (showMemberTable) {
      csv += `■ メンバー別集計\n`;
      csv += `メンバー名,支払合計額(立替),負担合計額(消費),差額(精算金額)\n`;
      members.forEach((m) => {
        csv += `"${m.name.replace(/"/g, '""')}",${m.totalPaid},${m.totalShared},${m.diff}\n`;
      });
      csv += `\n`;
    }

    // 3. 支出明細テーブル
    if (showExpenseTable) {
      csv += `■ 支出明細\n`;
      csv += `項目名,利用日,支払者,金額,負担人数\n`;
      expenses.forEach((e) => {
        csv += `"${e.title.replace(/"/g, '""')}","${e.date}","${e.payer.replace(/"/g, '""')}",${e.amount},${e.shareCount}\n`;
      });
      csv += `\n`;
    }

    // 4. メンバー個別明細
    if (showMemberDetails) {
      csv += `■ メンバー別個別明細\n`;
      members.forEach((m) => {
        // メンバーフィルターが有効な場合は該当者以外をスキップ
        if (selectedMemberName && m.name !== selectedMemberName) {
          return;
        }
        csv += `\n[ ${m.name.replace(/"/g, '""')} の明細 ]\n`;
        csv += `● 支払った立替明細\n`;
        csv += `利用日,項目名,支払金額\n`;
        m.paidDetails.forEach((pd) => {
          csv += `"${pd.date}","${pd.title.replace(/"/g, '""')}",${pd.amount}\n`;
        });
        csv += `支払小計,,${m.totalPaid}\n`;

        csv += `● 参加した負担明細\n`;
        csv += `利用日,項目名,負担金額\n`;
        m.sharedDetails.forEach((sd) => {
          csv += `"${sd.date}","${sd.title.replace(/"/g, '""')}",${sd.amount}\n`;
        });
        csv += `負担小計,,${m.totalShared}\n`;
        csv += `差額(精算金額),,${m.diff}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const downloadName = selectedMemberName 
      ? `report_${projectName}_${selectedMemberName}.csv`
      : `report_${projectName}.csv`;
    link.setAttribute('download', downloadName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5 print:hidden">
      <div>
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 font-medium transition"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          プロジェクト詳細へ戻る
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-900 mt-1">プロジェクト内訳レポート</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 px-3 rounded-lg text-sm transition shadow-sm active:scale-95"
        >
          <Printer className="h-4 w-4 text-gray-500" />
          <span>印刷する (PDF)</span>
        </button>
        <button
          onClick={handleCSVExport}
          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg text-sm transition shadow-sm active:scale-95"
        >
          <Download className="h-4 w-4" />
          <span>CSVエクスポート</span>
        </button>
      </div>
    </div>
  );
}
