'use client';

import React, { useState, useTransition } from 'react';
import { actionToggleMemberDisclosure } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';

interface DisclosureTogglesProps {
  memberId: string;
  initialShowBank: boolean;
  initialShowPaypay: boolean;
}

export default function DisclosureToggles({
  memberId,
  initialShowBank,
  initialShowPaypay,
}: DisclosureTogglesProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showBank, setShowBank] = useState(initialShowBank);
  const [showPaypay, setShowPaypay] = useState(initialShowPaypay);

  const handleToggle = (field: 'bank' | 'paypay') => {
    const currentValue = field === 'bank' ? showBank : showPaypay;
    const newValue = !currentValue;

    // 1. クライアント側のトグル状態を即座に（ミリ秒単位で）更新
    if (field === 'bank') {
      setShowBank(newValue);
    } else {
      setShowPaypay(newValue);
    }

    // 2. バックグラウンドでデータベースを非同期更新
    startTransition(async () => {
      try {
        const res = await actionToggleMemberDisclosure(memberId, field, newValue);
        if (res && 'error' in res && res.error) {
          throw new Error(res.error);
        }
        
        // 3. データ同期後にサーバーコンポーネントを最新化
        router.refresh();
      } catch (e) {
        console.error('Failed to toggle disclosure:', e);
        // エラー時は元の状態へロールバック
        if (field === 'bank') {
          setShowBank(currentValue);
        } else {
          setShowPaypay(currentValue);
        }
        alert('設定の更新に失敗しました。時間をおいて再度お試しください。');
      }
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
      <h3 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-1.5">
        <Eye className="h-4.5 w-4.5 text-indigo-650" />
        <span>イベント決済情報の開示設定</span>
        {isPending && (
          <span className="text-[9px] text-indigo-500 animate-pulse font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
            同期中...
          </span>
        )}
      </h3>
      <p className="text-[10px] text-gray-500 leading-normal">
        他のクルーがあなたへ送金する際、口座情報やPayPay送金リンクを表示するかどうかを、このイベント個別に制御できます。
      </p>
      
      <div className="space-y-2.5 pt-1 text-xs">
        {/* 銀行口座開示トグル */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-700 text-[11px]">銀行口座情報を開示する</span>
          <button
            type="button"
            onClick={() => handleToggle('bank')}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-205 ease-in-out focus:outline-none ${
              showBank ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-205 ease-in-out ${
                showBank ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* PayPay開示トグル */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-700 text-[11px]">PayPay送金先を開示する</span>
          <button
            type="button"
            onClick={() => handleToggle('paypay')}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-205 ease-in-out focus:outline-none ${
              showPaypay ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-205 ease-in-out ${
                showPaypay ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
