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
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden space-y-6 p-6">
      {/* タブヘッダー */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('received')}
          className={`flex-1 py-3 text-center font-bold text-sm transition-all border-b-2 ${
            activeTab === 'received'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          受け取った領収書 ({receivedReceipts.length})
        </button>
        <button
          onClick={() => setActiveTab('issued')}
          className={`flex-1 py-3 text-center font-bold text-sm transition-all border-b-2 ${
            activeTab === 'issued'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          発行した領収書 ({issuedReceipts.length})
        </button>
      </div>

      {/* 領収書一覧テーブル */}
      {currentList.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <Receipt className="h-10 w-10 text-gray-300 mx-auto" />
          <p className="text-sm text-gray-500 font-semibold">
            {activeTab === 'received' ? '受け取った領収書はありません。' : '発行した領収書はありません。'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">利用日・イベント</th>
                <th className="py-3 px-4">{activeTab === 'received' ? '発行者 (受取先)' : '宛名 (支払元)'}</th>
                <th className="py-3 px-4 text-right">金額</th>
                <th className="py-3 px-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-semibold">
              {currentList.map((s) => {
                const recUser = s.receiverMember.user;
                const payerName = s.payerMember.name;
                const receiverName = s.receiverMember.name;
                const dateStr = formatDate(s.paidAt);

                return (
                  <tr key={s.id} className="hover:bg-gray-50/40 transition">
                    <td className="py-4 px-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{dateStr}</span>
                      </div>
                      <div className="text-gray-900 text-sm font-extrabold">{s.project.name}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{activeTab === 'received' ? receiverName : payerName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-base font-black text-gray-950">
                        {s.amount.toLocaleString()}円
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <ReceiptModal
                        payerName={payerName}
                        receiverName={receiverName}
                        amount={s.amount}
                        projectName={s.project.name}
                        dateString={dateStr}
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
      )}
    </div>
  );
}
