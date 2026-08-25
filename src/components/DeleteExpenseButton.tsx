'use client';

import { useTransition } from 'react';
import { actionDeleteExpense } from '@/lib/actions';
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteExpenseButtonProps {
  expenseId: string;
}

export default function DeleteExpenseButton({ expenseId }: DeleteExpenseButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('この支出を削除しますか？')) return;

    startTransition(async () => {
      const res = await actionDeleteExpense(expenseId);
      if (res && res.error) {
        alert(res.error);
      }
    });
  };

  return (
    <form onSubmit={handleDelete} className="flex">
      <button
        type="submit"
        disabled={isPending}
        className="p-1.5 hover:bg-red-50 text-gray-500 hover:text-red-600 transition disabled:opacity-50 flex items-center justify-center cursor-pointer"
        title="削除"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
    </form>
  );
}
