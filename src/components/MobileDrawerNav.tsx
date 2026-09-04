'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { actionLogout } from '@/lib/actions';
import {
  Menu,
  X,
  Calendar,
  Users,
  Receipt,
  UserCheck,
  CircleUser,
  LogOut,
  ChevronRight,
} from 'lucide-react';

interface MobileDrawerNavProps {
  currentUser: {
    name: string;
    email?: string | null;
  };
  mateNotificationCount: number;
  unreadNotificationCount?: number;
}

export default function MobileDrawerNav({
  currentUser,
  mateNotificationCount,
  unreadNotificationCount = 0,
}: MobileDrawerNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // ページ遷移時に自動でドロワーを閉じる
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // ドロワーが開いているときは背景スクロールを抑止
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const navItems = [
    {
      href: '/dashboard',
      label: 'イベント一覧',
      desc: '参加・作成したイベントの確認と作成',
      icon: Calendar,
      badge: 0,
    },
    {
      href: '/friends',
      label: 'Mate管理',
      desc: 'Mate（フレンド）の追加・一覧・承認',
      icon: Users,
      badge: mateNotificationCount,
    },
    {
      href: '/receipts',
      label: '領収一覧',
      desc: '発行・受取領収書の確認・印刷',
      icon: Receipt,
      badge: 0,
    },
    {
      href: '/members',
      label: 'ベースクルー登録',
      desc: 'よく精算する固定メンバーの管理',
      icon: UserCheck,
      badge: 0,
    },
    {
      href: '/profile',
      label: 'マイページ',
      desc: '印鑑（印影）・銀行口座・プロフィール設定',
      icon: CircleUser,
      badge: 0,
    },
  ];

  return (
    <div className="md:hidden">
      {/* ハンバーガーメニューボタン */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="メニューを開く"
        className="p-2 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition relative flex items-center justify-center cursor-pointer"
      >
        <Menu className="h-6 w-6" strokeWidth={2} />
        {mateNotificationCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
        )}
      </button>

      {/* ドロワーメニュー（オーバーレイ） */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* 半透明バックドロップ */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 animate-fade"
          />

          {/* ドロワー本体パネル */}
          <div className="relative w-[300px] sm:w-[340px] max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 transition-transform duration-300 ease-out">
            {/* パネルヘッダー */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="TaTekæTa Logo"
                  className="w-6 h-6 rounded-md object-contain"
                />
                <span className="text-base font-black tracking-tight text-indigo-950">
                  メニュー
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="メニューを閉じる"
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            {/* ログインユーザー情報カード */}
            <div className="p-4 bg-indigo-50/50 border-b border-indigo-100/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                {currentUser.name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-indigo-600 font-bold">ログイン中</p>
                <p className="text-sm font-extrabold text-slate-900 truncate">
                  {currentUser.name}
                </p>
                {currentUser.email && (
                  <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                )}
              </div>
            </div>

            {/* ナビゲーションリンク一覧 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm font-bold'
                        : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{item.label}</span>
                        {item.badge > 0 && (
                          <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black leading-none shadow-xs">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isActive ? 'text-indigo-100' : 'text-slate-400'
                        }`}
                      >
                        {item.desc}
                      </p>
                    </div>

                    <ChevronRight
                      className={`h-4 w-4 flex-shrink-0 ${
                        isActive ? 'text-white/70' : 'text-slate-300'
                      }`}
                    />
                  </Link>
                );
              })}
            </div>

            {/* パネルフッター（ログアウト） */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <form action={actionLogout}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer active:scale-98"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.8} />
                  <span>ログアウト</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
