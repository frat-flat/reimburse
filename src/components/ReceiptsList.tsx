'use client';

import React, { useState } from 'react';
import ReceiptModal from './ReceiptModal';
import { Receipt, Calendar, User } from 'lucide-react';

interface ReceiptData {
  id: string;
  amount: number;
  paidAt: Date | null;
  project: {
    name: string;
  };
  payerMember: {
    name: string;
    user?: {
      name: string;
      receiptIssuerName: string | null;
      receiptIssuerZip: string | null;
      receiptIssuerAddress: string | null;
      receiptIssuerTel: string | null;
      receiptIssuerRegNo: string | null;
      stampImage: string | null;
      stampSize: number | null;
      stampOffsetX?: number | null;
      stampOffsetY?: number | null;
      stampOpacity?: number | null;
    } | null;
  };
  receiverMember: {
    name: string;
    user?: {
      name: string;
      receiptIssuerName: string | null;
      receiptIssuerZip: string | null;
      receiptIssuerAddress: string | null;
      receiptIssuerTel: string | null;
      receiptIssuerRegNo: string | null;
      stampImage: string | null;
      stampSize: number | null;
      stampOffsetX?: number | null;
      stampOffsetY?: number | null;
      stampOpacity?: number | null;
    } | null;
  };
}

interface ReceiptsListProps {
  receivedReceipts: ReceiptData[];
  issuedReceipts: ReceiptData[];
}

export default function ReceiptsList({ receivedReceipts, issuedReceipts }: ReceiptsListProps) {
  const [activeTab, setActiveTab] = useState<'received' | 'issued'>('received');

  const currentList = activeTab === 'received' ? receivedReceipts : issuedReceipts;

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden space-y-5 p-4 sm:p-6">
      {/* タブヘッダー */}
      <div className="flex border-b border-slate-100 bg-slate-50/50 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('received')}
          className={`flex-1 py-2.5 sm:py-3 text-center font-extrabold text-xs sm:text-sm rounded-lg transition-all cursor-pointer ${
            activeTab === 'received'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          受け取った領収書 ({receivedReceipts.length})
        </button>
        <button
          onClick={() => setActiveTab('issued')}
          className={`flex-1 py-2.5 sm:py-3 text-center font-extrabold text-xs sm:text-sm rounded-lg transition-all cursor-pointer ${
            activeTab === 'issued'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          発行した領収書 ({issuedReceipts.length})
        </button>
      </div>

      {/* 領収書一覧 */}
      {currentList.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Receipt className="h-6 w-6" />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-bold">
            {activeTab === 'received' ? '受け取った領収書はありません。' : '発行した領収書はありません。'}
          </p>
        </div>
      ) : (
        <>
          {/* モバイル表示：カードリスト */}
          <div className="md:hidden space-y-3">
            {currentList.map((s) => {
              const recUser = s.receiverMember.user;
              const payerName = s.payerMember.name;
              const receiverName = s.receiverMember.name;
              const dateStr = formatDate(s.paidAt);

              return (
                <div
                  key={s.id}
                  className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <span className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {dateStr}
                      </span>
                      <h3 className="font-black text-slate-900 text-sm">{s.project.name}</h3>
                    </div>
                    <strong className="text-base font-black font-mono text-indigo-950">
                      {s.amount.toLocaleString()}<span className="text-xs font-sans font-bold ml-0.5">円</span>
                    </strong>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>{activeTab === 'received' ? `発行: ${receiverName}` : `宛名: ${payerName}`}</span>
                    </div>

                    <ReceiptModal
                      readOnly={true}
                      triggerButtonText="領収書を確認"
                      payerName={payerName}
                      receiverName={receiverName}
                      amount={s.amount}
                      projectName={s.project.name}
                      dateString={dateStr}
                      triggerButtonClassName="inline-flex items-center justify-center gap-1 bg-white hover:bg-indigo-50 text-indigo-700 font-extrabold px-3 py-1.5 rounded-xl text-xs border border-indigo-200 transition shadow-2xs cursor-pointer active:scale-95"
                      issuerInfo={{
                        name: recUser?.receiptIssuerName || recUser?.name || receiverName,
                        zip: recUser?.receiptIssuerZip || '',
                        address: recUser?.receiptIssuerAddress || '',
                        tel: recUser?.receiptIssuerTel || '',
                        regNo: recUser?.receiptIssuerRegNo || '',
                        stampImage: recUser?.stampImage || '',
                        stampSize: recUser?.stampSize || 60,
                        stampOffsetX: recUser?.stampOffsetX,
                        stampOffsetY: recUser?.stampOffsetY,
                        stampOpacity: recUser?.stampOpacity,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* デスクトップ表示：テーブル */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 rounded-l-xl">利用日・イベント</th>
                  <th className="py-3 px-4">{activeTab === 'received' ? '発行者 (受取先)' : '宛名 (支払元)'}</th>
                  <th className="py-3 px-4 text-right">金額</th>
                  <th className="py-3 px-4 text-center rounded-r-xl">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {currentList.map((s) => {
                  const recUser = s.receiverMember.user;
                  const payerName = s.payerMember.name;
                  const receiverName = s.receiverMember.name;
                  const dateStr = formatDate(s.paidAt);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{dateStr}</span>
                        </div>
                        <div className="text-slate-900 text-sm font-extrabold">{s.project.name}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <User className="h-4 w-4 text-slate-400" />
                          <span>{activeTab === 'received' ? receiverName : payerName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-base font-black font-mono text-slate-900">
                          {s.amount.toLocaleString()}円
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <ReceiptModal
                          readOnly={true}
                          triggerButtonText="領収書を確認"
                          payerName={payerName}
                          receiverName={receiverName}
                          amount={s.amount}
                          projectName={s.project.name}
                          dateString={dateStr}
                          triggerButtonClassName="inline-flex items-center justify-center gap-1 bg-white hover:bg-indigo-50 text-indigo-700 font-extrabold px-3.5 py-1.5 rounded-xl text-xs border border-indigo-200 transition shadow-2xs cursor-pointer active:scale-95"
                          issuerInfo={{
                            name: recUser?.receiptIssuerName || recUser?.name || receiverName,
                            zip: recUser?.receiptIssuerZip || '',
                            address: recUser?.receiptIssuerAddress || '',
                            tel: recUser?.receiptIssuerTel || '',
                            regNo: recUser?.receiptIssuerRegNo || '',
                            stampImage: recUser?.stampImage || '',
                            stampSize: recUser?.stampSize || 60,
                            stampOffsetX: recUser?.stampOffsetX,
                            stampOffsetY: recUser?.stampOffsetY,
                            stampOpacity: recUser?.stampOpacity,
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
