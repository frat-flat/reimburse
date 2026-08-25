'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Edit2, MessageSquare, ArrowUpDown, Plus } from 'lucide-react';
import DeleteExpenseButton from './DeleteExpenseButton';

interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  splitType: string;
  category?: string | null;
  expenseDate: Date | string;
  memo?: string | null;
  createdAt: Date | string;
  payments: {
    memberId: string;
    member: {
      name: string;
    };
  }[];
  shares: {
    member: {
      name: string;
    };
  }[];
}

interface ExpenseListProps {
  initialExpenses: ExpenseItem[];
  projectId: string;
  projectStatus: string;
}

type SortKey = 'expenseDate-desc' | 'expenseDate-asc' | 'createdAt-desc' | 'createdAt-asc' | 'amount-desc' | 'amount-asc';

export default function ExpenseList({ initialExpenses, projectId, projectStatus }: ExpenseListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('expenseDate-desc');

  // ソート処理
  const getSortedExpenses = () => {
    return [...initialExpenses].sort((a, b) => {
      let valA: any;
      let valB: any;
      let isAsc = false;

      switch (sortKey) {
        case 'expenseDate-desc':
          valA = a.expenseDate ? new Date(a.expenseDate).getTime() : 0;
          valB = b.expenseDate ? new Date(b.expenseDate).getTime() : 0;
          isAsc = false;
          break;
        case 'expenseDate-asc':
          valA = a.expenseDate ? new Date(a.expenseDate).getTime() : 0;
          valB = b.expenseDate ? new Date(b.expenseDate).getTime() : 0;
          isAsc = true;
          break;
        case 'createdAt-desc':
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
          isAsc = false;
          break;
        case 'createdAt-asc':
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
          isAsc = true;
          break;
        case 'amount-desc':
          valA = a.amount;
          valB = b.amount;
          isAsc = false;
          break;
        case 'amount-asc':
          valA = a.amount;
          valB = b.amount;
          isAsc = true;
          break;
        default:
          return 0;
      }

      if (valA < valB) return isAsc ? -1 : 1;
      if (valA > valB) return isAsc ? 1 : -1;
      return 0;
    });
  };

  const sortedExpenses = getSortedExpenses();

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
      {/* ヘッダー部分 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-5 w-5 text-indigo-600" />
          <h2 className="text-base font-bold text-gray-900">支出項目 ({initialExpenses.length}件)</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* ソートセレクター */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
          >
            <option value="expenseDate-desc">利用日: 新しい順</option>
            <option value="expenseDate-asc">利用日: 古い順</option>
            <option value="createdAt-desc">登録順: 新しい順</option>
            <option value="createdAt-asc">登録順: 古い順</option>
            <option value="amount-desc">金額: 高い順</option>
            <option value="amount-asc">金額: 低い順</option>
          </select>

          {projectStatus === 'active' ? (
            <Link
              href={`/projects/${projectId}/expenses/new`}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition inline-flex items-center gap-1 shadow-sm flex-shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              支出を追加
            </Link>
          ) : (
            <span className="text-[10px] text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded border border-gray-200">
              追加不可 (ロック済)
            </span>
          )}
        </div>
      </div>

      {/* 支出リスト本体 */}
      {sortedExpenses.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm">
          登録されている支出項目はありません。
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {sortedExpenses.map((expense) => {
            const payerName = expense.payments[0]?.member.name || '不明';
            const shareMemberNames = expense.shares.map((s) => s.member.name).join(', ');
            const formattedDate = expense.expenseDate
              ? new Date(expense.expenseDate).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })
              : '';

            return (
              <div key={expense.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900">{expense.title}</h3>
                      {formattedDate && (
                        <span className="text-[10px] bg-gray-100 border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded-md font-bold">
                          {formattedDate}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      支払者: <strong className="text-gray-700">{payerName}</strong>
                      {' | '}
                      負担: <span className="text-gray-600" title={shareMemberNames}>
                        {expense.shares.length}人 ({expense.shares[0]?.member.name}...)
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <strong className="text-base font-black text-gray-900">
                      {expense.amount.toLocaleString()}円
                    </strong>
                    
                    {/* 編集・削除（ステータスactiveのみ） */}
                    {projectStatus === 'active' && (
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        <Link
                          href={`/projects/${projectId}/expenses/${expense.id}/edit`}
                          className="p-1.5 hover:bg-gray-50 border-r border-gray-200 text-gray-500 hover:text-indigo-600 transition"
                          title="編集"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Link>
                        <DeleteExpenseButton expenseId={expense.id} />
                      </div>
                    )}
                  </div>
                </div>
                
                {expense.memo && (
                  <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-start gap-1">
                    <MessageSquare className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p>{expense.memo}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
