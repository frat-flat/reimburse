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
  userRole?: 'owner' | 'viewer' | 'editor';
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
            userRole !== 'viewer' && (
              <Link
                href={`/projects/${projectId}/expenses/new`}
                className="bg-indigo-600 hover:bg-indigo-750 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition inline-flex items-center gap-1 shadow-sm flex-shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                支出を追加
              </Link>
            )
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
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-250 px-2 py-0.5 rounded-md transition shadow-sm animate-pulse"
                              title="重複の可能性のある支出があります"
                            >
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              <span>重複の可能性あり</span>
                            </button>

                            {openDuplicateId === expense.id && (
                              <div className="absolute left-0 mt-1 bg-white border border-amber-250 rounded-xl shadow-2xl p-4 w-72 text-xs space-y-3 text-gray-800 text-left">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                                  <span className="font-extrabold text-amber-800 flex items-center gap-1">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                    類似する支出を検出
                                  </span>
                                  <button
                                    onClick={() => setOpenDuplicateId(null)}
                                    className="text-gray-400 hover:text-gray-605 p-0.5"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <p className="text-[10px] text-gray-500 leading-relaxed font-semibold">
                                  日付（{formattedDate}）と金額（{expense.amount.toLocaleString()}円）が一致する支出が存在します。
                                </p>
                                <div className="space-y-1.5 bg-amber-50 border border-amber-150 p-2.5 rounded-lg max-h-24 overflow-y-auto">
                                  {duplicates.map((dup) => (
                                    <div key={dup.id} className="text-[10px] text-amber-900 border-b border-amber-200/50 pb-1 last:border-b-0 last:pb-0">
                                      ・<strong>{dup.title}</strong> ({dup.payments[0]?.member.name || '支払者不明'} 払)
                                    </div>
                                  ))}
                                </div>
                                <button
                                  onClick={() => handleConfirmDuplicate(expense.id)}
                                  disabled={isPending}
                                  className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 rounded-lg text-xs transition shadow-sm"
                                >
                                  <CheckSquare className="h-3.5 w-3.5" />
                                  <span>違う支出であることを確認 (警告消去)</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
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
                    
                    {/* 編集・削除（ステータスactiveのみ、かつ閲覧権限ではない場合） */}
                    {projectStatus === 'active' && userRole !== 'viewer' && (
                      (isOwner || expense.createdBy === currentUserId) ? (
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                          <Link
                            href={`/projects/${projectId}/expenses/${expense.id}/edit`}
                            className="p-1.5 hover:bg-gray-50 border-r border-gray-200 text-gray-500 hover:text-indigo-650 transition"
                            title="編集"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Link>
                          <DeleteExpenseButton expenseId={expense.id} />
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-semibold bg-gray-50 px-2 py-1 rounded border border-gray-200 flex-shrink-0" title="他人の支出は編集・削除できません">
                          編集不可 (他人の支出)
                        </span>
                      )
                    )}
                  </div>
                </div>
                
                {expense.memo && (
                  <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-start gap-1">
                    <MessageSquare className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p>{expense.memo}</p>
                  </div>
                )}

                {expense.attachments && expense.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
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
                            className="inline-flex items-center gap-1.5 text-[10px] text-indigo-650 bg-indigo-50/50 hover:bg-indigo-100/80 border border-indigo-100 hover:border-indigo-300 px-2.5 py-1 rounded-md transition font-bold"
                            title={att.fileName}
                          >
                            <svg className="w-3.5 h-3.5 text-indigo-550 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span className="truncate max-w-[150px]">{att.fileName}</span>
                          </a>

                          {/* ホバープレビューポップオーバー */}
                          {hoveredAttId === att.id && (
                            <div className="absolute bottom-full mb-2 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-2 max-w-[320px] pointer-events-none">
                              {isImage ? (
                                <img src={att.fileData} alt={att.fileName} className="max-w-[280px] max-h-[200px] object-contain rounded" />
                              ) : isPdf ? (
                                <div className="w-[280px] h-[200px] flex flex-col items-center justify-center bg-gray-50 rounded border border-gray-150 p-2 text-center">
                                  <span className="text-sm font-bold text-red-650 bg-red-50 border border-red-150 px-2 py-0.5 rounded-full mb-2">PDF</span>
                                  <p className="text-[10px] text-gray-500 font-semibold truncate w-full">{att.fileName}</p>
                                  <iframe src={att.fileData} className="w-full h-full mt-2 rounded border border-gray-200 pointer-events-none bg-white" />
                                </div>
                              ) : isHeic ? (
                                <div className="w-[280px] p-3 text-center bg-gray-50 border border-gray-100 rounded flex flex-col items-center gap-1.5">
                                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-full">HEIC</span>
                                  <p className="text-[10px] text-gray-500 font-semibold">{att.fileName}</p>
                                  <p className="text-[9px] text-amber-600 font-bold bg-amber-50 border border-amber-100 px-2 py-1 rounded">
                                    ※ HEIC 形式はブラウザ直接プレビュー非対応です。ダウンロードしてご覧ください。
                                  </p>
                                </div>
                              ) : (
                                <div className="w-[280px] p-3 text-center bg-gray-50 border border-gray-100 rounded">
                                  <p className="text-[10px] text-gray-500 font-semibold truncate">{att.fileName}</p>
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
