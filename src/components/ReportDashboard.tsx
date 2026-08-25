'use client';

import React, { useState } from 'react';
import ReportActions from './ReportActions';
import { Calendar, Users, ShoppingBag, Landmark, Filter } from 'lucide-react';

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

interface ReportDashboardProps {
  projectName: string;
  projectId: string;
  memberSummaries: MemberSummary[];
  expenseSummaries: ExpenseSummary[];
  totalExpense: number;
  memberCount: number;
  expenseCount: number;
  dateRange: string;
  projectDescription?: string | null;
}

export default function ReportDashboard({
  projectName,
  projectId,
  memberSummaries,
  expenseSummaries,
  totalExpense,
  memberCount,
  expenseCount,
  dateRange,
  projectDescription,
}: ReportDashboardProps) {
  const [selectedMemberName, setSelectedMemberName] = useState<string>('');

  // 選択されたメンバーに基づいて個別明細をフィルタリング
  const filteredMemberSummaries = selectedMemberName
    ? memberSummaries.filter((m) => m.name === selectedMemberName)
    : memberSummaries;

  return (
    <div className="space-y-6 max-w-5xl mx-auto print:bg-white print:p-0">
      {/* 上部コントロール (印刷・CSV) */}
      <ReportActions
        projectName={projectName}
        projectId={projectId}
        members={memberSummaries}
        expenses={expenseSummaries}
        selectedMemberName={selectedMemberName || undefined}
      />

      {/* 印刷用の見出しヘッダー (画面上は非表示、印刷時のみ表示) */}
      <div className="hidden print:block border-b-2 border-gray-900 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-black">
          精算レポート：{projectName}
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          {projectDescription && `プロジェクト説明: ${projectDescription}`}
          {selectedMemberName && ` | 対象メンバー: ${selectedMemberName}`}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">出力日: {new Date().toLocaleDateString('ja-JP')}</p>
      </div>

      {/* メンバー選択フィルター (印刷時は非表示) */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
          <Filter className="h-4 w-4 text-indigo-600" />
          <span>レポート出力フィルター</span>
        </div>
        <select
          value={selectedMemberName}
          onChange={(e) => setSelectedMemberName(e.target.value)}
          className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
        >
          <option value="">-- 個別明細を出力するメンバーを選択 (全員分表示) --</option>
          {memberSummaries.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
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
                const isFocused = selectedMemberName === m.name;
                return (
                  <tr 
                    key={m.name} 
                    className={`hover:bg-gray-50/50 print:hover:bg-transparent transition-colors ${
                      selectedMemberName && !isFocused ? 'opacity-40 print:opacity-100' : ''
                    } ${isFocused ? 'bg-indigo-50/30' : ''}`}
                  >
                    <td className="py-3 px-3 font-bold text-gray-950">
                      {m.name}
                      {isFocused && (
                        <span className="ml-1.5 text-[9px] font-bold text-indigo-700 bg-indigo-100 px-1 py-0.2 rounded print:hidden">
                          選択中
                        </span>
                      )}
                    </td>
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
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0 print:pt-4 print:break-before-page">
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

      {/* メンバー個別明細セクション (フィルタリング連動) */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0 print:pt-4 print:break-before-page">
        <h2 className="text-base font-bold text-gray-900 border-l-4 border-indigo-600 pl-2 print:border-l-4">
          メンバー別明細 {selectedMemberName && `(${selectedMemberName})`}
        </h2>
        <div className="space-y-8 divide-y divide-gray-200 print:divide-y-0 print:space-y-6">
          {filteredMemberSummaries.map((m) => (
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
