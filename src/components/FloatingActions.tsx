'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calculator, X, Copy, Check, Pencil } from 'lucide-react';
import CreateProjectModal from './CreateProjectModal';
import { actionGetMasterMembers } from '@/lib/actions';

interface MasterMember {
  id: string;
  name: string;
}

export default function FloatingActions() {
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [masterMembers, setMasterMembers] = useState<MasterMember[]>([]);

  // 電卓用ステート
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const calculatorRef = useRef<HTMLDivElement>(null);

  // マスタメンバーの読み込み
  const loadMasterMembers = async () => {
    try {
      const members = await actionGetMasterMembers();
      setMasterMembers(members);
    } catch (e) {
      console.error('Failed to load master members:', e);
    }
  };

  useEffect(() => {
    loadMasterMembers();
  }, []);

  const handleOpenCreateModal = () => {
    loadMasterMembers();
    setIsCreateModalOpen(true);
  };

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

        if (/^[0-9+\-*/.() ]+$/.test(safeEquation)) {
          const result = new Function(`return ${safeEquation}`)();
          if (result === Infinity || result === -Infinity || isNaN(result)) {
            setDisplay('Error');
          } else {
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

    if (display === '0' || display === 'Error') {
      if (val === '.') {
        setDisplay('0.');
      } else {
        setDisplay(val);
      }
    } else {
      if (val === '.' && display.includes('.')) {
        return;
      }
      setDisplay((prev) => prev + val);
    }
  };

  // キーボード入力を監視
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isCalcOpen) return;

      const key = e.key;
      if (/[0-9.]/.test(key)) {
        handleInput(key);
      } else if (['+', '-', '*', '/'].includes(key)) {
        handleInput(key);
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        handleInput('=');
      } else if (key === 'Escape') {
        setIsCalcOpen(false);
      } else if (key === 'Backspace') {
        handleInput('BS');
      } else if (key === 'c' || key === 'C') {
        handleInput('C');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCalcOpen, display, equation]);

  // モーダル外クリックで閉じる処理
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isCalcOpen && calculatorRef.current && !calculatorRef.current.contains(e.target as Node)) {
        const button = document.getElementById('floating-calc-btn');
        if (button && button.contains(e.target as Node)) return;
        setIsCalcOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCalcOpen]);

  return (
    <>
      {/* フローティングボタングループ (電卓の上側に鉛筆ボタンを配置) */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-center gap-3 print:hidden">
        {/* 上段：新規イベント作成（鉛筆ボタン） */}
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center h-12 w-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer group relative"
          aria-label="新しいイベントを作成"
          title="新しいイベントを作成"
        >
          <Pencil className="h-5 w-5" strokeWidth={2.2} />
          {/* ツールチップ (PC表示時) */}
          <span className="hidden sm:group-hover:block absolute right-14 bg-slate-900 text-white text-xs font-bold py-1.5 px-3 rounded-xl whitespace-nowrap shadow-lg animate-fade">
            新規イベント作成
          </span>
        </button>

        {/* 下段：電卓ボタン */}
        <button
          id="floating-calc-btn"
          onClick={() => setIsCalcOpen(!isCalcOpen)}
          className="flex items-center justify-center h-12 w-12 rounded-full bg-slate-800 hover:bg-slate-900 text-white shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 cursor-pointer group relative"
          aria-label="電卓を開く"
          title="電卓を開く"
        >
          <Calculator className="h-5 w-5" strokeWidth={2} />
          {/* ツールチップ (PC表示時) */}
          <span className="hidden sm:group-hover:block absolute right-14 bg-slate-900 text-white text-xs font-bold py-1.5 px-3 rounded-xl whitespace-nowrap shadow-lg animate-fade">
            フローティング電卓
          </span>
        </button>
      </div>

      {/* 新規イベント作成モーダル */}
      <CreateProjectModal
        masterMembers={masterMembers}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* 電卓本体 */}
      {isCalcOpen && (
        <div
          ref={calculatorRef}
          className="fixed bottom-20 right-5 z-50 w-72 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-5 text-white"
        >
          {/* ヘッダー */}
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-400">フローティング電卓</span>
            <button
              onClick={() => setIsCalcOpen(false)}
              className="text-slate-400 hover:text-white transition rounded p-0.5 cursor-pointer"
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
            <button
              onClick={handleCopy}
              className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 hover:bg-indigo-600 text-white text-[10px] py-1 px-1.5 rounded flex items-center gap-1 shadow cursor-pointer"
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
            <button
              onClick={() => handleInput('AC')}
              className="py-2.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-400 transition active:scale-95 focus:outline-none cursor-pointer"
            >
              AC
            </button>
            <button
              onClick={() => handleInput('BS')}
              className="py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95 focus:outline-none cursor-pointer"
            >
              BS
            </button>
            <button
              onClick={() => handleInput('/')}
              className="py-2.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-indigo-400 hover:text-white transition active:scale-95 focus:outline-none cursor-pointer"
            >
              /
            </button>
            <button
              onClick={() => handleInput('*')}
              className="py-2.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-indigo-400 hover:text-white transition active:scale-95 focus:outline-none cursor-pointer"
            >
              *
            </button>

            <button
              onClick={() => handleInput('7')}
              className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none cursor-pointer"
            >
              7
            </button>
            <button
              onClick={() => handleInput('8')}
              className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none cursor-pointer"
            >
              8
            </button>
            <button
              onClick={() => handleInput('9')}
              className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none cursor-pointer"
            >
              9
            </button>
            <button
              onClick={() => handleInput('-')}
              className="py-2.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-indigo-400 hover:text-white transition active:scale-95 focus:outline-none cursor-pointer"
            >
              -
            </button>

            <button
              onClick={() => handleInput('4')}
              className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none cursor-pointer"
            >
              4
            </button>
            <button
              onClick={() => handleInput('5')}
              className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none cursor-pointer"
            >
              5
            </button>
            <button
              onClick={() => handleInput('6')}
              className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none cursor-pointer"
            >
              6
            </button>
            <button
              onClick={() => handleInput('+')}
              className="py-2.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-indigo-400 hover:text-white transition active:scale-95 focus:outline-none cursor-pointer"
            >
              +
            </button>

            <div className="col-span-3 grid grid-cols-3 gap-2">
              <button
                onClick={() => handleInput('1')}
                className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none cursor-pointer"
              >
                1
              </button>
              <button
                onClick={() => handleInput('2')}
                className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none cursor-pointer"
              >
                2
              </button>
              <button
                onClick={() => handleInput('3')}
                className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none cursor-pointer"
              >
                3
              </button>

              <button
                onClick={() => handleInput('0')}
                className="col-span-2 py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none cursor-pointer"
              >
                0
              </button>
              <button
                onClick={() => handleInput('.')}
                className="py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition active:scale-95 focus:outline-none cursor-pointer"
              >
                .
              </button>
            </div>

            <button
              onClick={() => handleInput('=')}
              className="py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition active:scale-95 flex items-center justify-center row-span-2 h-full focus:outline-none cursor-pointer"
            >
              =
            </button>
          </div>
        </div>
      )}
    </>
  );
}
