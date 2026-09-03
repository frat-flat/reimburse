'use client';

import React, { useState, useTransition } from 'react';
import { actionShareProject, actionRemoveProjectShare, actionUpdateProjectShareRole } from '@/lib/actions';
import { Share2, User, Shield, X, AlertCircle, Pencil, Check, Trash2 } from 'lucide-react';

interface Friend {
  id: string;
  name: string;
  email: string;
}

interface Member {
  id: string;
  name: string;
  userId?: string | null;
}

interface ProjectShare {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  user: {
    name: string;
    email: string;
  };
}

interface ProjectShareSectionProps {
  projectId: string;
  friends: Friend[];
  members: Member[];
  projectShares: ProjectShare[];
}

export default function ProjectShareSection({
  projectId,
  friends,
  members,
  projectShares,
}: ProjectShareSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [role, setRole] = useState<string>('viewer_all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // インライン編集用ステート
  const [editingShareId, setEditingShareId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string>('');

  const startEditing = (shareId: string, currentRole: string) => {
    setEditingShareId(shareId);
    setEditingRole(currentRole);
  };

  const saveRoleEdit = (shareId: string) => {
    if (!editingRole) return;
    handleRoleChange(shareId, editingRole);
    setEditingShareId(null);
  };

  const cancelEditing = () => {
    setEditingShareId(null);
    setEditingRole('');
  };

  // クルーの権限情報を即時反映させるためのローカルステート
  const [localShares, setLocalShares] = useState<ProjectShare[]>(projectShares);

  // 親コンポーネントからの再レンダリングや共有追加/削除に伴う同期
  React.useEffect(() => {
    setLocalShares(projectShares);
  }, [projectShares]);

  // まだ紐付けられていないメンバー
  const unlinkedMembers = members.filter((m) => !m.userId);

  // 既に共有されている友達を除外した、共有可能な友達リスト
  const shareableFriends = friends.filter(
    (f) => !projectShares.some((s) => s.userId === f.id)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriendId || !selectedMemberId) {
      setErrorMsg('招待するMateと、対応する精算メンバーを選択してください。');
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const res = await actionShareProject(projectId, selectedMemberId, selectedFriendId, role);
      if (res && res.error) {
        setErrorMsg(res.error);
      } else {
        setSelectedFriendId('');
        setSelectedMemberId('');
      }
    });
  };

  const handleRemove = (shareId: string) => {
    if (!confirm('このcrewのイベント共有を解除しますか？')) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await actionRemoveProjectShare(shareId);
      if (res && res.error) {
        setErrorMsg(res.error);
      }
    });
  };

  const handleRoleChange = (shareId: string, newRole: string) => {
    setErrorMsg(null);

    // 1. クライアント側のラジオボタン表示状態を「即座に」パッと切り替える
    const prevShares = [...localShares];
    setLocalShares(
      localShares.map((s) => (s.id === shareId ? { ...s, role: newRole } : s))
    );

    // 2. バックグラウンドで非同期にデータベースを更新する
    startTransition(async () => {
      try {
        const res = await actionUpdateProjectShareRole(shareId, newRole);
        if (res && 'error' in res && res.error) {
          throw new Error(res.error);
        }
      } catch (e: any) {
        console.error('Failed to update role:', e);
        setErrorMsg('権限の更新に失敗しました。');
        // エラー時は元の状態にロールバック
        setLocalShares(prevShares);
      }
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
        <Share2 className="h-5 w-5 text-indigo-650" />
        <h2 className="text-base font-bold text-gray-900 font-bold">イベントの共有 (crew設定)</h2>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 text-red-650 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 新規共有フォーム */}
      {shareableFriends.length === 0 || unlinkedMembers.length === 0 ? (
        <p className="text-xs text-gray-400 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100">
          {shareableFriends.length === 0
            ? '共有可能なMateがいません（すべてのMateに共有済みか、Mate登録がありません）。'
            : '紐付け可能な精算メンバーがいません。新たにメンバーを追加してください。'}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 bg-gray-50 border border-gray-150 p-3.5 rounded-xl">
          <p className="text-[10px] text-gray-500 font-semibold leading-relaxed">
            Mateをイベントの精算メンバーに紐付けてcrewとして招待します。
          </p>

          <div className="grid grid-cols-1 gap-2.5 text-xs">
            {/* Mate選択 */}
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1">
                招待するMate
              </label>
              <select
                value={selectedFriendId}
                onChange={(e) => setSelectedFriendId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white font-semibold"
                required
              >
                <option value="">-- 選択してください --</option>
                {shareableFriends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.email})
                  </option>
                ))}
              </select>
            </div>

            {/* メンバー選択 */}
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1">
                対応する精算メンバー
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white font-semibold"
                required
              >
                <option value="">-- 選択してください --</option>
                {unlinkedMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 権限選択 */}
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1.5">
                共有権限
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <label className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer border text-center select-none transition ${
                  role === 'viewer_personal'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold'
                    : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    checked={role === 'viewer_personal'}
                    onChange={() => setRole('viewer_personal')}
                    className="sr-only"
                  />
                  <span className="text-[10px]">個人閲覧</span>
                  <span className="text-[7px] text-gray-500 mt-0.5 font-medium">個人分 (支払追加可)</span>
                </label>

                <label className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer border text-center select-none transition ${
                  role === 'viewer_all'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold'
                    : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    checked={role === 'viewer_all'}
                    onChange={() => setRole('viewer_all')}
                    className="sr-only"
                  />
                  <span className="text-[10px]">全体閲覧</span>
                  <span className="text-[7px] text-gray-500 mt-0.5 font-medium">全体計算 (支払追加可)</span>
                </label>

                <label className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer border text-center select-none transition ${
                  role === 'editor'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold'
                    : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    checked={role === 'editor'}
                    onChange={() => setRole('editor')}
                    className="sr-only"
                  />
                  <span className="text-[10px]">編集可能</span>
                  <span className="text-[7px] text-gray-500 mt-0.5 font-medium">全データ編集可</span>
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isPending ? '共有処理中...' : 'crewを追加'}
          </button>
        </form>
      )}

      {/* 現在の共有リスト ➔ 権限管理ボード */}
      <div className="space-y-3 pt-3 border-t border-gray-150">
        <span className="text-xs font-bold text-gray-650">共有中crewの権限管理ボード ({projectShares.length}):</span>
        {projectShares.length === 0 ? (
          <p className="text-[11px] text-gray-400 italic">まだ共有しているcrewはいません</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-gray-200 text-gray-500 font-bold text-[10px]">
                  <th className="py-2.5 px-3.5 font-extrabold text-slate-600">クルー情報</th>
                  <th className="py-2.5 px-2 text-center font-extrabold text-slate-600 w-44">付与された権限</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-155">
                {localShares.map((share) => {
                  const linkedMember = members.find((m) => m.userId === share.userId);
                  const isEditing = share.id === editingShareId;
                  
                  const getRoleBadge = (r: string) => {
                    switch (r) {
                      case 'viewer_personal':
                        return { text: '個人閲覧', style: 'bg-amber-50 text-amber-700 border-amber-250' };
                      case 'viewer_all':
                        return { text: '全体閲覧', style: 'bg-emerald-50 text-emerald-700 border-emerald-250' };
                      case 'editor':
                        return { text: '編集可能', style: 'bg-indigo-50 text-indigo-750 border-indigo-250' };
                      default:
                        return { text: r, style: 'bg-gray-50 text-gray-650 border-gray-250' };
                    }
                  };
                  
                  const badge = getRoleBadge(share.role);

                  return (
                    <tr key={share.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* クルー情報 */}
                      <td className="py-3 px-3.5 min-w-[140px]">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                          <span className="font-extrabold text-slate-800 text-xs">{share.user.name}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 pl-5 mt-0.5">{share.user.email}</p>
                        {linkedMember && (
                          <div className="pl-5 mt-1.5">
                            <span className="text-[8px] bg-indigo-50 border border-indigo-150 text-indigo-750 px-1.5 py-0.5 rounded font-extrabold inline-block">
                              名簿: {linkedMember.name}
                            </span>
                          </div>
                        )}
                      </td>
                      
                      {/* 付与された権限 */}
                      <td className="py-3 px-2 text-center w-44">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <select
                              value={editingRole}
                              onChange={(e) => setEditingRole(e.target.value)}
                              disabled={isPending}
                              className="text-[10px] font-bold bg-white border border-gray-300 rounded px-1.5 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                            >
                              <option value="viewer_personal">個人閲覧</option>
                              <option value="viewer_all">全体閲覧</option>
                              <option value="editor">編集可能</option>
                            </select>
                            <button
                              onClick={() => saveRoleEdit(share.id)}
                              disabled={isPending}
                              className="p-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition cursor-pointer shadow-sm"
                              title="保存"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={isPending}
                              className="p-1 rounded bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition cursor-pointer shadow-sm"
                              title="キャンセル"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleRemove(share.id)}
                              disabled={isPending}
                              className="p-1 rounded bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition cursor-pointer shadow-sm ml-1"
                              title="共有解除"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${badge.style}`}>
                              {badge.text}
                            </span>
                            <button
                              onClick={() => startEditing(share.id, share.role)}
                              disabled={isPending}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              title="権限を編集"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
