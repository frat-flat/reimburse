'use client';

import React, { useState, useRef } from 'react';
import { X, Printer, Receipt } from 'lucide-react';
import ImageCropper from './ImageCropper';

interface ReceiptModalProps {
  payerName: string;
  receiverName: string;
  amount: number;
  projectName: string;
  dateString: string;
  issuerInfo: {
    name?: string | null;
    zip?: string | null;
    address?: string | null;
    tel?: string | null;
    regNo?: string | null;
    stampImage?: string | null;
    stampSize?: number | null;
    stampOffsetX?: number | null;
    stampOffsetY?: number | null;
    stampOpacity?: number | null;
  };
  triggerButtonText?: string;
  triggerButtonClassName?: string;
  onStampChange?: (offset: { x: number; y: number }, opacity: number) => void;
  closeButtonText?: string;
  closeButtonType?: 'button' | 'submit';
}

export default function ReceiptModal({
  payerName,
  receiverName,
  amount,
  projectName,
  dateString,
  issuerInfo,
  triggerButtonText,
  triggerButtonClassName,
  onStampChange,
  closeButtonText,
  closeButtonType,
}: ReceiptModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stampImage, setStampImage] = useState(issuerInfo.stampImage || '');
  const [stampSize, setStampSize] = useState(issuerInfo.stampSize || 60);
  const [stampOpacity, setStampOpacity] = useState(issuerInfo.stampOpacity ?? 0.85);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);

  // 印鑑ドラッグ用
  const [stampOffset, setStampOffset] = useState({
    x: issuerInfo.stampOffsetX || 0,
    y: issuerInfo.stampOffsetY || 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStart.current = {
      x: clientX - stampOffset.x,
      y: clientY - stampOffset.y
    };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setStampOffset({
      x: clientX - dragStart.current.x,
      y: clientY - dragStart.current.y
    });
  };

  const handleEnd = () => {
    setIsDragging(false);
    if (onStampChange) {
      onStampChange(stampOffset, stampOpacity);
    }
  };

  const handleLocalStampSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropperSrc(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePrint = () => {
    window.print();
  };

  const displayName = issuerInfo.name || receiverName;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={triggerButtonClassName || "inline-flex items-center gap-1 bg-white hover:bg-indigo-50 text-indigo-700 font-extrabold px-2.5 py-1.5 rounded-lg text-[10px] border border-indigo-200 transition shadow-sm cursor-pointer active:scale-95"}
      >
        <Receipt className="h-3.5 w-3.5" />
        <span>{triggerButtonText || "領収書を発行"}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:absolute print:inset-0">
          {/* モーダルカード */}
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative border border-gray-150 flex flex-col print:shadow-none print:border-none print:p-0 print:rounded-none">
            
            {/* 閉じる・印刷ヘッダー（印刷時は非表示） */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6 print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="h-5.5 w-5.5 text-indigo-650" />
                <h3 className="text-sm font-bold text-gray-800">領収書プレビュー</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="bg-indigo-650 hover:bg-indigo-750 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>印刷・PDF出力</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-650 p-1.5 rounded-md hover:bg-gray-100 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 印影追加コントロール (印刷時は非表示) */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl mb-4 text-xs space-y-2 print:hidden animate-fade">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-750">領収書に印影 (ハンコ) を配置する:</span>
                {stampImage && (
                  <button
                    onClick={() => setStampImage('')}
                    className="text-[10px] text-red-650 font-bold hover:text-red-750"
                  >
                    配置を解除する
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex gap-2">
                  <label className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-750 font-bold py-1.5 px-3 rounded-lg cursor-pointer transition">
                    <span>📷 カメラを起動して撮影</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleLocalStampSelect}
                      className="hidden"
                    />
                  </label>
                  <label className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-755 font-bold py-1.5 px-3 rounded-lg cursor-pointer transition">
                    <span>📁 ファイルから選択</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLocalStampSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* スライダーグループ */}
                {stampImage && (
                  <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-[300px]">
                    {/* サイズ調整スライダー */}
                    <div className="flex items-center gap-2 text-xs flex-1 min-w-[140px]">
                      <span className="font-bold text-slate-550 whitespace-nowrap text-[10px]">印影サイズ: {stampSize}px</span>
                      <input
                        type="range"
                        min="40"
                        max="120"
                        step="5"
                        value={stampSize}
                        onChange={(e) => setStampSize(parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                      />
                    </div>
                    {/* 透過率スライダー */}
                    <div className="flex items-center gap-2 text-xs flex-1 min-w-[140px]">
                      <span className="font-bold text-slate-550 whitespace-nowrap text-[10px]">不透明度: {Math.round(stampOpacity * 100)}%</span>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        step="5"
                        value={Math.round(stampOpacity * 100)}
                        onChange={(e) => {
                          const nextOpacity = parseInt(e.target.value, 10) / 100;
                          setStampOpacity(nextOpacity);
                          if (onStampChange) {
                            onStampChange(stampOffset, nextOpacity);
                          }
                        }}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 領収書スクロールラッパー (モバイル用) */}
            <div className="w-full overflow-x-auto pb-2 print:overflow-visible print:pb-0">
              {/* 領収書本体エリア (固定幅580pxでPC/スマホ間の表示崩れを防ぐ) */}
              <div className="w-[580px] mx-auto border-4 double border-double border-gray-400 p-8 space-y-8 bg-white print:border-gray-500 print:w-full print:mx-0 print:p-0">
              {/* タイトル */}
              <div className="text-center">
                <h1 className="text-3xl font-extrabold tracking-widest text-gray-900 border-b-2 border-gray-900 pb-2 inline-block px-10 print:text-black">
                  領 収 書
                </h1>
                <p className="text-[10px] text-gray-400 mt-2 text-right">No. ________</p>
                <p className="text-xs text-gray-600 mt-1 text-right">日付: {dateString}</p>
              </div>

              {/* 宛名 */}
              <div>
                <p className="text-lg font-black border-b border-gray-800 pb-1.5 inline-block min-w-[200px] text-gray-900 print:text-black">
                  {payerName} 様
                </p>
              </div>

              {/* 金額表示 */}
              <div className="bg-slate-50 border border-slate-350 p-4 rounded-xl text-center print:bg-white print:border-gray-400">
                <span className="text-[10px] text-slate-500 font-extrabold block mb-1">金額</span>
                <strong className="text-3xl font-black text-slate-900 font-mono tracking-tight print:text-black">
                  ¥ {amount.toLocaleString()}-
                </strong>
              </div>

              {/* 但し書き */}
              <div className="border-b border-gray-200 pb-4 text-xs font-semibold text-gray-700 space-y-1.5">
                <p>
                  但し、イベント「<span className="font-extrabold text-gray-900">{projectName}</span>」の立替精算分として、正に領収いたしました。
                </p>
              </div>

              {/* 発行元署名欄 */}
              <div className="flex flex-row justify-between items-end gap-6 text-xs text-gray-750">
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">内訳</p>
                  <table className="text-[10px] text-gray-500 border border-collapse border-gray-300">
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-2 py-0.5 font-bold">税抜金額</td>
                        <td className="border border-gray-300 px-3 py-0.5 text-right font-mono">¥{amount.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-2 py-0.5 font-bold">消費税等(10%)</td>
                        <td className="border border-gray-300 px-3 py-0.5 text-right font-mono">¥0</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* あなた（発行元）の情報 */}
                <div className="text-right space-y-1 relative pr-4">
                  {stampImage && (
                    <div 
                      className={`absolute right-0 bottom-1 select-none z-10 touch-none ${
                        isDragging ? 'cursor-grabbing' : 'cursor-grab'
                      }`}
                      style={{
                        width: `${stampSize}px`,
                        height: `${stampSize}px`,
                        opacity: stampOpacity,
                        transform: `translate(${stampOffset.x}px, ${stampOffset.y}px)`,
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleStart(e.clientX, e.clientY);
                      }}
                      onMouseMove={(e) => {
                        if (isDragging) {
                          e.preventDefault();
                          handleMove(e.clientX, e.clientY);
                        }
                      }}
                      onMouseUp={handleEnd}
                      onMouseLeave={handleEnd}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        const touch = e.touches[0];
                        handleStart(touch.clientX, touch.clientY);
                      }}
                      onTouchMove={(e) => {
                        if (isDragging) {
                          e.preventDefault();
                          const touch = e.touches[0];
                          handleMove(touch.clientX, touch.clientY);
                        }
                      }}
                      onTouchEnd={handleEnd}
                    >
                      <img src={stampImage} alt="印影" className="w-full h-full object-contain pointer-events-none" />
                    </div>
                  )}
                  <p className="text-xs text-gray-400 font-bold">発行者</p>
                  <p className="font-black text-sm text-gray-900 print:text-black">{displayName}</p>
                  
                  {issuerInfo.zip && <p className="text-[10px]">〒{issuerInfo.zip}</p>}
                  {issuerInfo.address && <p className="text-[10px]">{issuerInfo.address}</p>}
                  {issuerInfo.tel && <p className="text-[10px]">TEL: {issuerInfo.tel}</p>}
                  
                  {issuerInfo.regNo && (
                    <div className="mt-2 text-[10px] font-bold text-indigo-700 border border-indigo-150 rounded px-1.5 py-0.5 inline-block print:text-black print:border-black">
                      登録番号: {issuerInfo.regNo}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

            {/* フッター閉じるボタン（印刷時は非表示） */}
            <div className="mt-6 flex justify-end print:hidden">
              <button
                type={closeButtonType || "button"}
                onClick={() => setIsOpen(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-xl text-xs transition cursor-pointer shadow-sm active:scale-95"
              >
                {closeButtonText || "閉じる"}
              </button>
            </div>

            {cropperSrc && (
              <ImageCropper
                imageSrc={cropperSrc}
                onCropComplete={(croppedBase64) => {
                  setStampImage(croppedBase64);
                  setCropperSrc(null);
                }}
                onCancel={() => setCropperSrc(null)}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
