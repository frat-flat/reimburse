'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Check, RotateCcw, Zap, X } from 'lucide-react';

export default function SwipeSimulatorPage() {
  const [canOperate, setCanOperate] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<'pending' | 'paid' | 'receipt_issued'>('pending');
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);

  const startXRef = useRef(0);

  const getMaxSlideWidth = () => {
    if (!containerRef.current || !handleRef.current) return 0;
    return containerRef.current.clientWidth - handleRef.current.clientWidth - 8;
  };

  const handleStart = (clientX: number) => {
    if (!canOperate || currentStatus === 'receipt_issued') return;
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

    if (slideRatio >= 0.7) {
      const nextStatus = currentStatus === 'pending' ? 'paid' : 'receipt_issued';
      setCurrentStatus(nextStatus);
      setDragX(0);
    } else {
      setDragX(0);
    }
  };

  // マウスイベントの監視
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (handleRef.current && handleRef.current.contains(e.target as Node)) {
        handleStart(e.clientX);
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const onMouseUp = () => {
      if (isDragging) handleEnd();
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, currentStatus, dragX, canOperate]);

  // タッチイベントの監視 (モバイル対応)
  useEffect(() => {
    const handleElement = handleRef.current;
    if (!handleElement) return;

    const onTouchStart = (e: TouchEvent) => {
      handleStart(e.touches[0].clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging) handleMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => {
      if (isDragging) handleEnd();
    };

    handleElement.addEventListener('touchstart', onTouchStart, { passive: true });
    handleElement.addEventListener('touchmove', onTouchMove, { passive: true });
    handleElement.addEventListener('touchend', onTouchEnd);
    return () => {
      handleElement.removeEventListener('touchstart', onTouchStart);
      handleElement.removeEventListener('touchmove', onTouchMove);
      handleElement.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, currentStatus, dragX, canOperate]);

  const resetSimulator = () => {
    setCurrentStatus('pending');
    setDragX(0);
    setIsModalOpen(false);
  };

  const getUIConfig = () => {
    switch (currentStatus) {
      case 'pending':
        return {
          bg: 'bg-slate-100 border border-slate-200 text-slate-500',
          text: 'スライドして受取完了',
          btnBg: 'bg-indigo-600 text-white',
        };
      case 'paid':
        return {
          bg: 'bg-emerald-50 border border-emerald-250 text-emerald-700',
          text: 'スライドして領収書発行',
          btnBg: 'bg-emerald-600 text-white',
        };
      case 'receipt_issued':
      default:
        return {
          bg: 'bg-indigo-50 border border-indigo-200 text-indigo-950',
          text: '領収書発行完了 (精算済)',
          btnBg: 'bg-indigo-650 text-white',
        };
    }
  };

  const ui = getUIConfig();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 flex flex-col items-center justify-center select-none">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-indigo-900 text-white p-5">
          <h1 className="text-base font-bold flex items-center gap-2">
            <Zap className="h-4.5 w-4.5 text-indigo-300" />
            <span>スワイプ精算・領収書発行シミュレーター</span>
          </h1>
          <p className="text-[10px] text-indigo-200 mt-1">
            実際のシステムと全く同じ動作をするブラウザ体験用シミュレーターです。
          </p>
        </div>

        {/* コントロール */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <span className="text-[10px] font-bold text-slate-400 block mb-2">シミュレーション設定（役割の切り替え）</span>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setCanOperate(true)}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition shadow-sm cursor-pointer ${
                canOperate
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-950'
                  : 'border-slate-200 bg-white text-slate-650 hover:bg-slate-50'
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full border bg-white ${canOperate ? 'border-4 border-indigo-600' : 'border-slate-300'}`} />
              受け取り側 (操作可)
            </button>
            <button
              onClick={() => setCanOperate(false)}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition shadow-sm cursor-pointer ${
                !canOperate
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-950'
                  : 'border-slate-200 bg-white text-slate-650 hover:bg-slate-50'
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full border bg-white ${!canOperate ? 'border-4 border-indigo-600' : 'border-slate-300'}`} />
              他のクルー (閲覧のみ)
            </button>
          </div>
        </div>

        {/* メインデモエリア */}
        <div className="p-5 md:p-6 space-y-5">
          <div className={`p-3 rounded-xl text-xs leading-relaxed ${canOperate ? 'bg-indigo-50 text-indigo-950 border border-indigo-150' : 'bg-amber-50 text-amber-955 border border-amber-150'}`}>
            {canOperate ? (
              <p><strong>💡 自分が受け取り側の画面:</strong> 右側のつまみを右端まで引いてスワイプすることで、ステータスを「未払い ➔ 受取済み ➔ 領収書発行」に進められます。</p>
            ) : (
              <p><strong>⚠️ 他のクルーが見る画面:</strong> スワイプ操作はできません。受取人が進めたステータスの状態が、単なる静的バッジとして反映されます。</p>
            )}
          </div>

          {/* 取引カード */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs">
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-bold text-red-650 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded mb-0.5">支払う</span>
                <span className="font-bold text-slate-800">小笠原 太一</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded mb-0.5">受け取る</span>
                <span className="font-bold text-slate-800">テストユーザー (あなた)</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
              <strong className="text-base font-black text-slate-900">98,474円</strong>
              
              <div className="flex items-center gap-2">
                {/* 領収書ボタン */}
                {(currentStatus === 'paid' || currentStatus === 'receipt_issued') && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1.5 rounded-lg text-[10px] transition active:scale-95 flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <span>領収書表示</span>
                  </button>
                )}

                {canOperate ? (
                  <div
                    ref={containerRef}
                    className={`relative flex items-center h-10 w-44 rounded-full p-1 overflow-hidden transition-all shadow-inner ${ui.bg}`}
                  >
                    {currentStatus !== 'receipt_issued' ? (
                      <>
                        <button
                          ref={handleRef}
                          type="button"
                          style={{ transform: `translateX(${dragX}px)` }}
                          className={`absolute left-1 h-8 w-8 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow transition-transform duration-75 ease-out z-10 ${ui.btnBg}`}
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-full text-center text-[9px] font-extrabold tracking-tight pl-7 pr-1">
                          {ui.text}
                        </span>
                      </>
                    ) : (
                      <div className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-indigo-900">
                        <Check className="h-3.5 w-3.5 text-indigo-600" />
                        <span>領収書発行済</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${
                    currentStatus === 'pending'
                      ? 'bg-gray-150 border-gray-250 text-gray-550'
                      : currentStatus === 'paid'
                      ? 'bg-emerald-50 border-emerald-250 text-emerald-700'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-900'
                  }`}>
                    {currentStatus === 'pending' ? '未払い' : currentStatus === 'paid' ? '受取済み (未発行)' : '領収書発行済'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* リセットボタン */}
          <div className="flex justify-center pt-2">
            <button
              onClick={resetSimulator}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-[10px] font-bold text-slate-650 hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              シミュレーターをリセット
            </button>
          </div>
        </div>
      </div>

      {/* 領収書モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-sm p-5 shadow-2xl relative transform scale-100 transition-transform">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="border-4 double border-slate-700 p-4 font-serif text-slate-900 bg-[#fcfbf9] my-2">
              <h2 className="text-center text-base font-extrabold tracking-widest border-b border-slate-800 pb-1.5 mb-3">領　収　書</h2>
              <div className="space-y-3 text-xs leading-relaxed">
                <div>
                  <span className="border-b border-slate-800 pb-0.5 inline-block w-32 font-bold">小笠原 太一 様</span>
                </div>
                <div className="text-center py-2.5 bg-white border border-slate-200 my-1">
                  <span className="text-[9px] text-slate-500 block">金額</span>
                  <strong className="text-lg font-black font-sans">￥98,474-</strong>
                </div>
                <p className="text-[10px] text-slate-500">
                  但し、BBQイベントの精算メンバー間送金として上記金額を受領いたしました。
                </p>
                <div className="border-t border-slate-250 pt-3 flex justify-between text-[10px] font-sans">
                  <div>
                    <p>発行日: 2026年8月28日</p>
                    <p className="mt-1 font-serif font-bold text-slate-800">受領者: テストユーザー</p>
                  </div>
                  <div className="border-2 border-red-500 text-red-500 rounded-full w-10 h-10 flex flex-col items-center justify-center rotate-6 text-[6px] font-bold select-none opacity-80">
                    <span className="scale-75 leading-none">ユーザー</span>
                    <span className="scale-75 leading-none border-t border-red-400 pt-0.5">受領印</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
