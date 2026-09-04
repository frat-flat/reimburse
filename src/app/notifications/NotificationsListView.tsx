'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Megaphone,
  Users,
  CheckCircle2,
  Receipt,
  Share2,
  Sparkles,
  ExternalLink,
  X,
  ArrowRight,
} from 'lucide-react';
import {
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

interface NotificationsListViewProps {
  initialNotifications: NotificationItem[];
}

export default function NotificationsListView({
  initialNotifications,
}: NotificationsListViewProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const router = useRouter();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await actionMarkNotificationAsRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
    }
    setSelectedNotification({ ...item, isRead: true });
  };

  const handleMarkAllRead = async () => {
    await actionMarkAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const formatDate = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

  const filteredList = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="space-y-4">
      {/* ツールバー（フィルタ & 一括既読） */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filter === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            すべて ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              filter === 'unread'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>未読</span>
            {unreadCount > 0 && (
              <span
                className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  filter === 'unread' ? 'bg-white text-indigo-600' : 'bg-red-500 text-white'
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-extrabold px-3 py-1.5 rounded-xl hover:bg-indigo-50 border border-indigo-200 transition inline-flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <CheckCheck className="h-4 w-4" />
            <span>すべて既読にする</span>
          </button>
        )}
      </div>

      {/* 通知カード一覧 */}
      {filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-2xs">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Bell className="h-7 w-7 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-700">通知はありません</h3>
            <p className="text-xs text-slate-400">
              {filter === 'unread'
                ? '未読の通知はありません。'
                : 'Mate申請や領収書の発行・受取確認、運営からのお知らせがここに届きます。'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredList.map((item) => {
            const badge = getTypeBadge(item.type);
            const Icon = badge.icon;

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`bg-white rounded-2xl border transition p-4 sm:p-5 flex items-start gap-3.5 cursor-pointer shadow-2xs hover:shadow-xs relative group ${
                  !item.isRead
                    ? 'border-indigo-300 bg-indigo-50/25 hover:border-indigo-400'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {!item.isRead && (
                  <span className="absolute left-2.5 top-6 w-2 h-2 rounded-full bg-indigo-600" />
                )}

                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs ${badge.iconBg}`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border ${badge.badgeClass}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>

                  <h3
                    className={`text-sm sm:text-base leading-snug ${
                      !item.isRead ? 'font-black text-slate-900' : 'font-extrabold text-slate-800'
                    }`}
                  >
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed">
                    {item.message}
                  </p>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100/80">
                    <span className="text-xs text-indigo-600 font-black group-hover:underline inline-flex items-center gap-1">
                      <span>全文を読む</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                    {item.sender && (
                      <span className="text-xs text-slate-400 font-bold">
                        送信者: {item.sender.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 詳細モーダル */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto animate-scale-in">
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

            {selectedNotification.sender && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center gap-2 text-slate-700">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="font-bold">送信者: {selectedNotification.sender.name}</span>
                {selectedNotification.sender.email && (
                  <span className="text-slate-400">({selectedNotification.sender.email})</span>
                )}
              </div>
            )}

            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
              {selectedNotification.message}
            </div>

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
    </div>
  );
}
