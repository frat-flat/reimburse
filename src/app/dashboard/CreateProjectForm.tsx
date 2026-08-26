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
    <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
        <FolderPlus className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-gray-900">新しいイベント</h2>
      </div>

      {errorMsg && (
        <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded border border-red-100">{errorMsg}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* イベント名 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            イベント名 <span className="text-red-500 text-xs">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="例: 2026年沖縄旅行、BBQ"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition disabled:opacity-60 disabled:bg-gray-50"
          />
        </div>

        {/* 説明 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            説明 (任意)
          </label>
          <textarea
            rows={3}
            placeholder="イベントの目的やメモ"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isPending}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition resize-none disabled:opacity-60 disabled:bg-gray-50"
          />
        </div>

        {/* ベースクルー選択 */}
        {masterMembers.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700">
              追加するベースクルーを選択 (複数選択可)
            </label>
            <div className="max-h-36 overflow-y-auto border border-gray-200 p-2.5 rounded-lg bg-gray-50 text-xs space-y-1.5 shadow-inner">
              {masterMembers.map((mm) => (
                <label key={mm.id} className="flex items-center gap-2 cursor-pointer select-none py-0.5 hover:bg-white px-1.5 rounded transition-all">
                  <input
                    type="checkbox"
                    checked={!!selectedNames[mm.name]}
                    onChange={() => handleCheckboxChange(mm.name)}
                    disabled={isPending}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 disabled:opacity-60"
                  />
                  <span className="text-gray-800 font-bold">{mm.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-white" />}
          <span>{isPending ? '作成中...' : 'イベントを作成'}</span>
        </button>
      </form>
    </div>
  );
}
