'use client';

import React, { useState, useTransition } from 'react';
import { actionShareProject, actionRemoveProjectShare } from '@/lib/actions';
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
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
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
              <label className="block text-[10px] font-bold text-gray-600 mb-1">
                共有権限
              </label>
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-1.5 border border-gray-350 p-2 rounded-lg cursor-pointer bg-white hover:bg-gray-50 text-xs font-semibold select-none">
                  <input
                    type="radio"
                    name="role"
                    checked={role === 'viewer'}
                    onChange={() => setRole('viewer')}
                    className="text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span>閲覧のみ</span>
                </label>
                <label className="flex-1 flex items-center justify-center gap-1.5 border border-gray-350 p-2 rounded-lg cursor-pointer bg-white hover:bg-gray-50 text-xs font-semibold select-none">
                  <input
                    type="radio"
                    name="role"
                    checked={role === 'editor'}
                    onChange={() => setRole('editor')}
                    className="text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span>編集可能</span>
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-bold py-2 rounded-lg text-xs transition shadow-sm disabled:opacity-50"
          >
            {isPending ? '共有処理中...' : 'crewを追加'}
          </button>
        </form>
      )}

      {/* 現在の共有リスト */}
      <div className="space-y-2 pt-2 border-t border-gray-100">
        <span className="text-xs font-bold text-gray-500">共有中のcrew ({projectShares.length}):</span>
        {projectShares.length === 0 ? (
          <p className="text-[11px] text-gray-400 italic">まだ共有しているcrewはいません</p>
        ) : (
          <ul className="space-y-2">
            {projectShares.map((share) => (
              <li
                key={share.id}
                className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
              >
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-gray-400" />
                    <span className="font-bold text-gray-800 truncate">{share.user.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                      share.role === 'editor'
                        ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}>
                      {share.role === 'editor' ? '編集可能' : '閲覧のみ'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 truncate pl-4.5 mt-0.5">{share.user.email}</p>
                </div>
                <button
                  onClick={() => handleRemove(share.id)}
                  disabled={isPending}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition ml-2 flex-shrink-0"
                  title="共有解除"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
