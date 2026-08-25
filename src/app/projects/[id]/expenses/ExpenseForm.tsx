'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { calculateShares } from '@/lib/settlement';
import { actionCreateExpense, actionUpdateExpense } from '@/lib/actions';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
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
    splitType: 'equal' | 'percentage' | 'fixed' | 'ratio';
    payerMemberId: string;
    expenseDate?: string;
    shares: {
      memberId: string;
      percentage?: number | null;
    }[];
    sharesData?: {
      memberId: string;
      shareAmount: number;
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
  const [payerMemberId, setPayerMemberId] = useState(expense?.payerMemberId || members[0]?.id || '');
  const [splitType, setSplitType] = useState<'equal' | 'percentage' | 'fixed' | 'ratio'>(
    expense?.splitType || 'equal'
  );

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
    { memberId: string; shareAmount: number; name: string }[]
  >([]);
  
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

      setValidationError(null);

      const shares = calculateShares(amount, splitType, membersForSplit, {
        percentages,
        fixedAmounts,
        ratios,
      });

      setCalculatedShares(
        shares.map((s) => ({
          memberId: s.userId, // calculateShares は id フィールドを userId として返すため
          shareAmount: s.shareAmount,
          name: members.find((m) => m.id === s.userId)?.name || '不明',
        }))
      );
    } catch (e) {
      console.error(e);
    }
  }, [amount, splitType, selectedShares, pctValues, fixedValues, ratioValues, members, checkedMembers]);

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
        fixedAmount: splitType === 'fixed' ? parseFloat(fixedValues[m.id]) || 0 : undefined,
        ratio: splitType === 'ratio' ? parseFloat(ratioValues[m.id]) || 0 : undefined,
      };
    });

    const payload = {
      title,
      amount,
      splitType,
      payerMemberId,
      expenseDate,
      shares: payloadShares,
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

  // 編集時初期金額のロード（fixed指定の場合のロード）
  useEffect(() => {
    if (expense && expense.splitType === 'fixed' && expense.sharesData) {
      const sData = expense.sharesData;
      const values: Record<string, string> = {};
      sData.forEach((s) => {
        values[s.memberId] = s.shareAmount.toString();
      });
      setFixedValues(values);
    }
  }, [expense]);

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
            >
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
          <div className="flex gap-2 border border-gray-200 p-1 rounded-lg bg-gray-50 text-xs">
            {([
              { key: 'equal', label: '均等割' },
              { key: 'percentage', label: '割合指定' },
              { key: 'fixed', label: '金額指定' },
              { key: 'ratio', label: '比率指定' }
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

        {/* 5. 分割方法に応じた追加入力 (割合・金額・比率指定) */}
        {checkedMembers.length > 0 && splitType !== 'equal' && (
          <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {splitType === 'percentage' ? '負担割合の設定' : splitType === 'fixed' ? '負担金額の設定' : '負担比率の設定'}
            </h4>
            <div className="space-y-2">
              {checkedMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold text-gray-700">{m.name}</span>
                  <div className="flex items-center gap-1.5 w-32">
                    <input
                      type="number"
                      min={0}
                      step={splitType === 'percentage' ? 0.1 : 1}
                      required
                      placeholder="0"
                      value={
                        splitType === 'percentage'
                          ? pctValues[m.id] || ''
                          : splitType === 'fixed'
                          ? fixedValues[m.id] || ''
                          : ratioValues[m.id] || ''
                      }
                      onChange={(e) => {
                        if (splitType === 'percentage') {
                          handlePctChange(m.id, e.target.value);
                        } else if (splitType === 'fixed') {
                          handleFixedChange(m.id, e.target.value);
                        } else {
                          handleRatioChange(m.id, e.target.value);
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-gray-500 font-bold">
                      {splitType === 'percentage' ? '%' : splitType === 'fixed' ? '円' : '比'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 金額指定用のリアルタイム合計・残額・エラー表示 */}
            {splitType === 'fixed' && (
              <div className="mt-3 bg-white border border-gray-200 rounded-lg p-3 text-xs space-y-1 shadow-sm">
                <div className="flex justify-between font-bold">
                  <span className="text-gray-600">支出総額:</span>
                  <span className="text-gray-900">{amount.toLocaleString()}円</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-gray-600">入力合計:</span>
                  <span className={isOverLimit ? "text-red-600 font-bold" : "text-indigo-600 font-bold"}>
                    {totalFixed.toLocaleString()}円
                  </span>
                </div>
                <div className="flex justify-between font-bold border-t border-gray-100 pt-1 mt-1">
                  <span className="text-gray-600">残額:</span>
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
              <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
                負担額計算プレビュー（端数調整済）
              </h4>
              <span className="text-xs text-indigo-700 font-bold">
                合計: {calculatedShares.reduce((sum, s) => sum + s.shareAmount, 0).toLocaleString()}円
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {calculatedShares.map((s) => (
                <div key={s.memberId} className="flex justify-between bg-white px-2.5 py-1.5 rounded border border-indigo-100">
                  <span className="text-gray-600 font-semibold">{s.name}</span>
                  <strong className="text-indigo-950 font-black">{s.shareAmount.toLocaleString()}円</strong>
                </div>
              ))}
            </div>
          </div>
        )}

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
