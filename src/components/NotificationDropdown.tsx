'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  Sparkles,
  Users,
  Receipt,
  CheckCircle2,
  Share2,
  ExternalLink,
  X,
  Megaphone,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  actionGetNotifications,
  actionMarkNotificationAsRead,
  actionMarkAllNotificationsAsRead,
} from '@/lib/notifications';

export interface NotificationItem {
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
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
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

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleToggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      fetchNotifications();
    }
  };

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

  // 通知アイテムタップ ➔ 詳細モーダルを開き、既読化
  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await actionMarkNotificationAsRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setSelectedNotification({ ...item, isRead: true });
    setIsOpen(false);
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
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // タイプごとのアイコンとバッジ色
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'SYSTEM':
      case 'RECEIPT_REISSUE_REQUEST':
        return {
          icon: Megaphone,
          label: '運営からのお知らせ',
          badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
          iconBg: 'bg-purple-50 text-purple-600',
        };
      case 'MATE_REQUEST':
      case 'MATE_ACCEPTED':
        return {
          icon: Users,
          label: 'Mate通知',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          iconBg: 'bg-emerald-50 text-emerald-600',
        };
      case 'SETTLEMENT_PAID':
        return {
          icon: CheckCircle2,
          label: '精算受取完了',
          badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
          iconBg: 'bg-teal-50 text-teal-600',
        };
      case 'RECEIPT_ISSUED':
        return {
          icon: Receipt,
          label: '領収書発行',
          badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          iconBg: 'bg-indigo-50 text-indigo-600',
        };
      case 'PROJECT_SHARE':
        return {
          icon: Share2,
          label: 'イベント共有',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          iconBg: 'bg-amber-50 text-amber-600',
        };
      default:
        return {
          icon: Sparkles,
          label: 'お知らせ',
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
          iconBg: 'bg-slate-50 text-slate-600',
        };
    }
  };

  const getLinkButtonText = (type: string) => {
    switch (type) {
      case 'RECEIPT_REISSUE_REQUEST':
      case 'SETTLEMENT_PAID':
        return '精算画面を開く';
      case 'RECEIPT_ISSUED':
        return '領収書一覧を開く';
      case 'MATE_REQUEST':
      case 'MATE_ACCEPTED':
        return 'Mate管理画面を開く';
      case 'PROJECT_SHARE':
        return 'イベント詳細を開く';
      default:
        return '該当ページへ移動';
    }
  };

  return (
    <>
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
          <div className="absolute right-0 mt-2 w-[340px] sm:w-[420px] max-w-[94vw] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden flex flex-col animate-scale-in">
            {/* ヘッダー */}
            <div className="p-3.5 px-4 bg-slate-50/80 border-b border-slate-150 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 leading-none">お知らせ・通知</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">タップで全文を読めます</p>
                </div>
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
            <div className="max-h-[380px] sm:max-h-[460px] overflow-y-auto divide-y divide-slate-100">
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
                  const badge = getTypeBadge(item.type);
                  const Icon = badge.icon;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`p-3.5 sm:p-4 transition cursor-pointer flex items-start gap-3 relative group ${
                        !item.isRead
                          ? 'bg-indigo-50/40 hover:bg-indigo-50/80'
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
                          className={`text-xs leading-snug line-clamp-2 ${
                            !item.isRead ? 'font-black text-slate-900' : 'font-bold text-slate-700'
                          }`}
                        >
                          {item.title}
                        </h4>

                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-indigo-600 font-bold group-hover:underline inline-flex items-center gap-0.5">
                            本文をすべて読む
                            <ArrowRight className="h-3 w-3" />
                          </span>
                          {item.sender && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              From: {item.sender.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* フッター */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 transition inline-flex items-center gap-1"
              >
                <span>すべての通知を一覧で見る</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 通知詳細モーダル (タップ時に全文をしっかり読める) */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto animate-scale-in">
            {/* モーダルヘッダー */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-150 pb-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const badge = getTypeBadge(selectedNotification.type);
                    const Icon = badge.icon;
                    return (
                      <span
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg border inline-flex items-center gap-1 ${badge.badgeClass}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{badge.label}</span>
                      </span>
                    );
                  })()}
                  <span className="text-xs text-slate-400 font-semibold">
                    {formatDate(selectedNotification.createdAt)}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {selectedNotification.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 送信者情報 */}
            {selectedNotification.sender && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center gap-2 text-slate-700">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="font-bold">送信者: {selectedNotification.sender.name}</span>
                {selectedNotification.sender.email && (
                  <span className="text-slate-400">({selectedNotification.sender.email})</span>
                )}
              </div>
            )}

            {/* 本文全文表示エリア */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
              {selectedNotification.message}
            </div>

            {/* フッターアクションボタン */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl text-xs transition cursor-pointer text-center"
              >
                閉じる
              </button>

              {selectedNotification.link && (
                <button
                  type="button"
                  onClick={() => {
                    const link = selectedNotification.link!;
                    setSelectedNotification(null);
                    router.push(link);
                  }}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 px-5 rounded-xl text-xs transition shadow-sm inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>{getLinkButtonText(selectedNotification.type)}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
