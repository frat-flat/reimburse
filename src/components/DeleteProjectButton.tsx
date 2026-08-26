'use client';

import { useTransition } from 'react';
import { actionDeleteProject } from '@/lib/actions';
import { Trash2 } from 'lucide-react';

interface DeleteProjectButtonProps {
  projectId: string;
}

export default function DeleteProjectButton({ projectId }: DeleteProjectButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm('本当にこのイベントを削除しますか？\n登録されているメンバーや支出、精算レコードもすべて削除され、復元できません。')) {
      startTransition(async () => {
        await actionDeleteProject(projectId);
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-2 text-red-500 hover:text-red-750 hover:bg-red-50 rounded-lg border border-red-200 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1 text-sm font-semibold"
      title="イベントを削除"
    >
      <Trash2 className="h-4 w-4" />
      <span>{isPending ? '削除中...' : '削除'}</span>
    </button>
  );
}
