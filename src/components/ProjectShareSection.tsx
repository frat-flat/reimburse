'use client';

import React, { useState, useTransition } from 'react';
import { actionShareProject, actionRemoveProjectShare, actionUpdateProjectShareRole } from '@/lib/actions';
import { Share2, User, Shield, X, AlertCircle } from 'lucide-react';

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
    startTransition(async () => {
      const res = await actionUpdateProjectShareRole(shareId, newRole);
      if (res && res.error) {
        setErrorMsg(res.error);
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
                  <span className="text-[7px] text-gray-400 mt-0.5">個人分のみ</span>
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
                  <span className="text-[7px] text-gray-400 mt-0.5">全体計算</span>
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
                  <span className="text-[7px] text-gray-400 mt-0.5">支出追加可</span>
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-bold py-2 rounded-lg text-xs transition shadow-sm disabled:opacity-50 cursor-pointer"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {projectShares.map((share) => {
              const linkedMember = members.find((m) => m.userId === share.userId);
              return (
                <div
                  key={share.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm space-y-2.5 relative flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="truncate pr-4">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-500" />
                          <span className="font-extrabold text-slate-800 text-xs truncate">{share.user.name}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 truncate pl-5 mt-0.5">{share.user.email}</p>
                      </div>
                      <button
                        onClick={() => handleRemove(share.id)}
                        disabled={isPending}
                        className="text-red-500 hover:bg-red-50 p-1 rounded-md transition flex-shrink-0 cursor-pointer"
                        title="共有解除"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {linkedMember && (
                      <div className="pl-5 mt-1.5">
                        <span className="text-[8px] bg-indigo-50 border border-indigo-150 text-indigo-750 px-1.5 py-0.5 rounded font-extrabold">
                          名簿メンバー: {linkedMember.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200/60 pt-2 space-y-1">
                    <span className="block text-[8px] font-bold text-slate-450 uppercase tracking-wider">権限の割り当て</span>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { val: 'viewer_personal', label: '個人閲覧' },
                        { val: 'viewer_all', label: '全体閲覧' },
                        { val: 'editor', label: '編集可能' },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          disabled={isPending}
                          onClick={() => handleRoleChange(share.id, opt.val)}
                          className={`py-1 text-[9px] rounded font-bold transition-all border cursor-pointer ${
                            share.role === opt.val
                              ? 'bg-indigo-650 border-indigo-700 text-white shadow-sm'
                              : 'bg-white border-slate-250 text-slate-600 hover:bg-slate-100 hover:border-slate-350'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
