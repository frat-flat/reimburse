'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { actionUpdateProject } from '@/lib/actions';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface EditProjectFormProps {
  project: {
    id: string;
    name: string;
    description: string | null;
  };
}

export default function EditProjectForm({ project }: EditProjectFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('イベント名は必須です。');
      return;
    }

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('description', description.trim());

    setErrorMsg(null);
    startTransition(async () => {
      const res = await actionUpdateProject(project.id, formData);
      if (res && res.error) {
        setErrorMsg(res.error);
      } else {
        router.push(`/projects/${project.id}`);
        router.refresh();
      }
    });
  };

  return (
    <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">イベントを編集</h2>
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center text-xs text-gray-500 hover:text-indigo-600 transition font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-0.5" />
          戻る
        </Link>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-650 flex-shrink-0 mt-0.5" />
          <p className="font-medium">{errorMsg}</p>
        </div>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* 説明 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            説明 (任意)
          </label>
          <textarea
            rows={4}
            placeholder="イベントの目的やメモ"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isPending ? '保存中...' : '変更を保存'}
        </button>
      </form>
    </div>
  );
}
