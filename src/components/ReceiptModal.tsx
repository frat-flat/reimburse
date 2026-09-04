'use client';

import React, { useState, useRef } from 'react';
import { X, Printer, Receipt, Edit3, Settings2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
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
  showPrintButton?: boolean;
  readOnly?: boolean;
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
  showPrintButton = true,
  readOnly = false,
}: ReceiptModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 編集可能な領収書項目ステート
  const [customPayerName, setCustomPayerName] = useState(payerName);
  const [customAmount, setCustomAmount] = useState<number>(amount);
  const [customDate, setCustomDate] = useState(dateString);
  const [customProviso, setCustomProviso] = useState(
    `但し、イベント「${projectName}」の参加費として、正に領収いたしました。`
  );
  const [taxRate, setTaxRate] = useState<10 | 8 | 0>(10);
  const [showEditAccordion, setShowEditAccordion] = useState(false);

  // 印影ステート
  const [stampImage, setStampImage] = useState(issuerInfo.stampImage || '');
  const [stampSize, setStampSize] = useState(issuerInfo.stampSize || 60);
  const [stampOpacity, setStampOpacity] = useState(issuerInfo.stampOpacity ?? 0.85);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);

  // 印鑑ドラッグ用
  const [stampOffset, setStampOffset] = useState({
    x: issuerInfo.stampOffsetX || 0,
    y: issuerInfo.stampOffsetY || 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleStart = (clientX: number, clientY: number) => {
    if (readOnly) return;
    setIsDragging(true);
    dragStart.current = {
      x: clientX - stampOffset.x,
      y: clientY - stampOffset.y,
    };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (readOnly || !isDragging) return;
    setStampOffset({
      x: clientX - dragStart.current.x,
      y: clientY - dragStart.current.y,
    });
  };

  const handleEnd = () => {
    if (readOnly) return;
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

  // 初期値にリセット
  const handleResetDefaults = () => {
    setCustomPayerName(payerName);
    setCustomAmount(amount);
    setCustomDate(dateString);
    setCustomProviso(`但し、イベント「${projectName}」の参加費として、正に領収いたしました。`);
    setTaxRate(10);
  };

  // 税金計算
  let taxExcluded = customAmount;
  let taxAmount = 0;
  let taxLabel = '消費税額等 (10%)';
  let taxExcludedLabel = '税抜金額 (10%対象)';

  if (taxRate === 10) {
    taxExcluded = Math.round(customAmount / 1.1);
    taxAmount = customAmount - taxExcluded;
    taxLabel = '消費税額等 (10%)';
    taxExcludedLabel = '税抜金額 (10%対象)';
  } else if (taxRate === 8) {
    taxExcluded = Math.round(customAmount / 1.08);
    taxAmount = customAmount - taxExcluded;
    taxLabel = '消費税額等 (8%)';
    taxExcludedLabel = '税抜金額 (8%軽減税率対象)';
  } else {
    taxExcluded = customAmount;
    taxAmount = 0;
    taxLabel = '消費税額等 (非課税)';
    taxExcludedLabel = '金額 (非課税対象)';
  }

  const displayName = issuerInfo.name || receiverName;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={
          triggerButtonClassName ||
          'inline-flex items-center gap-1 bg-white hover:bg-indigo-50 text-indigo-700 font-extrabold px-2.5 py-1.5 rounded-lg text-[10px] border border-indigo-200 transition shadow-sm cursor-pointer active:scale-95'
        }
      >
        <Receipt className="h-3.5 w-3.5" />
        <span>{triggerButtonText || '領収書を発行'}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:absolute print:inset-0">
          {/* モーダルカード */}
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative border border-gray-150 flex flex-col print:shadow-none print:border-none print:p-0 print:rounded-none max-h-[92vh] overflow-y-auto">
            {/* 閉じる・印刷ヘッダー（印刷時は非表示） */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4 print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="h-5.5 w-5.5 text-indigo-600" />
                <h3 className="text-sm font-bold text-gray-800">
                  {readOnly ? '領収書プレビュー' : '領収書の発行・編集'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {showPrintButton && (
                  <button
                    onClick={handlePrint}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>印刷・PDF出力</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-650 p-1.5 rounded-md hover:bg-gray-100 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 編集パネル（発行時・!readOnly時のみ表示、印刷時は非表示） */}
            {!readOnly && (
              <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 mb-5 text-xs space-y-3.5 print:hidden">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowEditAccordion(!showEditAccordion)}
                    className="font-extrabold text-indigo-900 flex items-center gap-1.5 hover:text-indigo-600 transition cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4 text-indigo-600" />
                    <span>領収書の内容を編集（宛名・金額・日付・但し書き・消費税）</span>
                    {showEditAccordion ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="text-[11px] text-slate-500 hover:text-indigo-600 font-bold flex items-center gap-1 cursor-pointer transition"
                    title="初期値に戻す"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>初期値に戻す</span>
                  </button>
                </div>

                {/* 編集フォーム（展開時） */}
                {showEditAccordion && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80 animate-fade">
                    {/* 宛名 */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">
                        宛名（様）:
                      </label>
                      <input
                        type="text"
                        value={customPayerName}
                        onChange={(e) => setCustomPayerName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="例: 山田太郎 様 / 株式会社〇〇 様"
                      />
                    </div>

                    {/* 金額 */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">
                        金額（円・税込）:
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-black text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* 日付 */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">
                        発行日付:
                      </label>
                      <input
                        type="text"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="例: 2026/09/04"
                      />
                    </div>

                    {/* 消費税率の選択 */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">
                        消費税率:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTaxRate(10)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition border cursor-pointer ${
                            taxRate === 10
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          10% (標準)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaxRate(8)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition border cursor-pointer ${
                            taxRate === 8
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          8% (軽減)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaxRate(0)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition border cursor-pointer ${
                            taxRate === 0
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          非課税
                        </button>
                      </div>
                    </div>

                    {/* 但し書き（全幅） */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">
                        但し書き:
                      </label>
                      <textarea
                        rows={2}
                        value={customProviso}
                        onChange={(e) => setCustomProviso(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed resize-none"
                        placeholder="例: 但し、イベント「〇〇」の参加費として、正に領収いたしました。"
                      />
                    </div>
                  </div>
                )}

                {/* 印影追加コントロール */}
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-750 text-[11px]">印影 (ハンコ) を配置する:</span>
                    {stampImage && (
                      <button
                        onClick={() => setStampImage('')}
                        className="text-[10px] text-rose-600 font-bold hover:text-rose-700 cursor-pointer"
                      >
                        配置を解除
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex gap-2">
                      <label className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-750 font-bold py-1.5 px-3 rounded-lg cursor-pointer transition text-xs">
                        <span>📷 カメラで撮影</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleLocalStampSelect}
                          className="hidden"
                        />
                      </label>
                      <label className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-755 font-bold py-1.5 px-3 rounded-lg cursor-pointer transition text-xs">
                        <span>📁 ファイル選択</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLocalStampSelect}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {stampImage && (
                      <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-[280px]">
                        <div className="flex items-center gap-2 text-xs flex-1 min-w-[130px]">
                          <span className="font-bold text-slate-550 whitespace-nowrap text-[10px]">
                            サイズ: {stampSize}px
                          </span>
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
                        <div className="flex items-center gap-2 text-xs flex-1 min-w-[130px]">
                          <span className="font-bold text-slate-550 whitespace-nowrap text-[10px]">
                            不透明度: {Math.round(stampOpacity * 100)}%
                          </span>
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
              </div>
            )}

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
                  <p className="text-xs text-gray-600 mt-1 text-right">日付: {customDate}</p>
                </div>

                {/* 宛名 */}
                <div>
                  <p className="text-lg font-black border-b border-gray-800 pb-1.5 inline-block min-w-[200px] text-gray-900 print:text-black">
                    {customPayerName} 様
                  </p>
                </div>

                {/* 金額表示 */}
                <div className="bg-slate-50 border border-slate-350 p-4 rounded-xl text-center print:bg-white print:border-gray-400">
                  <span className="text-[10px] text-slate-500 font-extrabold block mb-1">金額</span>
                  <strong className="text-3xl font-black text-slate-900 font-mono tracking-tight print:text-black">
                    ¥ {customAmount.toLocaleString()}-
                  </strong>
                </div>

                {/* 但し書き */}
                <div className="border-b border-gray-200 pb-4 text-xs font-semibold text-gray-700 space-y-1.5 leading-relaxed">
                  <p>{customProviso}</p>
                </div>

                {/* 発行元署名欄 */}
                <div className="flex flex-row justify-between items-end gap-6 text-xs text-gray-750">
                  {/* 内訳テーブル */}
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      内訳 ({taxRate === 0 ? '非課税' : `${taxRate}%対象`})
                    </p>
                    <table className="text-[10px] text-gray-500 border border-collapse border-gray-300">
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-2 py-0.5 font-bold">{taxExcludedLabel}</td>
                          <td className="border border-gray-300 px-3 py-0.5 text-right font-mono">
                            ¥{taxExcluded.toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-2 py-0.5 font-bold">{taxLabel}</td>
                          <td className="border border-gray-300 px-3 py-0.5 text-right font-mono">
                            ¥{taxAmount.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 発行元の情報 */}
                  <div className="text-right space-y-1 relative pr-4">
                    {stampImage && (
                      <div
                        className={`absolute right-0 bottom-1 select-none z-10 ${
                          readOnly
                            ? 'pointer-events-none cursor-default'
                            : `touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`
                        }`}
                        style={{
                          width: `${stampSize}px`,
                          height: `${stampSize}px`,
                          opacity: stampOpacity,
                          transform: `translate(${stampOffset.x}px, ${stampOffset.y}px)`,
                        }}
                        onMouseDown={
                          readOnly
                            ? undefined
                            : (e) => {
                                e.preventDefault();
                                handleStart(e.clientX, e.clientY);
                              }
                        }
                        onMouseMove={
                          readOnly
                            ? undefined
                            : (e) => {
                                if (isDragging) {
                                  e.preventDefault();
                                  handleMove(e.clientX, e.clientY);
                                }
                              }
                        }
                        onMouseUp={readOnly ? undefined : handleEnd}
                        onMouseLeave={readOnly ? undefined : handleEnd}
                        onTouchStart={
                          readOnly
                            ? undefined
                            : (e) => {
                                e.preventDefault();
                                const touch = e.touches[0];
                                handleStart(touch.clientX, touch.clientY);
                              }
                        }
                        onTouchMove={
                          readOnly
                            ? undefined
                            : (e) => {
                                if (isDragging) {
                                  e.preventDefault();
                                  const touch = e.touches[0];
                                  handleMove(touch.clientX, touch.clientY);
                                }
                              }
                        }
                        onTouchEnd={readOnly ? undefined : handleEnd}
                      >
                        <img
                          src={stampImage}
                          alt="印影"
                          className="w-full h-full object-contain pointer-events-none"
                        />
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
                type={closeButtonType || 'button'}
                onClick={() => setIsOpen(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-xl text-xs transition cursor-pointer shadow-sm active:scale-95"
              >
                {closeButtonText || '閉じる'}
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
