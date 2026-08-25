'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { actionCreateMasterMember, actionUpdateMasterMember, actionDeleteMasterMember } from '@/lib/actions';
import { Plus, Edit2, Trash2, Check, X, AlertCircle, Users } from 'lucide-react';

interface MasterMember {
  id: string;
  name: string;
}

interface MasterMemberManagerProps {
  initialMembers: MasterMember[];
}

export default function MasterMemberManager({ initialMembers }: MasterMemberManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await actionCreateMasterMember(newName.trim());
      if (res && res.error) {
        setErrorMsg(res.error);
      } else {
        setNewName('');
        router.refresh();
      }
    });
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
    setErrorMsg(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await actionUpdateMasterMember(id, editingName.trim());
      if (res && res.error) {
        setErrorMsg(res.error);
      } else {
        setEditingId(null);
        router.refresh();
      }
    });
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`共通メンバー「${name}」を削除しますか？\n(すでに作成済みのプロジェクト内のデータには影響しません)`)) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await actionDeleteMasterMember(id);
      if (res && res.error) {
        setErrorMsg(res.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="font-medium">{errorMsg}</p>
        </div>
      )}

      {/* 追加フォーム */}
      <form onSubmit={handleAddMember} className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">共通メンバーを追加</h3>
        <div className="flex gap-2">
          <input
            type="text"
            required
            placeholder="例: Aさん、Bさん、山田さん"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPending || !newName.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition flex items-center gap-1 shadow-sm disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>登録</span>
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          ※ ここで登録したメンバーは、今後新しく作成するすべてのプロジェクトに最初から自動で参加します。
        </p>
      </form>

      {/* メンバー一覧 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600" />
          <span>共通登録メンバー ({initialMembers.length}名)</span>
        </h3>

        {initialMembers.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm italic">
            共通メンバーは登録されていません。よく割り勘する友達などを追加してください。
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {initialMembers.map((member) => {
              const isEditing = editingId === member.id;

              return (
                <div key={member.id} className="py-3 flex items-center justify-between gap-4 border-b border-gray-100 last:border-b-0">
                  {isEditing ? (
                    <div className="flex-1 flex gap-2 items-center">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 max-w-xs px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(member.id)}
                        disabled={isPending || !editingName.trim()}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-100 transition"
                        title="保存"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-gray-500 hover:bg-gray-100 rounded border border-gray-200 transition"
                        title="キャンセル"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="font-semibold text-gray-800 text-sm">{member.name}</span>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => startEditing(member.id, member.name)}
                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded border border-indigo-100 transition"
                        title="名前変更"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMember(member.id, member.name)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded border border-red-100 transition"
                        title="削除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
