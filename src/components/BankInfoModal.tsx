'use client';

import { useState } from 'react';
import { Landmark, X, Copy, Check } from 'lucide-react';

interface BankInfoModalProps {
  bankName: string;
  bankCode?: string | null;
  branchName: string;
  branchCode?: string | null;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
}

export default function BankInfoModal({
  bankName,
  bankCode,
  branchName,
  branchCode,
  accountType,
  accountNumber,
  accountHolder,
}: BankInfoModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 font-extrabold py-1 px-2.5 rounded-lg transition inline-flex items-center gap-1 shadow-sm cursor-pointer"
      >
        <Landmark className="h-3 w-3 text-slate-500" />
        <span>口座情報を表示</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl relative border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Landmark className="h-4.5 w-4.5 text-indigo-650" />
                <span>振込先銀行口座</span>
              </div>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[10px] text-gray-500 mb-4 leading-normal font-semibold">
              送金金額をご確認のうえ、以下の口座へお振込ください。項目右側のアイコンをクリックするとコピーできます。
            </p>

            <div className="space-y-3.5 text-xs">
              {/* 金融機関名 */}
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                <div>
                  <span className="block text-[9px] text-gray-400 font-bold">金融機関</span>
                  <strong className="text-gray-800 font-extrabold">{bankName} {bankCode ? `(${bankCode})` : ''}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(bankName, 'bank')}
                  className="text-slate-400 hover:text-slate-655 p-1 rounded transition hover:bg-slate-200"
                >
                  {copiedField === 'bank' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* 支店名 */}
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                <div>
                  <span className="block text-[9px] text-gray-400 font-bold">支店</span>
                  <strong className="text-gray-800 font-extrabold">{branchName} {branchCode ? `(${branchCode})` : ''}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(branchName, 'branch')}
                  className="text-slate-400 hover:text-slate-655 p-1 rounded transition hover:bg-slate-200"
                >
                  {copiedField === 'branch' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* 口座種別・番号 */}
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                <div>
                  <span className="block text-[9px] text-gray-400 font-bold">口座種別・番号</span>
                  <strong className="text-gray-800 font-extrabold">{accountType} {accountNumber}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(accountNumber, 'number')}
                  className="text-slate-400 hover:text-slate-655 p-1 rounded transition hover:bg-slate-200"
                >
                  {copiedField === 'number' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* 口座名義 (カナ) */}
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                <div>
                  <span className="block text-[9px] text-gray-400 font-bold">口座名義 (カナ)</span>
                  <strong className="text-gray-800 font-extrabold font-mono">{accountHolder}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(accountHolder, 'holder')}
                  className="text-slate-400 hover:text-slate-655 p-1 rounded transition hover:bg-slate-200"
                >
                  {copiedField === 'holder' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={handleClose}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs transition shadow-sm cursor-pointer"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
