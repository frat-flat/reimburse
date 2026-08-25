export interface Member {
  id: string;
}

export interface ShareResult {
  userId: string;
  shareAmount: number;
  percentage?: number;
}

export interface SettlementItem {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

/**
 * 割り勘の各人負担額を計算する（端数調整含む）
 */
export function calculateShares(
  totalAmount: number,
  splitType: 'equal' | 'percentage' | 'fixed' | 'ratio',
  members: Member[],
  options?: {
    percentages?: Record<string, number>; // userId -> percentage (0 to 100)
    fixedAmounts?: Record<string, number>; // userId -> amount
    ratios?: Record<string, number>; // userId -> ratio value
  }
): ShareResult[] {
  if (members.length === 0) {
    return [];
  }

  // 金額が0以下の場合は全員0円負担
  if (totalAmount <= 0) {
    return members.map(m => ({ userId: m.id, shareAmount: 0 }));
  }

  if (splitType === 'equal') {
    const count = members.length;
    const baseShare = Math.floor(totalAmount / count);
    const remainder = totalAmount - baseShare * count;

    return members.map((m, idx) => {
      // 余りをリストの先頭から1円ずつ配分する
      const extra = idx < remainder ? 1 : 0;
      return {
        userId: m.id,
        shareAmount: baseShare + extra,
      };
    });
  }

  if (splitType === 'percentage') {
    const percentages = options?.percentages || {};
    
    // パーセンテージ合計が100になるようバリデーション済みと仮定するが、念のため合計を計算
    let pctSum = 0;
    members.forEach(m => {
      pctSum += percentages[m.id] || 0;
    });

    if (pctSum === 0) {
      // 比率が何も設定されていない場合は均等割にフォールバック
      return calculateShares(totalAmount, 'equal', members);
    }

    // 各人の基本額を計算（小数点以下切り捨て）
    const shares = members.map(m => {
      const pct = percentages[m.id] || 0;
      const baseShare = Math.floor((totalAmount * pct) / 100);
      return {
        userId: m.id,
        shareAmount: baseShare,
        percentage: pct,
      };
    });

    // 余り端数を計算
    const currentTotal = shares.reduce((sum, s) => sum + s.shareAmount, 0);
    const remainder = totalAmount - currentTotal;

    if (remainder > 0) {
      // 割合の大きい人から順に余り（1円ずつ）を分配する。
      // 割合が同じ場合は、リストの並び順で優先。
      const sortedIndexes = members
        .map((m, originalIdx) => ({
          originalIdx,
          pct: percentages[m.id] || 0,
        }))
        .sort((a, b) => b.pct - a.pct); // 割合の降順

      for (let i = 0; i < remainder; i++) {
        const targetIdx = sortedIndexes[i % sortedIndexes.length].originalIdx;
        shares[targetIdx].shareAmount += 1;
      }
    }

    return shares;
  }

  if (splitType === 'fixed') {
    const fixedAmounts = options?.fixedAmounts || {};
    
    // 金額指定の場合は直接マッピングする。
    // ※ 呼び出し元で totalAmount と fixedAmounts の合計が一致していることをバリデーションする。
    return members.map(m => ({
      userId: m.id,
      shareAmount: fixedAmounts[m.id] || 0,
    }));
  }

  if (splitType === 'ratio') {
    const ratios = options?.ratios || {};
    
    // 比率の合計を計算
    let ratioSum = 0;
    members.forEach(m => {
      ratioSum += ratios[m.id] || 0;
    });

    if (ratioSum === 0) {
      // 比率がすべて0の場合は均等割
      return calculateShares(totalAmount, 'equal', members);
    }

    // 各人の基本額を計算（個人比率 / 合計比率）
    const shares = members.map(m => {
      const rat = ratios[m.id] || 0;
      const pct = (rat / ratioSum) * 100;
      const baseShare = Math.floor((totalAmount * rat) / ratioSum);
      return {
        userId: m.id,
        shareAmount: baseShare,
        percentage: Math.round(pct * 100) / 100, // 小数点以下第2位まで保持
      };
    });

    // 端数調整
    const currentTotal = shares.reduce((sum, s) => sum + s.shareAmount, 0);
    const remainder = totalAmount - currentTotal;

    if (remainder > 0) {
      // 比率の大きい人から順に1円ずつ配分する
      const sortedIndexes = members
        .map((m, originalIdx) => ({
          originalIdx,
          rat: ratios[m.id] || 0,
        }))
        .sort((a, b) => b.rat - a.rat);

      for (let i = 0; i < remainder; i++) {
        const targetIdx = sortedIndexes[i % sortedIndexes.length].originalIdx;
        shares[targetIdx].shareAmount += 1;
      }
    }

    return shares;
  }

  return members.map(m => ({ userId: m.id, shareAmount: 0 }));
}

/**
 * 各ユーザーの純残高から、Greedyアルゴリズムを用いて最適な精算取引リストを計算する
 */
export function calculateSettlements(
  balances: { userId: string; balance: number }[]
): SettlementItem[] {
  // 純残高がプラスの人（債権者）とマイナスの人（債務者）に分ける
  // 浮動小数点の誤差を考慮し、0.001を超えるものを対象とする
  const creditors = balances
    .filter(b => b.balance > 0.001)
    .map(b => ({ ...b }))
    .sort((a, b) => b.balance - a.balance); // 残高が多い順

  const debtors = balances
    .filter(b => b.balance < -0.001)
    .map(b => ({ userId: b.userId, balance: Math.abs(b.balance) }))
    .sort((a, b) => b.balance - a.balance); // 債務が多い（絶対値が大きい）順

  const settlements: SettlementItem[] = [];

  let cIdx = 0;
  let dIdx = 0;

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const creditor = creditors[cIdx];
    const debtor = debtors[dIdx];

    const amount = Math.min(creditor.balance, debtor.balance);

    if (amount > 0.001) {
      settlements.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: Math.round(amount * 100) / 100, // 念のため小数第2位で四捨五入（円単位なら整数になるはず）
      });
    }

    creditor.balance -= amount;
    debtor.balance -= amount;

    if (creditor.balance < 0.001) {
      cIdx++;
    }
    if (debtor.balance < 0.001) {
      dIdx++;
    }
  }

  return settlements;
}
