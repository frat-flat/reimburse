'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { calculateShares } from '@/lib/settlement';
import { actionCreateExpense, actionUpdateExpense } from '@/lib/actions';
import { ArrowLeft, Save, AlertCircle, RotateCw } from 'lucide-react';
import Link from 'next/link';

interface MemberItem {
  id: string;
  name: string;
}

interface ExpenseFormProps {
  projectId: string;
  members: MemberItem[];
  expense?: {
    id: string;
    title: string;
    amount: number;
    splitType: 'equal' | 'percentage' | 'fixed' | 'ratio' | 'fixed_equal';
    payerMemberId: string;
    expenseDate?: string;
    shares: {
      memberId: string;
      percentage?: number | null;
      ratio?: number | null;
    }[];
    sharesData?: {
      memberId: string;
      shareAmount: number;
    }[];
    attachments?: {
      id: string;
      fileName: string;
      fileType: string;
      fileData: string;
    }[];
  };
}

export default function ExpenseForm({ projectId, members, expense }: ExpenseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const getTodayString = () => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  // フォーム状態
  const [title, setTitle] = useState(expense?.title || '');
  const [expenseDate, setExpenseDate] = useState(expense?.expenseDate || getTodayString());
  const [amountStr, setAmountStr] = useState(expense?.amount?.toString() || '');
  const [payerMemberId, setPayerMemberId] = useState(expense?.payerMemberId || '');
  const [splitType, setSplitType] = useState<'equal' | 'percentage' | 'fixed' | 'ratio' | 'fixed_equal'>(
    expense?.splitType || 'equal'
  );
  const [attachments, setAttachments] = useState<{ id?: string; fileName: string; fileType: string; fileData: string }[]>(
    expense?.attachments || []
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments = [...attachments];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise<void>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          newAttachments.push({
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            fileData: result,
          });
          resolve();
        };
      });
    }

    setAttachments(newAttachments);
    e.target.value = ''; // Reset file input
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // 比率の入力値
  const [ratioValues, setRatioValues] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {};
    members.forEach((m) => {
      if (expense && expense.splitType === 'ratio') {
        const share = expense.shares.find((s) => s.memberId === m.id);
        values[m.id] = share?.percentage?.toString() || '1';
      } else {
        values[m.id] = '1';
      }
    });
    return values;
  });

  // 負担する人（選択されているメンバーID）
  const [selectedShares, setSelectedShares] = useState<Record<string, boolean>>(() => {
    if (expense) {
      const selected: Record<string, boolean> = {};
      expense.shares.forEach((s) => {
        selected[s.memberId] = true;
      });
      return selected;
    }
    // デフォルト全員チェック
    const selected: Record<string, boolean> = {};
    members.forEach((m) => {
      selected[m.id] = true;
    });
    return selected;
  });

  // 残金均等割の参加メンバー
  const [remainderParticipants, setRemainderParticipants] = useState<Record<string, boolean>>(() => {
    const participants: Record<string, boolean> = {};
    members.forEach((m) => {
      if (expense && expense.splitType === 'fixed_equal') {
        const share = expense.shares.find((s) => s.memberId === m.id);
        participants[m.id] = share?.ratio !== 0;
      } else {
        participants[m.id] = true;
      }
    });
    return participants;
  });

  // 割合指定（%）の入力値
  const [pctValues, setPctValues] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {};
    if (expense && expense.splitType === 'percentage') {
      expense.shares.forEach((s) => {
        values[s.memberId] = s.percentage?.toString() || '';
      });
    }
    return values;
  });

  // 金額指定の入力値
  const [fixedValues, setFixedValues] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {};
    return values;
  });

  // リアルタイム計算プレビューの結果
  const [calculatedShares, setCalculatedShares] = useState<
    { memberId: string; shareAmount: number; name: string; isFixedAmount?: boolean }[]
  >([]);

  // 手動で再計算・プレビュー更新をトリガーするためのカウンター
  const [calcTrigger, setCalcTrigger] = useState(0);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const amount = parseFloat(amountStr) || 0;

  // 負担者メンバーリスト
  const checkedMembers = members.filter((m) => selectedShares[m.id]);

  // 金額指定用のリアルタイム合計計算
  const totalFixed = checkedMembers.reduce((sum, m) => sum + (parseFloat(fixedValues[m.id]) || 0), 0);
  const remainingFixed = amount - totalFixed;
  const isOverLimit = totalFixed > amount;

  // リアルタイム負担額の計算エフェクト
  useEffect(() => {
    if (amount <= 0 || checkedMembers.length === 0) {
      setCalculatedShares([]);
      setValidationError(null);
      return;
    }

    try {
      const membersForSplit = checkedMembers.map((m) => ({ id: m.id }));
      
      const percentages: Record<string, number> = {};
      const fixedAmounts: Record<string, number> = {};
      const ratios: Record<string, number> = {};

      const remainderMemberIds = checkedMembers
        .filter((m) => remainderParticipants[m.id])
        .map((m) => m.id);

      if (splitType === 'percentage') {
        let pctSum = 0;
        checkedMembers.forEach((m) => {
          const val = parseFloat(pctValues[m.id]) || 0;
          percentages[m.id] = val;
          pctSum += val;
        });

        if (Math.abs(pctSum - 100) > 0.001) {
          setValidationError(`割合の合計が 100% になるようにしてください（現在: ${pctSum}%）`);
          setCalculatedShares([]);
          return;
        }
      }

      if (splitType === 'fixed') {
        let fixedSum = 0;
        checkedMembers.forEach((m) => {
          const val = parseFloat(fixedValues[m.id]) || 0;
          fixedAmounts[m.id] = val;
          fixedSum += val;
        });

        if (fixedSum !== amount) {
          setValidationError(
            `指定金額の合計が支出金額（${amount}円）と一致するようにしてください（現在: ${fixedSum}円）`
          );
          setCalculatedShares([]);
          return;
        }
      }

      if (splitType === 'ratio') {
        let ratioSum = 0;
        checkedMembers.forEach((m) => {
          const val = parseFloat(ratioValues[m.id]) || 0;
          ratios[m.id] = val;
          ratioSum += val;
        });

        if (ratioSum <= 0) {
          setValidationError(`比率の合計が 0 より大きくなるようにしてください`);
          setCalculatedShares([]);
          return;
        }
      }

      if (splitType === 'fixed_equal') {
        let fixedSum = 0;
        const specifiedCount = checkedMembers.filter((m) => {
          const val = parseFloat(fixedValues[m.id]) || 0;
          fixedAmounts[m.id] = val;
          fixedSum += val;
          return val > 0;
        }).length;

        if (fixedSum > amount) {
          setValidationError(
            `指定金額の合計（${fixedSum}円）が支出総額（${amount}円）を超えています。`
          );
          setCalculatedShares([]);
          return;
        }

        const remainingAmt = amount - fixedSum;
        if (remainingAmt > 0 && remainderMemberIds.length === 0) {
          setValidationError(
            `残金（${remainingAmt.toLocaleString()}円）があります。残り均等割に参加する人を少なくとも1人選択してください。`
          );
          setCalculatedShares([]);
          return;
        }

        if (specifiedCount === checkedMembers.length && fixedSum !== amount) {
          setValidationError(
            `全員分の金額を指定する場合は、負担合計（${fixedSum}円）が支出総額（${amount}円）と一致しなければなりません。`
          );
          setCalculatedShares([]);
          return;
        }
      }

      setValidationError(null);

      const shares = calculateShares(amount, splitType, membersForSplit, {
        percentages,
        fixedAmounts,
        ratios,
        remainderMemberIds,
      });

      setCalculatedShares(
        shares.map((s) => {
          const val = parseFloat(fixedValues[s.userId]) || 0;
          return {
            memberId: s.userId, // calculateShares は id フィールドを userId として返すため
            shareAmount: s.shareAmount,
            name: members.find((m) => m.id === s.userId)?.name || '不明',
            isFixedAmount: splitType === 'fixed_equal' ? val > 0 : undefined,
          };
        })
      );
    } catch (e) {
      console.error(e);
    }
  }, [amount, splitType, selectedShares, pctValues, fixedValues, ratioValues, remainderParticipants, calcTrigger, members, checkedMembers]);

  // 残金均等割の参加メンバー切り替え
  const handleRemainderParticipantToggle = (memberId: string) => {
    setRemainderParticipants((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  // 負担者チェック切り替え
  const handleMemberToggle = (memberId: string) => {
    setSelectedShares((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  // %値の変更
  const handlePctChange = (memberId: string, value: string) => {
    setPctValues((prev) => ({
      ...prev,
      [memberId]: value,
    }));
  };

  // 固定金額の変更
  const handleFixedChange = (memberId: string, value: string) => {
    setFixedValues((prev) => ({
      ...prev,
      [memberId]: value,
    }));
  };

  // 比率の変更
  const handleRatioChange = (memberId: string, value: string) => {
    setRatioValues((prev) => ({
      ...prev,
      [memberId]: value,
    }));
  };

  // 送信処理
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !title) {
      setErrorMsg('項目名および正しい金額を入力してください。');
      return;
    }
    if (!payerMemberId) {
      setErrorMsg('支払者を選択してください。');
      return;
    }
    if (checkedMembers.length === 0) {
      setErrorMsg('負担者を少なくとも1人選択してください。');
      return;
    }
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    const payloadShares = checkedMembers.map((m) => {
      return {
        memberId: m.id,
        percentage: splitType === 'percentage' ? parseFloat(pctValues[m.id]) || 0 : undefined,
        fixedAmount: (splitType === 'fixed' || splitType === 'fixed_equal') ? parseFloat(fixedValues[m.id]) || 0 : undefined,
        ratio: splitType === 'ratio' ? parseFloat(ratioValues[m.id]) || 0 : undefined,
        isRemainderParticipant: splitType === 'fixed_equal' ? !!remainderParticipants[m.id] : undefined,
      };
    });

    const payload = {
      title,
      amount,
      splitType,
      payerMemberId,
      expenseDate,
      shares: payloadShares,
      attachments: attachments.map(att => ({
        fileName: att.fileName,
        fileType: att.fileType,
        fileData: att.fileData,
      })),
    };

    setErrorMsg(null);
    startTransition(async () => {
      let res;
      if (expense) {
        // 編集
        res = await actionUpdateExpense(expense.id, payload);
      } else {
        // 新規作成
        res = await actionCreateExpense(projectId, payload);
      }

      if (res && res.error) {
        setErrorMsg(res.error);
      } else if (res && res.redirectUrl) {
        window.location.href = res.redirectUrl;
      }
    });
  };

  // 編集時初期データ（固定指定金額・残金割チェック）のロード
  useEffect(() => {
    if (expense && expense.sharesData) {
      // 1. 固定指定額のロード
      const values: Record<string, string> = {};
      if (expense.splitType === 'fixed') {
        expense.sharesData.forEach((s) => {
          values[s.memberId] = s.shareAmount.toString();
        });
      } else if (expense.splitType === 'fixed_equal') {
        // fixed_equal の場合は、DBの percentage カラムから元の指定金額をロードする
        expense.shares.forEach((s) => {
          const val = s.percentage;
          values[s.memberId] = val && val > 0 ? val.toString() : '';
        });
      }
      setFixedValues(values);

      // 2. 残金割チェックのロード
      if (expense.splitType === 'fixed_equal') {
        const participants: Record<string, boolean> = {};
        members.forEach((m) => {
          const share = expense.shares.find((s) => s.memberId === m.id);
          participants[m.id] = share?.ratio !== 0; // 0 (OFF) 以外は true
        });
        setRemainderParticipants(participants);
      }
    }
  }, [expense, members]);

  return (
    <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">
          {expense ? '支出を編集' : '支出を追加'}
        </h2>
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center text-xs text-gray-500 hover:text-indigo-600 transition font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-0.5" />
          戻る
        </Link>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="font-medium">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. 支出名 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            支出名 <span className="text-red-500 text-xs">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="例: ホテル代、レンタカー、昼食"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* 利用日 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            利用日 <span className="text-red-500 text-xs">*</span>
          </label>
          <input
            type="date"
            required
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* 2. 金額 & 支払者 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              金額 (円) <span className="text-red-500 text-xs">*</span>
            </label>
            <input
              type="number"
              required
              min={1}
              placeholder="0"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              支払った人 <span className="text-red-500 text-xs">*</span>
            </label>
            <select
              value={payerMemberId}
              onChange={(e) => setPayerMemberId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            >
              <option value="">-- 選択してください --</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. 負担する人（選択） */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            負担する人 (複数選択可) <span className="text-red-500 text-xs">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
            {members.map((m) => (
              <label
                key={m.id}
                className="flex items-center space-x-2 p-1.5 hover:bg-white rounded transition cursor-pointer select-none text-sm font-medium"
              >
                <input
                  type="checkbox"
                  checked={!!selectedShares[m.id]}
                  onChange={() => handleMemberToggle(m.id)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-gray-800">{m.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 4. 分割方法 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            分割方法
          </label>
          <div className="flex gap-1 border border-gray-200 p-1 rounded-lg bg-gray-50 text-[10px] sm:text-xs">
            {([
              { key: 'equal', label: '均等割' },
              { key: 'percentage', label: '割合指定' },
              { key: 'fixed', label: '金額指定' },
              { key: 'ratio', label: '比率指定' },
              { key: 'fixed_equal', label: '一部指定+残り均等' }
            ] as const).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSplitType(item.key)}
                className={`flex-1 py-1.5 text-center font-semibold rounded-md transition-all ${
                  splitType === item.key
                    ? 'bg-white shadow text-indigo-700 font-bold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 5. 分割方法に応じた追加入力 (割合・金額・比率・一部固定指定) */}
        {checkedMembers.length > 0 && splitType !== 'equal' && (
          <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {splitType === 'percentage'
                ? '負担割合の設定'
                : splitType === 'fixed'
                ? '負担金額の設定'
                : splitType === 'ratio'
                ? '負担比率の設定'
                : '一部固定・残り自動均等割の設定'}
            </h4>
            <div className="space-y-2">
              {checkedMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold text-gray-700">{m.name}</span>
                  <div className="flex items-center gap-3">
                    {splitType === 'fixed_equal' && (
                      <label className="flex items-center space-x-1 cursor-pointer select-none text-[10px] text-gray-500 font-semibold bg-white border border-gray-200 px-2 py-1 rounded shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition">
                        <input
                          type="checkbox"
                          checked={!!remainderParticipants[m.id]}
                          onChange={() => handleRemainderParticipantToggle(m.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                        />
                        <span>残金割</span>
                      </label>
                    )}

                    <div className="flex items-center gap-1.5 w-32">
                      <input
                        type="number"
                        min={0}
                        step={splitType === 'percentage' ? 0.1 : 1}
                        required={splitType !== 'fixed_equal'}
                        placeholder={splitType === 'fixed_equal' ? '残り均等' : '0'}
                        value={
                          splitType === 'percentage'
                            ? pctValues[m.id] || ''
                            : splitType === 'fixed' || splitType === 'fixed_equal'
                            ? fixedValues[m.id] || ''
                            : ratioValues[m.id] || ''
                        }
                        onChange={(e) => {
                          if (splitType === 'percentage') {
                            handlePctChange(m.id, e.target.value);
                          } else if (splitType === 'fixed' || splitType === 'fixed_equal') {
                            handleFixedChange(m.id, e.target.value);
                          } else {
                            handleRatioChange(m.id, e.target.value);
                          }
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:border-gray-400 transition"
                      />
                      <span className="text-xs text-gray-500 font-bold">
                        {splitType === 'percentage'
                          ? '%'
                          : splitType === 'fixed' || splitType === 'fixed_equal'
                          ? '円'
                          : '比'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 金額指定・一部指定用のリアルタイム合計・残額・エラー表示 */}
            {(splitType === 'fixed' || splitType === 'fixed_equal') && (
              <div className="mt-3 bg-white border border-gray-200 rounded-lg p-3 text-xs space-y-1 shadow-sm">
                <div className="flex justify-between font-bold">
                  <span className="text-gray-600">支出総額:</span>
                  <span className="text-gray-900">{amount.toLocaleString()}円</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-gray-600">指定合計:</span>
                  <span className={isOverLimit ? "text-red-600 font-bold" : "text-indigo-600 font-bold"}>
                    {totalFixed.toLocaleString()}円
                  </span>
                </div>
                <div className="flex justify-between font-bold border-t border-gray-100 pt-1 mt-1">
                  <span className="text-gray-600">残り金額:</span>
                  <span className={remainingFixed < 0 ? "text-red-600 font-bold" : "text-gray-900"}>
                    {remainingFixed.toLocaleString()}円
                  </span>
                </div>
                {isOverLimit && (
                  <p className="text-[10px] text-red-600 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
                    <span>合計負担額が支出総額を超えています！</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 6. 計算プレビュー表示 */}
        {calculatedShares.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-2.5">
            <div className="flex justify-between items-center pb-1.5 border-b border-indigo-200">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
                  負担額計算プレビュー（端数調整済）
                </h4>
                <button
                  type="button"
                  onClick={() => setCalcTrigger((prev) => prev + 1)}
                  className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-100 hover:bg-indigo-200/80 px-1.5 py-0.5 rounded shadow-sm transition active:scale-95"
                  title="プレビューの再計算"
                >
                  <RotateCw className="h-2.5 w-2.5" />
                  <span>再計算</span>
                </button>
              </div>
              <span className="text-xs text-indigo-700 font-bold">
                合計: {calculatedShares.reduce((sum, s) => sum + s.shareAmount, 0).toLocaleString()}円
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {calculatedShares.map((s) => (
                <div key={s.memberId} className="flex justify-between items-center bg-white px-2.5 py-1.5 rounded border border-indigo-100">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-gray-600 font-semibold truncate">{s.name}</span>
                    {splitType === 'fixed_equal' && (
                      <span className={`text-[9px] px-1 py-0.2 rounded font-bold flex-shrink-0 ${
                        s.isFixedAmount 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {s.isFixedAmount ? '指定' : '均等'}
                      </span>
                    )}
                  </div>
                  <strong className="text-indigo-950 font-black flex-shrink-0">{s.shareAmount.toLocaleString()}円</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6.5 添付ファイル (領収書・請求書など) */}
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            領収書・請求書・明細の添付
          </label>
          <p className="text-[10px] text-gray-400">
            ※ PDF, PNG, JPEG, HEIC形式のファイルをアップロード可能です (複数可)
          </p>

          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-3 pb-3">
                <p className="text-xs text-gray-500 font-medium px-4 text-center">
                  クリックしてファイルを選択、またはドラッグ＆ドロップ
                </p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              <span className="text-xs font-bold text-gray-500">添付ファイル一覧 ({attachments.length}件):</span>
              <div className="grid grid-cols-1 gap-2">
                {attachments.map((att, index) => {
                  return (
                    <div key={index} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold text-gray-700 truncate max-w-[200px]" title={att.fileName}>
                          {att.fileName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={att.fileData}
                          download={att.fileName}
                          className="text-indigo-650 hover:text-indigo-800 font-bold hover:underline"
                        >
                          ダウンロード
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(index)}
                          className="text-red-500 hover:text-red-700 font-bold ml-2"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* バリデーションエラー表示 */}
        {validationError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* 7. ボタン */}
        <button
          type="submit"
          disabled={isPending || !!validationError || amount <= 0 || checkedMembers.length === 0}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {isPending ? '保存中...' : expense ? '変更を保存' : '支出を登録'}
        </button>
      </form>
    </div>
  );
}
