'use client';

import React, { useTransition, useState } from 'react';
import { actionRunDDL } from '@/lib/actions';
import { Database, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DbMigrateButton() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleMigrate = () => {
    if (isPending) return;
    
    setStatus('idle');
    setErrorMsg('');

    startTransition(async () => {
      console.log('Starting client-triggered migration...');
      const res = await actionRunDDL();
      
      if (res && res.error) {
        console.error('Migration failed:', res.error);
        setStatus('error');
        setErrorMsg(res.error);
        alert(`データベース更新中にエラーが発生しました:\n${res.error}`);
      } else {
        console.log('Migration succeeded!');
        setStatus('success');
        alert('データベースの更新が完了しました！\n新機能（Mate・crew共有・重複警告）が利用可能になりました。ページをリフレッシュします。');
        window.location.reload();
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
      <button
        onClick={handleMigrate}
        disabled={isPending || status === 'success'}
        className={`inline-flex items-center gap-1.5 font-bold px-3 py-2 rounded-lg text-xs transition shadow-sm select-none ${
          isPending
            ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
            : status === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
            : 'bg-indigo-600 hover:bg-indigo-750 text-white cursor-pointer'
        }`}
        title="本番DBのスキーマを直接更新します"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        ) : (
          <Database className={`h-4 w-4 ${status === 'success' ? 'text-emerald-500' : 'text-white'}`} />
        )}
        <span>
          {isPending 
            ? 'データベース更新中...' 
            : status === 'success' 
            ? '更新完了' 
            : 'データベース接続・テーブル更新'}
        </span>
      </button>
      
      {status === 'error' && (
        <span className="text-[10px] text-red-650 font-semibold flex items-center gap-0.5 mt-0.5">
          <AlertCircle className="h-3 w-3" />
          更新エラーが発生しました
        </span>
      )}
    </div>
  );
}
