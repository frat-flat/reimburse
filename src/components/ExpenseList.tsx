'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Edit2, MessageSquare, ArrowUpDown, Plus, AlertTriangle, CheckSquare, X } from 'lucide-react';
import DeleteExpenseButton from './DeleteExpenseButton';
import { actionConfirmDuplicate } from '@/lib/actions';

interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  splitType: string;
  category?: string | null;
  expenseDate: Date | string;
  memo?: string | null;
  createdBy: string;
  duplicateConfirmed: boolean;
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
  attachments?: {
    id: string;
    fileName: string;
    fileType: string;
    fileData: string;
  }[];
}

interface ExpenseListProps {
  initialExpenses: ExpenseItem[];
  projectId: string;
  projectStatus: string;
  isOwner?: boolean;
  userRole?: string;
  currentUserId?: string;
}

type SortKey = 'expenseDate-desc' | 'expenseDate-asc' | 'createdAt-desc' | 'createdAt-asc' | 'amount-desc' | 'amount-asc';

export default function ExpenseList({
  initialExpenses,
  projectId,
  projectStatus,
  isOwner = true,
  userRole = 'owner',
  currentUserId,
}: ExpenseListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('expenseDate-desc');
  const [hoveredAttId, setHoveredAttId] = useState<string | null>(null);
  const [openDuplicateId, setOpenDuplicateId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  // 類似支出（同一日付・同一金額）を検出するロジック
  const getDuplicateExpenses = (exp: ExpenseItem) => {
    if (exp.duplicateConfirmed) return [];

    const dateA = exp.expenseDate ? new Date(exp.expenseDate).toDateString() : '';
    return initialExpenses.filter((other) => {
      if (other.id === exp.id) return false;
      if (other.duplicateConfirmed) return false;

      const dateB = other.expenseDate ? new Date(other.expenseDate).toDateString() : '';
      return dateA === dateB && exp.amount === other.amount;
    });
  };

  // 重複確認処理ハンドラ
  const handleConfirmDuplicate = (expenseId: string) => {
    startTransition(async () => {
      const res = await actionConfirmDuplicate(expenseId);
      if (res && res.error) {
        alert(res.error);
      } else {
        setOpenDuplicateId(null);
      }
    });
  };

  const sortedExpenses = getSortedExpenses();

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* ヘッダー部分 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <ArrowUpDown className="h-4 w-4" />
          </div>
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
            支出項目 <span className="text-slate-400 font-normal">({initialExpenses.length}件)</span>
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* ソートセレクター */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 cursor-pointer flex-1 sm:flex-initial"
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
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs transition inline-flex items-center justify-center gap-1.5 shadow-sm flex-shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>支出を追加</span>
            </Link>
          ) : (
            <span className="text-[11px] text-slate-500 font-bold bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200">
              追加不可 (ロック済)
            </span>
          )}
        </div>
      </div>

      {/* 支出リスト本体 */}
      {sortedExpenses.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs sm:text-sm font-semibold">
          登録されている支出項目はありません。
        </div>
      ) : (
        <div className="space-y-3">
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
              <div
                key={expense.id}
                className="bg-slate-50/50 hover:bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 transition-all duration-150 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                        {expense.title}
                      </h3>
                      {formattedDate && (
                        <span className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                          {formattedDate}
                        </span>
                      )}

                      {/* 重複警告表示 */}
                      {(() => {
                        const duplicates = getDuplicateExpenses(expense);
                        if (duplicates.length === 0) return null;

                        return (
                          <div className="relative inline-block z-30 print:hidden">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setOpenDuplicateId(openDuplicateId === expense.id ? null : expense.id);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md transition shadow-xs animate-pulse cursor-pointer"
                              title="重複の可能性のある支出があります"
                            >
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              <span>重複の可能性あり</span>
                            </button>

                            {openDuplicateId === expense.id && (
                              <div className="absolute left-0 mt-1 bg-white border border-amber-200 rounded-2xl shadow-xl p-4 w-72 text-xs space-y-3 text-slate-800 text-left z-50">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <span className="font-extrabold text-amber-800 flex items-center gap-1">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                    類似する支出を検出
                                  </span>
                                  <button
                                    onClick={() => setOpenDuplicateId(null)}
                                    className="text-slate-400 hover:text-slate-600 p-0.5"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                                  日付（{formattedDate}）と金額（{expense.amount.toLocaleString()}円）が一致する支出が存在します。
                                </p>
                                <div className="space-y-1.5 bg-amber-50/70 border border-amber-200/60 p-2.5 rounded-xl max-h-24 overflow-y-auto">
                                  {duplicates.map((dup) => (
                                    <div key={dup.id} className="text-[10px] text-amber-900 border-b border-amber-200/40 pb-1 last:border-b-0 last:pb-0">
                                      ・<strong>{dup.title}</strong> ({dup.payments[0]?.member.name || '支払者不明'} 払)
                                    </div>
                                  ))}
                                </div>
                                <button
                                  onClick={() => handleConfirmDuplicate(expense.id)}
                                  disabled={isPending}
                                  className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-xs transition shadow-xs cursor-pointer"
                                >
                                  <CheckSquare className="h-3.5 w-3.5" />
                                  <span>違う支出であることを確認</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* 支払者・負担者タグ */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs pt-0.5">
                      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md text-[11px] border border-indigo-100">
                        支払: {payerName}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-white text-slate-600 font-bold px-2 py-0.5 rounded-md text-[11px] border border-slate-200" title={shareMemberNames}>
                        負担: {expense.shares.length}人 ({shareMemberNames})
                      </span>
                    </div>
                  </div>

                  {/* 金額 & 編集・削除ボタン */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <strong className="text-lg sm:text-xl font-black font-mono text-slate-900">
                      {expense.amount.toLocaleString()}<span className="text-xs font-sans font-bold ml-0.5">円</span>
                    </strong>
                    
                    {/* 編集・削除ボタン */}
                    {projectStatus === 'active' && (
                      (isOwner || userRole === 'editor' || expense.createdBy === currentUserId) ? (
                        <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                          <Link
                            href={`/projects/${projectId}/expenses/${expense.id}/edit`}
                            className="p-2 hover:bg-slate-50 border-r border-slate-200 text-slate-500 hover:text-indigo-600 transition"
                            title="編集"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Link>
                          <DeleteExpenseButton expenseId={expense.id} />
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-1 rounded-lg border border-slate-200 flex-shrink-0">
                          他人の支出
                        </span>
                      )
                    )}
                  </div>
                </div>
                
                {/* メモ */}
                {expense.memo && (
                  <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-start gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="leading-relaxed">{expense.memo}</p>
                  </div>
                )}

                {/* 添付ファイル */}
                {expense.attachments && expense.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {expense.attachments.map((att) => {
                      const isPdf = att.fileType.includes('pdf') || att.fileName.toLowerCase().endsWith('.pdf');
                      const isHeic = att.fileType.includes('heic') || att.fileName.toLowerCase().endsWith('.heic');
                      const isImage = att.fileType.includes('image') && !isHeic;

                      return (
                        <div 
                          key={att.id}
                          className="relative inline-block"
                          onMouseEnter={() => setHoveredAttId(att.id)}
                          onMouseLeave={() => setHoveredAttId(null)}
                        >
                          <a
                            href={att.fileData}
                            download={att.fileName}
                            className="inline-flex items-center gap-1.5 text-[11px] text-indigo-700 bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 px-2.5 py-1 rounded-lg transition font-bold shadow-2xs"
                            title={att.fileName}
                          >
                            <svg className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span className="truncate max-w-[150px]">{att.fileName}</span>
                          </a>

                          {/* ホバープレビューポップオーバー */}
                          {hoveredAttId === att.id && (
                            <div className="absolute bottom-full mb-2 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-2 max-w-[320px] pointer-events-none">
                              {isImage ? (
                                <img src={att.fileData} alt={att.fileName} className="max-w-[280px] max-h-[200px] object-contain rounded-lg" />
                              ) : isPdf ? (
                                <div className="w-[280px] h-[200px] flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-slate-200 p-2 text-center">
                                  <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full mb-2">PDF</span>
                                  <p className="text-[10px] text-slate-500 font-semibold truncate w-full">{att.fileName}</p>
                                  <iframe src={att.fileData} className="w-full h-full mt-2 rounded border border-slate-200 pointer-events-none bg-white" />
                                </div>
                              ) : isHeic ? (
                                <div className="w-[280px] p-3 text-center bg-slate-50 border border-slate-200 rounded-lg flex flex-col items-center gap-1.5">
                                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">HEIC</span>
                                  <p className="text-[10px] text-slate-500 font-semibold">{att.fileName}</p>
                                  <p className="text-[9px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                                    ※ HEIC 形式はブラウザ直接プレビュー非対応です。ダウンロードしてご覧ください。
                                  </p>
                                </div>
                              ) : (
                                <div className="w-[280px] p-3 text-center bg-slate-50 border border-slate-200 rounded-lg">
                                  <p className="text-[10px] text-slate-500 font-semibold truncate">{att.fileName}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
