'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Sparkles,
  Users,
  Receipt,
  CheckCircle2,
  Share2,
  AlertCircle,
  ExternalLink,
  X,
  Megaphone,
} from 'lucide-react';
import {
  actionGetNotifications,
  actionMarkNotificationAsRead,
  actionMarkAllNotificationsAsRead,
} from '@/lib/notifications';

interface NotificationItem {
  id: string;
  userId: string;
  senderId?: string | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string | Date;
  sender?: {
    id: string;
    name: string;
    email?: string | null;
  } | null;
}

interface NotificationDropdownProps {
  initialUnreadCount?: number;
  className?: string;
  buttonClassName?: string;
}

export default function NotificationDropdown({
  initialUnreadCount = 0,
  className = '',
  buttonClassName = '',
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 通知データの取得
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await actionGetNotifications();
      setNotifications(res.notifications as any);
      setUnreadCount(res.unreadCount);
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // 初回マウント時にも件数を同期
  useEffect(() => {
    fetchNotifications();
  }, []);

  // 開いたときに最新化
  const handleToggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      fetchNotifications();
    }
  };

  // 外側クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 個別タップ
  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await actionMarkNotificationAsRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setIsOpen(false);
    if (item.link) {
      router.push(item.link);
    }
  };

  // 一括既読
  const handleMarkAllRead = async () => {
    await actionMarkAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  // 日時フォーマット
  const formatDate = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  // タイプごとのアイコンとバッジ色
  const getTypeBadge = (type: string, senderName?: string) => {
    switch (type) {
      case 'SYSTEM':
      case 'RECEIPT_REISSUE_REQUEST':
        return {
          icon: Megaphone,
          label: '運営',
          badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
          iconBg: 'bg-purple-50 text-purple-600',
        };
      case 'MATE_REQUEST':
      case 'MATE_ACCEPTED':
        return {
          icon: Users,
          label: 'Mate',
          badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          iconBg: 'bg-emerald-50 text-emerald-600',
        };
      case 'SETTLEMENT_PAID':
        return {
          icon: CheckCircle2,
          label: '受取完了',
          badgeClass: 'bg-teal-100 text-teal-700 border-teal-200',
          iconBg: 'bg-teal-50 text-teal-600',
        };
      case 'RECEIPT_ISSUED':
        return {
          icon: Receipt,
          label: '領収書',
          badgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200',
          iconBg: 'bg-indigo-50 text-indigo-600',
        };
      case 'PROJECT_SHARE':
        return {
          icon: Share2,
          label: 'イベント共有',
          badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
          iconBg: 'bg-amber-50 text-amber-600',
        };
      default:
        return {
          icon: Sparkles,
          label: '通知',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
          iconBg: 'bg-slate-50 text-slate-600',
        };
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* ベルアイコンボタン */}
      <button
        onClick={handleToggle}
        aria-label="通知一覧を開く"
        className={
          buttonClassName ||
          'p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition relative flex items-center justify-center cursor-pointer active:scale-95'
        }
      >
        <Bell className="h-5 w-5" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex items-center justify-center rounded-full h-4 min-w-[16px] bg-red-500 text-[9px] font-black text-white px-1 leading-none shadow-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* ドロップダウンポップオーバー */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[400px] max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden flex flex-col animate-scale-in">
          {/* ヘッダー */}
          <div className="p-3.5 px-4 bg-slate-50/80 border-b border-slate-150 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600">
                <Bell className="h-4 w-4" />
              </div>
              <h3 className="font-black text-sm text-slate-900">お知らせ・通知</h3>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full leading-none shadow-2xs">
                  {unreadCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold px-2 py-1 rounded-lg hover:bg-indigo-50 transition inline-flex items-center gap-1 cursor-pointer"
                  title="すべて既読にする"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>すべて既読</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 通知リストエリア */}
          <div className="max-h-[380px] sm:max-h-[440px] overflow-y-auto divide-y divide-slate-100">
            {isLoading && notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                <p className="text-xs font-semibold">読み込み中...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-6 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <Bell className="h-6 w-6 stroke-[1.5]" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700">新しい通知はありません</p>
                  <p className="text-xs text-slate-400">
                    Mate申請や領収書の発行・受取確認、運営からのお知らせがここに届きます。
                  </p>
                </div>
              </div>
            ) : (
              notifications.map((item) => {
                const badge = getTypeBadge(item.type, item.sender?.name);
                const Icon = badge.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3.5 sm:p-4 transition cursor-pointer flex items-start gap-3 relative ${
                      !item.isRead
                        ? 'bg-indigo-50/40 hover:bg-indigo-50/70'
                        : 'bg-white hover:bg-slate-50/80'
                    }`}
                  >
                    {/* 未読マーク */}
                    {!item.isRead && (
                      <span className="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    )}

                    {/* アイコン */}
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs ${badge.iconBg}`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>

                    {/* コンテンツ */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.2 rounded-md border ${badge.badgeClass}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold flex-shrink-0">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>

                      <h4
                        className={`text-xs leading-snug truncate ${
                          !item.isRead ? 'font-black text-slate-900' : 'font-bold text-slate-700'
                        }`}
                      >
                        {item.title}
                      </h4>

                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>

                      {item.sender && (
                        <p className="text-[10px] text-slate-400 font-bold pt-0.5">
                          送信者: {item.sender.name}
                        </p>
                      )}
                    </div>

                    {item.link && (
                      <ExternalLink className="h-3.5 w-3.5 text-slate-300 flex-shrink-0 self-center" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
