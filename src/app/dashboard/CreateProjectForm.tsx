'use client';

import { useState, useTransition } from 'react';
import { actionCreateProject } from '@/lib/actions';
import { FolderPlus, Loader2 } from 'lucide-react';

interface MasterMember {
  id: string;
  name: string;
}

interface CreateProjectFormProps {
  masterMembers: MasterMember[];
}

export default function CreateProjectForm({ masterMembers }: CreateProjectFormProps) {
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

  const handleCheckboxChange = (mName: string) => {
    setSelectedNames((prev) => ({
      ...prev,
      [mName]: !prev[mName],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('description', description.trim());
    formData.append('allowBankTransfer', allowBankTransfer ? 'true' : 'false');
    formData.append('allowPaypay', allowPaypay ? 'true' : 'false');
    
    // チェックされたメンバー名のみをアペンド
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
      }
    });
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
          <FolderPlus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-900">新しいイベント</h2>
          <p className="text-[11px] text-slate-400">精算イベントを作成してメンバーを追加</p>
        </div>
      </div>

      {errorMsg && (
        <p className="text-xs text-rose-700 font-bold bg-rose-50 p-3 rounded-xl border border-rose-200">
          {errorMsg}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* イベント名 */}
        <div>
          <label className="block text-xs font-extrabold text-slate-700 mb-1">
            イベント名 <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="例: 沖縄旅行、BBQ精算"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-3 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none transition disabled:opacity-60"
          />
        </div>

        {/* 説明 */}
        <div>
          <label className="block text-xs font-extrabold text-slate-700 mb-1">
            説明 (任意)
          </label>
          <textarea
            rows={2}
            placeholder="イベントの目的やメモ"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isPending}
            className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-3 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none transition resize-none disabled:opacity-60"
          />
        </div>

        {/* ベースクルー選択 */}
        {masterMembers.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-700">
              追加するベースクルー (複数選択可)
            </label>
            <div className="max-h-36 overflow-y-auto border border-slate-200 p-2.5 rounded-xl bg-slate-50/70 text-xs space-y-1.5">
              {masterMembers.map((mm) => (
                <label
                  key={mm.id}
                  className={`flex items-center gap-2.5 cursor-pointer select-none py-1.5 px-2.5 rounded-lg border transition-all ${
                    selectedNames[mm.name]
                      ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950 font-bold'
                      : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!selectedNames[mm.name]}
                    onChange={() => handleCheckboxChange(mm.name)}
                    disabled={isPending}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-xs">{mm.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 決済方法の許可 */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="block text-xs font-extrabold text-slate-700">
            精算時に許可する決済方法
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
              allowBankTransfer ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200'
            }`}>
              <input
                type="checkbox"
                checked={allowBankTransfer}
                onChange={(e) => setAllowBankTransfer(e.target.checked)}
                disabled={isPending}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span className="font-bold text-slate-800">銀行振込</span>
            </label>
            <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
              allowPaypay ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200'
            }`}>
              <input
                type="checkbox"
                checked={allowPaypay}
                onChange={(e) => setAllowPaypay(e.target.checked)}
                disabled={isPending}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span className="font-bold text-slate-800">PayPay送金</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl text-sm transition-all shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-white" />}
          <span>{isPending ? '作成中...' : 'イベントを作成する'}</span>
        </button>
      </form>
    </div>
  );
}
