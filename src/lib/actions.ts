'use server';

import { prisma } from './prisma';
import { getCurrentUser, login, logout } from './auth';
import { calculateShares, calculateSettlements } from './settlement';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// ==========================================
// 1. 認証関連 Server Actions
// ==========================================

export async function actionLogin(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email) {
    return { error: 'メールアドレスを入力してください。' };
  }

  const user = await login(email, password);
  if (!user) {
    return { error: 'ログインに失敗しました。メールアドレスまたはパスワードを確認してください。' };
  }

  revalidatePath('/');
  redirect('/dashboard');
}

export async function actionLogout() {
  await logout();
  revalidatePath('/');
  redirect('/login');
}

export async function actionRegister(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string || 'password';

  if (!name || !email) {
    return { error: 'ユーザー名とメールアドレスは必須です。' };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { error: 'このメールアドレスは既に登録されています。' };
    }

    await prisma.user.create({
      data: {
        name,
        email,
        password,
        status: 'active',
      },
    });

    await login(email, password);
  } catch (e) {
    console.error(e);
    return { error: 'ユーザー登録中にエラーが発生しました。' };
  }

  revalidatePath('/');
  redirect('/dashboard');
}

// ==========================================
// 2. プロジェクト関連 Server Actions
// ==========================================

export async function actionCreateProject(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: 'ログインが必要です。' };
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const memberNames = formData.getAll('memberNames') as string[];

  if (!name) {
    return { error: 'プロジェクト名は必須です。' };
  }

  let createdProjectId = '';

  try {
    await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name,
          description,
          status: 'active',
          createdBy: currentUser.id,
        },
      });

      createdProjectId = project.id;

      // 幹事自身を精算メンバー（Member）の最初の1人として自動登録
      await tx.member.create({
        data: {
          projectId: project.id,
          name: currentUser.name,
        },
      });

      // 選択されたメンバーが存在すれば、幹事以外の名前のものをプロジェクトメンバーとして自動登録
      const filteredNames = memberNames.filter(
        (mName) => mName.trim().toLowerCase() !== currentUser.name.trim().toLowerCase()
      );

      if (filteredNames.length > 0) {
        await tx.member.createMany({
          data: filteredNames.map((mName) => ({
            projectId: project.id,
            name: mName.trim(),
          })),
        });
      }
    });
  } catch (e) {
    console.error(e);
    return { error: 'プロジェクト作成中にエラーが発生しました。' };
  }

  revalidatePath('/dashboard');
  redirect(`/projects/${createdProjectId}`);
}

export async function actionCreateMember(projectId: string, name: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: 'ログインが必要です。' };
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return { error: 'プロジェクトが見つかりません。' };
  }

  if (project.status !== 'active') {
    return { error: '精算確定または完了しているプロジェクトのメンバーは変更できません。' };
  }

  const cleanName = name.trim();
  if (!cleanName) {
    return { error: 'メンバー名を入力してください。' };
  }

  try {
    const existing = await prisma.member.findUnique({
      where: {
        projectId_name: {
          projectId,
          name: cleanName,
        },
      },
    });

    if (existing) {
      return { error: 'この名前のメンバーは既にこのプロジェクトに登録されています。' };
    }

    await prisma.member.create({
      data: {
        projectId,
        name: cleanName,
      },
    });
  } catch (e) {
    console.error(e);
    return { error: 'メンバー追加中にエラーが発生しました。' };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

// ==========================================
// 3. 支出（Expense）関連 Server Actions
// ==========================================

export async function actionCreateExpense(
  projectId: string,
  data: {
    title: string;
    amount: number;
    splitType: 'equal' | 'percentage' | 'fixed' | 'ratio' | 'fixed_equal';
    payerMemberId: string;
    expenseDate?: string;
    shares: {
      memberId: string;
      percentage?: number;
      fixedAmount?: number;
      ratio?: number;
      isRemainderParticipant?: boolean;
    }[];
  }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: 'プロジェクトが見つかりません。' };
  if (project.status !== 'active') {
    return { error: '精算が確定または完了しているため、支出を追加できません。' };
  }

  const { title, amount, splitType, payerMemberId, expenseDate, shares: inputShares } = data;

  if (!title || amount <= 0) {
    return { error: '項目名および正しい金額を入力してください。' };
  }

  const parsedDate = expenseDate ? new Date(expenseDate) : new Date();

  // 1. 各人の負担金額の端数調整計算
  const members = inputShares.map(s => ({ id: s.memberId }));
  const percentages = inputShares.reduce((acc, curr) => {
    if (curr.percentage !== undefined) acc[curr.memberId] = curr.percentage;
    return acc;
  }, {} as Record<string, number>);

  const fixedAmounts = inputShares.reduce((acc, curr) => {
    if (curr.fixedAmount !== undefined) acc[curr.memberId] = curr.fixedAmount;
    return acc;
  }, {} as Record<string, number>);

  const ratios = inputShares.reduce((acc, curr) => {
    if (curr.ratio !== undefined) acc[curr.memberId] = curr.ratio;
    return acc;
  }, {} as Record<string, number>);

  const remainderMemberIds = inputShares
    .filter(s => s.isRemainderParticipant)
    .map(s => s.memberId);

  // 入力された固定値の検証
  if (splitType === 'fixed') {
    const totalFixed = Object.values(fixedAmounts).reduce((sum, val) => sum + val, 0);
    if (totalFixed !== amount) {
      return { error: `負担額の合計（${totalFixed}円）が支出金額（${amount}円）と一致しません。` };
    }
  }

  if (splitType === 'fixed_equal') {
    const totalFixed = Object.values(fixedAmounts).reduce((sum, val) => sum + val, 0);
    const specifiedCount = Object.keys(fixedAmounts).filter(id => (fixedAmounts[id] || 0) > 0).length;
    const totalMembersCount = members.length;

    if (totalFixed > amount) {
      return { error: `指定金額の合計（${totalFixed}円）が支出総額（${amount}円）を超えています。` };
    }

    if (specifiedCount === totalMembersCount && totalFixed !== amount) {
      return { error: `全員分の金額を指定する場合は、負担合計（${totalFixed}円）が支出総額（${amount}円）と一致しなければなりません。` };
    }
  }

  if (splitType === 'percentage') {
    const totalPct = Object.values(percentages).reduce((sum, val) => sum + val, 0);
    if (Math.abs(totalPct - 100) > 0.001) {
      return { error: `負担割合の合計（${totalPct}%）が100%になるように指定してください。` };
    }
  }

  // calculateShares の引数のため、 id を memberId にマップして渡す
  const calculatedShares = calculateShares(amount, splitType, members, {
    percentages,
    fixedAmounts,
    ratios,
    remainderMemberIds,
  });

  // 2. 不変条件チェック
  const shareTotal = calculatedShares.reduce((sum, s) => sum + s.shareAmount, 0);
  if (shareTotal !== amount) {
    return { error: `システム計算エラー: 負担額合計（${shareTotal}円）が支出総額（${amount}円）と一致しませんでした。` };
  }

  try {
    await prisma.expense.create({
      data: {
        projectId,
        title,
        amount,
        splitType,
        expenseDate: parsedDate,
        createdBy: currentUser.id,
        payments: {
          create: {
            memberId: payerMemberId,
            amount,
          },
        },
        shares: {
          createMany: {
            data: calculatedShares.map(s => ({
              memberId: s.userId, // calculateShares は id フィールドを userId として返すため
              shareAmount: s.shareAmount,
              percentage: s.percentage ?? null,
            })),
          },
        },
      },
    });
  } catch (e) {
    console.error(e);
    return { error: '支出の登録中にエラーが発生しました。' };
  }

  return { success: true, redirectUrl: `/projects/${projectId}` };
}

export async function actionUpdateExpense(
  expenseId: string,
  data: {
    title: string;
    amount: number;
    splitType: 'equal' | 'percentage' | 'fixed' | 'ratio' | 'fixed_equal';
    payerMemberId: string;
    expenseDate?: string;
    shares: {
      memberId: string;
      percentage?: number;
      fixedAmount?: number;
      ratio?: number;
      isRemainderParticipant?: boolean;
    }[];
  }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  const existingExpense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { project: true },
  });

  if (!existingExpense) return { error: '支出が見つかりません。' };
  if (existingExpense.project.status !== 'active') {
    return { error: '精算が確定または完了しているため、支出を編集できません。' };
  }

  const { title, amount, splitType, payerMemberId, expenseDate, shares: inputShares } = data;

  if (!title || amount <= 0) {
    return { error: '項目名および正しい金額を入力してください。' };
  }

  // 1. 各人の負担金額の端数調整計算
  const members = inputShares.map(s => ({ id: s.memberId }));
  const percentages = inputShares.reduce((acc, curr) => {
    if (curr.percentage !== undefined) acc[curr.memberId] = curr.percentage;
    return acc;
  }, {} as Record<string, number>);

  const fixedAmounts = inputShares.reduce((acc, curr) => {
    if (curr.fixedAmount !== undefined) acc[curr.memberId] = curr.fixedAmount;
    return acc;
  }, {} as Record<string, number>);

  const ratios = inputShares.reduce((acc, curr) => {
    if (curr.ratio !== undefined) acc[curr.memberId] = curr.ratio;
    return acc;
  }, {} as Record<string, number>);

  const remainderMemberIds = inputShares
    .filter(s => s.isRemainderParticipant)
    .map(s => s.memberId);

  // バリデーション
  if (splitType === 'fixed') {
    const totalFixed = Object.values(fixedAmounts).reduce((sum, val) => sum + val, 0);
    if (totalFixed !== amount) {
      return { error: `負担額の合計（${totalFixed}円）が支出金額（${amount}円）と一致しません。` };
    }
  }

  if (splitType === 'fixed_equal') {
    const totalFixed = Object.values(fixedAmounts).reduce((sum, val) => sum + val, 0);
    const specifiedCount = Object.keys(fixedAmounts).filter(id => (fixedAmounts[id] || 0) > 0).length;
    const totalMembersCount = members.length;

    if (totalFixed > amount) {
      return { error: `指定金額の合計（${totalFixed}円）が支出総額（${amount}円）を超えています。` };
    }

    if (specifiedCount === totalMembersCount && totalFixed !== amount) {
      return { error: `全員分の金額を指定する場合は、負担合計（${totalFixed}円）が支出総額（${amount}円）と一致しなければなりません。` };
    }
  }

  if (splitType === 'percentage') {
    const totalPct = Object.values(percentages).reduce((sum, val) => sum + val, 0);
    if (Math.abs(totalPct - 100) > 0.001) {
      return { error: `負担割合の合計（${totalPct}%）が100%になるように指定してください。` };
    }
  }

  const calculatedShares = calculateShares(amount, splitType, members, {
    percentages,
    fixedAmounts,
    ratios,
    remainderMemberIds,
  });

  // 不変条件チェック
  const shareTotal = calculatedShares.reduce((sum, s) => sum + s.shareAmount, 0);
  if (shareTotal !== amount) {
    return { error: 'システム計算エラー: 負担額合計が支出総額と一致しません。' };
  }

  const parsedDate = expenseDate ? new Date(expenseDate) : new Date();

  try {
    await prisma.expense.update({
      where: { id: expenseId },
      data: {
        title,
        amount,
        splitType,
        expenseDate: parsedDate,
        payments: {
          deleteMany: {},
          create: {
            memberId: payerMemberId,
            amount,
          },
        },
        shares: {
          deleteMany: {},
          createMany: {
            data: calculatedShares.map(s => ({
              memberId: s.userId, // calculateShares は id フィールドを userId として返すため
              shareAmount: s.shareAmount,
              percentage: s.percentage ?? null,
            })),
          },
        },
      },
    });
  } catch (e) {
    console.error(e);
    return { error: '支出の更新中にエラーが発生しました。' };
  }

  return { success: true, redirectUrl: `/projects/${existingExpense.projectId}` };
}

export async function actionDeleteExpense(expenseId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  const existingExpense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { project: true },
  });

  if (!existingExpense) return { error: '支出が見つかりません。' };
  if (existingExpense.project.status !== 'active') {
    return { error: '精算が確定または完了しているため、支出を削除できません。' };
  }

  try {
    await prisma.expense.delete({
      where: { id: expenseId },
    });
  } catch (e) {
    console.error(e);
    return { error: '支出の削除中にエラーが発生しました。' };
  }

  return { success: true };
}

// ==========================================
// 4. 精算結果（Settlement）関連 Server Actions
// ==========================================

export async function actionConfirmSettlements(projectId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: true,
      expenses: {
        include: {
          payments: true,
          shares: true,
        },
      },
    },
  });

  if (!project) return { error: 'プロジェクトが見つかりません。' };
  if (project.status !== 'active') {
    return { error: '既に精算は確定されています。' };
  }

  // 1. 各メンバーの純残高 (Paid - Share) を集計
  const memberBalances = project.members.map(m => {
    let totalPaid = 0;
    let totalShare = 0;

    project.expenses.forEach(e => {
      e.payments.forEach(p => {
        if (p.memberId === m.id) totalPaid += p.amount;
      });
      e.shares.forEach(s => {
        if (s.memberId === m.id) totalShare += s.shareAmount;
      });
    });

    return {
      userId: m.id, // calculateSettlements に渡すため userId というキー名にする
      balance: totalPaid - totalShare,
    };
  });

  // 不変条件チェック
  const sumBalances = memberBalances.reduce((sum, mb) => sum + mb.balance, 0);
  if (Math.abs(sumBalances) > 0.1) {
    return { error: `純残高の不整合: 全員の純残高の合計が 0 円になりません（合計: ${sumBalances}円）。支出データを確認してください。` };
  }

  // 2. Greedy精算ルート計算
  const calculated = calculateSettlements(memberBalances);

  try {
    await prisma.$transaction(async (tx) => {
      // 過去の精算レコードをクリア
      await tx.settlement.deleteMany({ where: { projectId } });

      // 精算データを保存
      if (calculated.length > 0) {
        await tx.settlement.createMany({
          data: calculated.map(c => ({
            projectId,
            payerMemberId: c.fromUserId,
            receiverMemberId: c.toUserId,
            amount: c.amount,
            status: 'pending',
          })),
        });
      }

      // プロジェクトのステータスを確定に変更
      await tx.project.update({
        where: { id: projectId },
        data: { status: 'settlement_confirmed' },
      });
    });
  } catch (e) {
    console.error(e);
    return { error: '精算の確定処理中にエラーが発生しました。' };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/settlements`);
  return { success: true };
}

export async function actionUnlockSettlements(projectId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) return { error: 'プロジェクトが見つかりません。' };
  if (project.status !== 'settlement_confirmed' && project.status !== 'completed') {
    return { error: '確定状態のプロジェクトのみ解除できます。' };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 保存されていた精算レコードをクリア
      await tx.settlement.deleteMany({ where: { projectId } });

      // プロジェクトステータスを active に戻す
      await tx.project.update({
        where: { id: projectId },
        data: { status: 'active' },
      });
    });
  } catch (e) {
    console.error(e);
    return { error: '精算の解除処理中にエラーが発生しました。' };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/settlements`);
  return { success: true };
}

export async function actionToggleSettlementPaid(settlementId: string, isPaid: boolean) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  const settlement = await prisma.settlement.findUnique({
    where: { id: settlementId },
    include: { project: true },
  });

  if (!settlement) return { error: '精算レコードが見つかりません。' };

  try {
    await prisma.$transaction(async (tx) => {
      // 支払ステータス更新
      await tx.settlement.update({
        where: { id: settlementId },
        data: {
          status: isPaid ? 'paid' : 'pending',
          paidAt: isPaid ? new Date() : null,
        },
      });

      // そのプロジェクトのすべての精算が支払済みになったか確認
      const allSettlements = await tx.settlement.findMany({
        where: { projectId: settlement.projectId },
      });

      const allPaid = allSettlements.every(s => s.status === 'paid');

      // 全て支払済みなら completed、そうでないなら settlement_confirmed
      await tx.project.update({
        where: { id: settlement.projectId },
        data: {
          status: allPaid ? 'completed' : 'settlement_confirmed',
        },
      });
    });
  } catch (e) {
    console.error(e);
    return { error: '支払ステータスの更新中にエラーが発生しました。' };
  }

  revalidatePath(`/projects/${settlement.projectId}`);
  revalidatePath(`/projects/${settlement.projectId}/settlements`);
  return { success: true };
}

export async function actionUpdateProject(projectId: string, formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;

  if (!name) {
    return { error: 'プロジェクト名は必須です。' };
  }

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { error: 'プロジェクトが見つかりません。' };
    if (project.createdBy !== currentUser.id) return { error: '権限がありません。' };

    await prisma.project.update({
      where: { id: projectId },
      data: { name, description },
    });
  } catch (e) {
    console.error(e);
    return { error: 'プロジェクトの更新中にエラーが発生しました。' };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/dashboard');
  return { success: true };
}

export async function actionDeleteProject(projectId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { error: 'プロジェクトが見つかりません。' };
    if (project.createdBy !== currentUser.id) return { error: '権限がありません。' };

    await prisma.project.delete({
      where: { id: projectId },
    });
  } catch (e) {
    console.error(e);
    return { error: 'プロジェクトの削除中にエラーが発生しました。' };
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function actionUpdateMember(memberId: string, name: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  if (!name || !name.trim()) {
    return { error: 'メンバー名は必須です。' };
  }

  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { project: true },
    });
    if (!member) return { error: 'メンバーが見つかりません。' };
    if (member.project.createdBy !== currentUser.id) return { error: '権限がありません。' };

    // 同一プロジェクト内の名前重複チェック（自分自身は除く）
    const duplicated = await prisma.member.findFirst({
      where: {
        projectId: member.projectId,
        name: name.trim(),
        NOT: { id: memberId },
      },
    });

    if (duplicated) {
      return { error: 'すでに同じ名前のメンバーが登録されています。' };
    }

    await prisma.member.update({
      where: { id: memberId },
      data: { name: name.trim() },
    });

    revalidatePath(`/projects/${member.projectId}`);
    revalidatePath(`/projects/${member.projectId}/members`);
  } catch (e) {
    console.error(e);
    return { error: 'メンバー名の変更中にエラーが発生しました。' };
  }

  return { success: true };
}

export async function actionDeleteMember(memberId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { project: true },
    });
    if (!member) return { error: 'メンバーが見つかりません。' };
    if (member.project.createdBy !== currentUser.id) return { error: '権限がありません。' };

    // データベース不整合防止のための安全性チェック
    // 1. 支出の支払者になっているか
    const isPayer = await prisma.expensePayment.findFirst({
      where: { memberId },
    });
    if (isPayer) {
      return { error: 'このメンバーはすでに支出の支払者として設定されているため削除できません。先に支出データを削除してください。' };
    }

    // 2. 支出の負担者になっているか
    const isShareHolder = await prisma.expenseShare.findFirst({
      where: { memberId },
    });
    if (isShareHolder) {
      return { error: 'このメンバーはすでに支出の負担者として設定されているため削除できません。先に支出データを変更または削除してください。' };
    }

    // 3. 確定済み精算レコードに関与しているか
    const isSettlementInvolved = await prisma.settlement.findFirst({
      where: {
        OR: [{ payerMemberId: memberId }, { receiverMemberId: memberId }],
      },
    });
    if (isSettlementInvolved) {
      return { error: 'このメンバーは確定済みの精算ルートに関与しているため削除できません。精算を一度解除してください。' };
    }

    await prisma.member.delete({
      where: { id: memberId },
    });

  revalidatePath(`/projects/${member.projectId}`);
    revalidatePath(`/projects/${member.projectId}/members`);
  } catch (e) {
    console.error(e);
    return { error: 'メンバーの削除中にエラーが発生しました。' };
  }

  return { success: true };
}

export async function actionCreateMasterMember(name: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  if (!name || !name.trim()) {
    return { error: 'メンバー名は必須です。' };
  }

  try {
    // 重複チェック
    const duplicated = await prisma.masterMember.findFirst({
      where: {
        userId: currentUser.id,
        name: name.trim(),
      },
    });

    if (duplicated) {
      return { error: 'すでに同じ名前のメンバーがマスタ登録されています。' };
    }

    await prisma.masterMember.create({
      data: {
        userId: currentUser.id,
        name: name.trim(),
      },
    });

    revalidatePath('/members');
  } catch (e) {
    console.error(e);
    return { error: 'メンバーの登録中にエラーが発生しました。' };
  }

  return { success: true };
}

export async function actionUpdateMasterMember(id: string, name: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  if (!name || !name.trim()) {
    return { error: 'メンバー名は必須です。' };
  }

  try {
    const master = await prisma.masterMember.findUnique({ where: { id } });
    if (!master) return { error: 'メンバーが見つかりません。' };
    if (master.userId !== currentUser.id) return { error: '権限がありません。' };

    // 重複チェック
    const duplicated = await prisma.masterMember.findFirst({
      where: {
        userId: currentUser.id,
        name: name.trim(),
        NOT: { id },
      },
    });

    if (duplicated) {
      return { error: 'すでに同じ名前のメンバーがマスタ登録されています。' };
    }

    await prisma.masterMember.update({
      where: { id },
      data: { name: name.trim() },
    });

    revalidatePath('/members');
  } catch (e) {
    console.error(e);
    return { error: 'メンバー名の変更中にエラーが発生しました。' };
  }

  return { success: true };
}

export async function actionDeleteMasterMember(id: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  try {
    const master = await prisma.masterMember.findUnique({ where: { id } });
    if (!master) return { error: 'メンバーが見つかりません。' };
    if (master.userId !== currentUser.id) return { error: '権限がありません。' };

    await prisma.masterMember.delete({ where: { id } });

    revalidatePath('/members');
  } catch (e) {
    console.error(e);
    return { error: 'メンバーの削除中にエラーが発生しました。' };
  }

  return { success: true };
}
