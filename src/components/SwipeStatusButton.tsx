'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import { actionUpdateSettlementStatus } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';

interface SwipeStatusButtonProps {
  settlementId: string;
  currentStatus: 'pending' | 'paid' | 'receipt_issued';
  canOperate: boolean; // 受取人本人だけが操作可能
  isParticipant?: boolean; // 当事者（支払者または受取人）かどうか
}

export default function SwipeStatusButton({
  settlementId,
  currentStatus,
  canOperate,
  isParticipant = false,
}: SwipeStatusButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);

  // ステータスのローカルキャッシュ（楽観的UI）
  const [localStatus, setLocalStatus] = useState(currentStatus);

  useEffect(() => {
    setLocalStatus(currentStatus);
  }, [currentStatus]);

  // ドラッグ開始位置の記録用Ref
  const startXRef = useRef(0);

  // 最大スライド可能幅の計算
  const getMaxSlideWidth = () => {
    if (!containerRef.current || !handleRef.current) return 0;
    return containerRef.current.clientWidth - handleRef.current.clientWidth - 8; // 左右パディング分
  };

  const handleStart = (clientX: number) => {
    if (!canOperate || isPending || localStatus === 'receipt_issued') return;
    setIsDragging(true);
    startXRef.current = clientX;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    const deltaX = clientX - startXRef.current;
    const maxW = getMaxSlideWidth();
    setDragX(Math.max(0, Math.min(maxW, deltaX)));
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const maxW = getMaxSlideWidth();
    const slideRatio = maxW > 0 ? dragX / maxW : 0;

    // 70%以上のスライドでステータス変更確定
    if (slideRatio >= 0.7) {
      const nextStatus = localStatus === 'pending' ? 'paid' : 'receipt_issued';
      
      // 1. クライアント側で即座に変更状態を反映してつまみをリセット
      setLocalStatus(nextStatus);
      setDragX(0);

      // 2. バックグラウンドでサーバーを非同期更新
      startTransition(async () => {
        try {
          const res = await actionUpdateSettlementStatus(settlementId, nextStatus);
          if (res && 'error' in res && res.error) {
            throw new Error(res.error);
          }
          router.refresh();
        } catch (e) {
          console.error(e);
          // エラー時はロールバック
          setLocalStatus(currentStatus);
          alert('ステータスの更新に失敗しました。');
        }
      });
    } else {
      // 満たない場合は元の位置へ戻す
      setDragX(0);
    }
  };

  // マウスイベントのバインド
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (handleRef.current && handleRef.current.contains(e.target as Node)) {
        handleStart(e.clientX);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX);
      }
    };

    const onMouseUp = () => {
      if (isDragging) {
        handleEnd();
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, localStatus, dragX, isPending, canOperate]);

  // タッチイベントのバインド (モバイル対応)
  useEffect(() => {
    const handleElement = handleRef.current;
    if (!handleElement) return;

    const onTouchStart = (e: TouchEvent) => {
      handleStart(e.touches[0].clientX);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        handleMove(e.touches[0].clientX);
      }
    };

    const onTouchEnd = () => {
      if (isDragging) {
        handleEnd();
      }
    };

    handleElement.addEventListener('touchstart', onTouchStart, { passive: true });
    handleElement.addEventListener('touchmove', onTouchMove, { passive: true });
    handleElement.addEventListener('touchend', onTouchEnd);

    return () => {
      handleElement.removeEventListener('touchstart', onTouchStart);
      handleElement.removeEventListener('touchmove', onTouchMove);
      handleElement.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, localStatus, dragX, isPending, canOperate]);

  // 表示テキストとカラーの判定
  const getUIConfig = () => {
    switch (localStatus) {
      case 'pending':
        return {
          bg: 'bg-slate-100 border border-slate-200 text-slate-500',
          text: 'スライドして受取完了',
          btnBg: 'bg-indigo-600 text-white',
        };
      case 'paid':
        return {
          bg: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
          text: 'スライドして領収書発行',
          btnBg: 'bg-emerald-600 text-white',
        };
      case 'receipt_issued':
      default:
        return {
          bg: 'bg-indigo-50 border border-indigo-200 text-indigo-900',
          text: '領収書発行完了 (精算済)',
          btnBg: 'bg-indigo-650 text-white',
        };
    }
  };

  const ui = getUIConfig();

  // 領収書発行完了時：当事者（isParticipant）は親で「領収書を確認」ボタンが表示されるため非表示、非当事者には「精算完了」バッジを表示
  if (localStatus === 'receipt_issued') {
    if (isParticipant) return null;
    return (
      <span className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-indigo-50 border-indigo-200 text-indigo-900 select-none">
        精算完了
      </span>
    );
  }

  // 操作権限がない場合（支払者本人または閲覧者）：状況に応じた読み取り専用バッジとして表示
  if (!canOperate) {
    let displayText = '';
    let badgeColor = '';
    if (localStatus === 'pending') {
      displayText = '未払い';
      badgeColor = 'bg-gray-100 border-gray-300 text-gray-700';
    } else {
      displayText = '支払済';
      badgeColor = 'bg-emerald-50 border-emerald-300 text-emerald-800';
    }

    return (
      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${badgeColor} select-none`}>
        {displayText}
      </span>
    );
  }

  // 操作可能かつ未完了の場合：スワイプ式ボタン
  return (
    <div
      ref={containerRef}
      className={`relative flex items-center h-10 w-48 rounded-full p-1 select-none overflow-hidden transition-all shadow-inner ${ui.bg}`}
    >
      <button
        ref={handleRef}
        type="button"
        style={{ transform: `translateX(${dragX}px)` }}
        className={`absolute left-1 h-8 w-8 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow transition-transform duration-75 ease-out z-10 ${ui.btnBg}`}
      >
        <ArrowRight className="h-4 w-4" />
      </button>
      
      <span className="w-full text-center text-[10px] font-extrabold tracking-tight pl-7 pr-2">
        {isPending ? '同期中...' : ui.text}
      </span>
    </div>
  );
}
