'use client';

import React, { useState, useTransition } from 'react';
import { actionCreateProject } from '@/lib/actions';
import { FolderPlus, Loader2, X, Users, Pencil, Check } from 'lucide-react';

interface MasterMember {
  id: string;
  name: string;
}

interface CreateProjectModalProps {
  masterMembers: MasterMember[];
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateProjectModal({
  masterMembers,
  isOpen,
  onClose,
}: CreateProjectModalProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedNames, setSelectedNames] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    masterMembers.forEach((mm) => {
      initial[mm.name] = true;
    });
    return initial;
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [allowBankTransfer, setAllowBankTransfer] = useState(true);
  const [allowPaypay, setAllowPaypay] = useState(true);

  if (!isOpen) return null;

  const handleCheckboxChange = (mName: string) => {
    setSelectedNames((prev) => ({
      ...prev,
      [mName]: !prev[mName],
    }));
  };

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    masterMembers.forEach((mm) => {
      next[mm.name] = true;
    });
    setSelectedNames(next);
  };

  const handleDeselectAll = () => {
    setSelectedNames({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('description', description.trim());
    formData.append('allowBankTransfer', allowBankTransfer ? 'true' : 'false');
    formData.append('allowPaypay', allowPaypay ? 'true' : 'false');

    Object.keys(selectedNames).forEach((mName) => {
      if (selectedNames[mName]) {
        formData.append('memberNames', mName);
      }
    });

    setErrorMsg(null);
    startTransition(async () => {
      const res = await actionCreateProject(formData);
      if (res && res.error) {
        setErrorMsg(res.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative border border-slate-200 flex flex-col space-y-4 max-h-[92vh] overflow-y-auto animate-scale-in">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-150">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl shadow-2xs">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                新しいイベントを作成
              </h2>
              <p className="text-[11px] text-slate-400 font-semibold">
                精算イベント名とメンバーを設定してください
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-700 font-bold bg-rose-50 p-3 rounded-xl border border-rose-200">
            {errorMsg}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* イベント名 */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              イベント名 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例: 北海道旅行、週末BBQ、合宿精算"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-3 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none transition disabled:opacity-60"
            />
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              メモ・説明 <span className="text-slate-400 font-normal">(任意)</span>
            </label>
            <textarea
              placeholder="例: 2026年8月開催、レンタカーや宿泊代の精算など"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-3 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none transition disabled:opacity-60 resize-none leading-relaxed"
            />
          </div>

          {/* 決済手段の許可設定 */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <span className="block text-xs font-extrabold text-slate-700">精算時の決済手段</span>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                  allowBankTransfer
                    ? 'bg-indigo-50/60 border-indigo-200 text-indigo-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-500 font-medium'
                }`}
              >
                <input
                  type="checkbox"
                  checked={allowBankTransfer}
                  onChange={(e) => setAllowBankTransfer(e.target.checked)}
                  disabled={isPending}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-xs">🏦 銀行振込</span>
              </label>

              <label
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                  allowPaypay
                    ? 'bg-indigo-50/60 border-indigo-200 text-indigo-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-500 font-medium'
                }`}
              >
                <input
                  type="checkbox"
                  checked={allowPaypay}
                  onChange={(e) => setAllowPaypay(e.target.checked)}
                  disabled={isPending}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-xs">📱 PayPay</span>
              </label>
            </div>
          </div>

          {/* ベースクルー（初期参加メンバー）選択 */}
          {masterMembers.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="block text-xs font-extrabold text-slate-700">
                  初期メンバーを選択 ({masterMembers.length}名)
                </span>
                <div className="flex items-center gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                  >
                    全員選択
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                  >
                    全解除
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50/70 rounded-xl border border-slate-200">
                {masterMembers.map((mm) => {
                  const isChecked = !!selectedNames[mm.name];
                  return (
                    <label
                      key={mm.id}
                      className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-white border-indigo-300 text-indigo-950 font-extrabold shadow-2xs'
                          : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleCheckboxChange(mm.name)}
                        disabled={isPending}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                      <span className="truncate">{mm.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* ボタン */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl text-xs transition cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>作成中...</span>
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4" />
                  <span>イベントを作成する</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
