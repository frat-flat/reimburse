'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calculator, X, Copy, Check } from 'lucide-react';

export default function FloatingCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const calculatorRef = useRef<HTMLDivElement>(null);

  // コピー処理
  const handleCopy = () => {
    navigator.clipboard.writeText(display);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 電卓ロジック
  const handleInput = (val: string) => {
    if (val === 'C' || val === 'AC') {
      setDisplay('0');
      setEquation('');
      return;
    }

    if (val === 'BS') {
      if (display.length > 1) {
        setDisplay(display.slice(0, -1));
      } else {
        setDisplay('0');
      }
      return;
    }

    if (val === '=') {
      try {
        const safeEquation = equation + display;
        if (!safeEquation) return;
        
        // 安全に数式を評価するために、数字、小数点、演算子、丸括弧のみを許可する
        if (/^[0-9+\-*/.() ]+$/.test(safeEquation)) {
          // evalの代替として Function を使用
          const result = new Function(`return ${safeEquation}`)();
          if (result === Infinity || result === -Infinity || isNaN(result)) {
            setDisplay('Error');
          } else {
            // 小数点第2位までに丸め、不要な末尾の0は削除
            setDisplay(Number(result.toFixed(2)).toString());
          }
          setEquation('');
        }
      } catch (err) {
        setDisplay('Error');
      }
      return;
    }

    if (['+', '-', '*', '/'].includes(val)) {
      setEquation((prev) => prev + display + val);
      setDisplay('0');
      return;
    }

    // 数字と小数点
    if (display === '0' || display === 'Error') {
      if (val === '.') {
        setDisplay('0.');
      } else {
        setDisplay(val);
      }
    } else {
      if (val === '.' && display.includes('.')) {
        return; // 小数点の二重入力防止
      }
      setDisplay((prev) => prev + val);
    }
  };

  // キーボード入力を監視
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const key = e.key;
      if (/[0-9.]/.test(key)) {
        handleInput(key);
      } else if (['+', '-', '*', '/'].includes(key)) {
        handleInput(key);
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        handleInput('=');
      } else if (key === 'Escape') {
        setIsOpen(false);
      } else if (key === 'Backspace') {
        handleInput('BS');
      } else if (key === 'c' || key === 'C') {
        handleInput('C');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, display, equation]);

  // モーダル外クリックで閉じる処理
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && calculatorRef.current && !calculatorRef.current.contains(e.target as Node)) {
        const button = document.getElementById('floating-calc-btn');
        if (button && button.contains(e.target as Node)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      {/* フローティング起動ボタン */}
      <button
        id="floating-calc-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 z-50 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        title="電卓を開く"
      >
        <Calculator className="h-6 w-6" />
      </button>

      {/* 電卓本体 */}
      {isOpen && (
        <div
          ref={calculatorRef}
          className="fixed bottom-20 right-5 z-50 w-72 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-5 text-white"
        >
          {/* ヘッダー */}
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-400">フローティング電卓</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition rounded p-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ディスプレイ */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 mb-4 text-right overflow-hidden relative group">
            <div className="text-[10px] text-indigo-400 font-mono h-4 min-h-[16px] truncate">
              {equation}
            </div>
            <div className="text-2xl font-mono font-bold tracking-tight truncate select-all">
              {display}
            </div>
            {/* コピーボタン */}
            <button
              onClick={handleCopy}
              className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 hover:bg-indigo-600 text-white text-[10px] py-1 px-1.5 rounded flex items-center gap-1 shadow"
              title="結果をコピー"
            >
              {isCopied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">コピー済</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>コピー</span>
                </>
              )}
            </button>
          </div>

          {/* キーパッド */}
          <div className="grid grid-cols-4 gap-2 text-sm font-semibold font-mono">
            {/* 1行目 */}
            <button
              onClick={() => handleInput('AC')}
              className="py-2.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-400 transition active:scale-95 focus:outline-none"
            >
              AC
            </button>
            <button
              onClick={() => handleInput('BS')}
              className="py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95 focus:outline-none"
            >
              BS
            </button>
            <button
              onClick={() => handleInput('/')}
              className="py-2.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-indigo-400 hover:text-white transition active:scale-95 focus:outline-none"
            >
              /
            </button>
            <button
              onClick={() => handleInput('*')}
              className="py-2.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-indigo-400 hover:text-white transition active:scale-95 focus:outline-none"
            >
              *
            </button>

            {/* 2行目 */}
            <button
              onClick={() => handleInput('7')}
              className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none"
            >
              7
            </button>
            <button
              onClick={() => handleInput('8')}
              className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none"
            >
              8
            </button>
            <button
              onClick={() => handleInput('9')}
              className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none"
            >
              9
            </button>
            <button
              onClick={() => handleInput('-')}
              className="py-2.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-indigo-400 hover:text-white transition active:scale-95 focus:outline-none"
            >
              -
            </button>

            {/* 3行目 */}
            <button
              onClick={() => handleInput('4')}
              className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none"
            >
              4
            </button>
            <button
              onClick={() => handleInput('5')}
              className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none"
            >
              5
            </button>
            <button
              onClick={() => handleInput('6')}
              className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none"
            >
              6
            </button>
            <button
              onClick={() => handleInput('+')}
              className="py-2.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-indigo-400 hover:text-white transition active:scale-95 focus:outline-none"
            >
              +
            </button>

            {/* 4行目 */}
            <div className="col-span-3 grid grid-cols-3 gap-2">
              <button
                onClick={() => handleInput('1')}
                className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none"
              >
                1
              </button>
              <button
                onClick={() => handleInput('2')}
                className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none"
              >
                2
              </button>
              <button
                onClick={() => handleInput('3')}
                className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none"
              >
                3
              </button>

              {/* 5行目 */}
              <button
                onClick={() => handleInput('0')}
                className="col-span-2 py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none"
              >
                0
              </button>
              <button
                onClick={() => handleInput('.')}
                className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none"
              >
                .
              </button>
            </div>

            {/* イコール (縦に連結) */}
            <button
              onClick={() => handleInput('=')}
              className="py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition active:scale-95 flex items-center justify-center row-span-2 h-full focus:outline-none"
            >
              =
            </button>
          </div>
        </div>
      )}
    </>
  );
}
