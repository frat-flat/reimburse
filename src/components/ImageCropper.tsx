'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBase64: string) => void;
  onCancel: () => void;
}

export default function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const [zoom, setZoom] = useState(1.0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // マウス/タッチドラッグ開始
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStart.current = { x: clientX - offset.x, y: clientY - offset.y };
  };

  // ドラッグ中
  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setOffset({
      x: clientX - dragStart.current.x,
      y: clientY - dragStart.current.y,
    });
  };

  // ドラッグ終了
  const handleEnd = () => {
    setIsDragging(false);
  };

  // 切り抜き実行
  const handleCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // トリミング枠のサイズ (160px) に対して、高解像度 (400px) で切り出し保存する
    // これにより、縮小しても拡大してもジャギーが出ない高画質を維持する
    const targetSize = 400; 
    canvas.width = targetSize;
    canvas.height = targetSize;

    // 高画質スケーリング用の設定
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // トリミング表示枠（直径160px）と画像の実サイズから切り出しパラメータを算出
    // 中央座標を基準にする
    const containerWidth = 280; // プレビューコンテナ幅
    const containerHeight = 280; // プレビューコンテナ高
    const cropSize = 160; // 表示上の切り抜き円の直径

    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    // Canvas上での描画倍率
    const renderScale = targetSize / cropSize;

    // 元画像の描画位置を逆算
    // offset.x, offset.y は中央基準からの移動量
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    // 画像のアスペクト比を維持したコンテナ内の基準サイズ
    let baseWidth = containerWidth;
    let baseHeight = containerHeight;
    const imgRatio = imgWidth / imgHeight;
    if (imgRatio > 1) {
      baseHeight = containerWidth / imgRatio;
    } else {
      baseWidth = containerHeight * imgRatio;
    }

    // 現在のズームでのサイズ
    const currentW = baseWidth * zoom;
    const currentH = baseHeight * zoom;

    // トリミングターゲット枠の左上を原点(0,0)とした、元画像の描画位置
    const drawX = (centerX - currentW / 2 + offset.x - (centerX - cropSize / 2)) * renderScale;
    const drawY = (centerY - currentH / 2 + offset.y - (centerY - cropSize / 2)) * renderScale;
    const drawW = currentW * renderScale;
    const drawH = currentH * renderScale;

    // Canvasに画像を描画
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // 白色背景の自動透過アルゴリズム
    const imgData = ctx.getImageData(0, 0, targetSize, targetSize);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // 白〜明るい背景部分 (RGBすべてが165超) を透過
      if (r > 165 && g > 165 && b > 165) {
        data[i + 3] = 0; // 不透明度0
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // PNGで出力
    const croppedUrl = canvas.toDataURL('image/png');
    onCropComplete(croppedUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
        
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-gray-150 pb-2.5">
          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <span>印影のトリミング・透過調整</span>
          </span>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-650 transition">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <p className="text-[10px] text-gray-500 font-semibold leading-relaxed">
          画像をドラッグして位置を合わせ、スライダーで拡大・縮小して、円枠内にハンコを収めてください。
        </p>

        {/* トリミング操作領域 */}
        <div 
          ref={containerRef}
          className="relative w-[280px] h-[280px] bg-slate-900 rounded-xl overflow-hidden mx-auto select-none touch-none cursor-move"
          onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
          onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            handleStart(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
          }}
          onTouchEnd={handleEnd}
        >
          {/* 画像表示 */}
          <div 
            className="absolute origin-center transition-transform duration-75"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img 
              ref={imageRef}
              src={imageSrc} 
              alt="トリミング対象" 
              className="max-w-full max-h-full object-contain pointer-events-none select-none"
              style={{
                transform: `scale(${zoom})`,
              }}
            />
          </div>

          {/* 円形トリミング表示枠 (オーバーレイ) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* 切り抜き外側を暗くマスクする */}
            <div className="absolute inset-0 bg-black/40"></div>
            {/* 中央のクリアな円形枠 */}
            <div className="relative w-[160px] h-[160px] rounded-full border-2 border-dashed border-indigo-400 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"></div>
          </div>
        </div>

        {/* ズームスライダー */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-[10px] text-gray-550 font-bold">
            <span>拡大・縮小</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <input 
            type="range" 
            min="0.5" 
            max="3.0" 
            step="0.05"
            value={zoom} 
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-650"
          />
        </div>

        {/* コントロールボタン */}
        <div className="flex gap-2.5 pt-2">
          <button 
            onClick={onCancel}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs transition"
          >
            キャンセル
          </button>
          <button 
            onClick={handleCrop}
            className="flex-1 bg-indigo-650 hover:bg-indigo-750 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Check className="h-4 w-4" />
            <span>切り抜いて適用</span>
          </button>
        </div>

      </div>
    </div>
  );
}
