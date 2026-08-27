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
          userId: currentUser.id,
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
    attachments?: {
      fileName: string;
      fileType: string;
      fileData: string;
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

  const { title, amount, splitType, payerMemberId, expenseDate, shares: inputShares, attachments } = data;

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
            data: calculatedShares.map(s => {
              const inputShare = inputShares.find(is => is.memberId === s.userId);
              return {
                memberId: s.userId, // calculateShares は id フィールドを userId として返すため
                shareAmount: s.shareAmount,
                percentage: splitType === 'fixed_equal' 
                  ? (inputShare?.fixedAmount ?? null) 
                  : (s.percentage ?? null),
                ratio: splitType === 'fixed_equal'
                  ? (inputShare?.isRemainderParticipant ? 1 : 0)
                  : (inputShare?.ratio ?? null),
              };
            }),
          },
        },
        attachments: {
          createMany: {
            data: attachments?.map(att => ({
              fileName: att.fileName,
              fileType: att.fileType,
              fileData: att.fileData,
            })) || [],
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
    attachments?: {
      fileName: string;
      fileType: string;
      fileData: string;
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

  // 権限検証：発起人(project.createdBy) または この支出の作成者(existingExpense.createdBy) のみ編集可能
  if (existingExpense.project.createdBy !== currentUser.id && existingExpense.createdBy !== currentUser.id) {
    return { error: '他人が登録した支出を編集・削除する権限はありません。' };
  }

  const { title, amount, splitType, payerMemberId, expenseDate, shares: inputShares, attachments } = data;

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
            data: calculatedShares.map(s => {
              const inputShare = inputShares.find(is => is.memberId === s.userId);
              return {
                memberId: s.userId, // calculateShares は id フィールドを userId として返すため
                shareAmount: s.shareAmount,
                percentage: splitType === 'fixed_equal' 
                  ? (inputShare?.fixedAmount ?? null) 
                  : (s.percentage ?? null),
                ratio: splitType === 'fixed_equal'
                  ? (inputShare?.isRemainderParticipant ? 1 : 0)
                  : (inputShare?.ratio ?? null),
              };
            }),
          },
        },
        attachments: {
          deleteMany: {},
          createMany: {
            data: attachments?.map(att => ({
              fileName: att.fileName,
              fileType: att.fileType,
              fileData: att.fileData,
            })) || [],
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

  // 権限検証：発起人(project.createdBy) または この支出の作成者(existingExpense.createdBy) のみ削除可能
  if (existingExpense.project.createdBy !== currentUser.id && existingExpense.createdBy !== currentUser.id) {
    return { error: '他人が登録した支出を削除する権限はありません。' };
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
  if (project.createdBy !== currentUser.id) {
    return { error: '精算を確定する権限がありません（主催者のみが確定できます）。' };
  }
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
  if (project.createdBy !== currentUser.id) {
    return { error: '精算確定を解除する権限がありません（主催者のみが解除できます）。' };
  }
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

// ==========================================
// 5. 友達（Friendship）関連 Server Actions
// ==========================================

export async function actionSendFriendRequest(email: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  const targetEmail = email.trim().toLowerCase();
  if (targetEmail === currentUser.email.toLowerCase()) {
    return { error: '自分自身に友達申請を送ることはできません。' };
  }

  try {
    const friend = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!friend) {
      return { error: '入力されたメールアドレスを持つユーザーが見つかりません。' };
    }

    // 既に友達関係または申請が存在するか確認
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: currentUser.id, friendId: friend.id },
          { userId: friend.id, friendId: currentUser.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return { error: 'すでに友達になっています。' };
      }
      if (existing.userId === currentUser.id) {
        return { error: 'すでに友達申請を送信済みです。承認を待ってください。' };
      }
      return { error: '相手から友達申請が届いています。承認してください。' };
    }

    await prisma.friendship.create({
      data: {
        userId: currentUser.id,
        friendId: friend.id,
        status: 'pending',
      },
    });

    revalidatePath('/friends');
  } catch (e) {
    console.error(e);
    return { error: '友達申請中にエラーが発生しました。' };
  }

  return { success: true };
}

export async function actionAcceptFriendRequest(friendshipId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  try {
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) return { error: '友達申請が見つかりません。' };
    if (friendship.friendId !== currentUser.id) {
      return { error: '権限がありません。' };
    }

    await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'accepted' },
    });

    revalidatePath('/friends');
  } catch (e) {
    console.error(e);
    return { error: '承認処理中にエラーが発生しました。' };
  }

  return { success: true };
}

export async function actionRejectFriendRequest(friendshipId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  try {
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) return { error: '友達申請が見つかりません。' };
    if (friendship.friendId !== currentUser.id && friendship.userId !== currentUser.id) {
      return { error: '権限がありません。' };
    }

    await prisma.friendship.delete({
      where: { id: friendshipId },
    });

    revalidatePath('/friends');
  } catch (e) {
    console.error(e);
    return { error: '申請の削除処理中にエラーが発生しました。' };
  }

  return { success: true };
}

// ==========================================
// 6. プロジェクト共有（ProjectShare）関連 Server Actions
// ==========================================

export async function actionShareProject(
  projectId: string,
  memberId: string,
  friendUserId: string,
  role: string
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  let targetRole = role;
  if (targetRole !== 'editor' && targetRole !== 'viewer_all' && targetRole !== 'viewer_personal') {
    if (targetRole === 'viewer') {
      targetRole = 'viewer_all';
    } else {
      return { error: '無効な権限が指定されました。' };
    }
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) return { error: 'プロジェクトが見つかりません。' };
    if (project.createdBy !== currentUser.id) {
      return { error: '発起人のみがプロジェクトを共有できます。' };
    }

    // 既に同じプロジェクト・同じユーザーへの共有があるかチェック
    const existingShare = await prisma.projectShare.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: friendUserId,
        },
      },
    });

    await prisma.$transaction(async (tx) => {
      // 1. プロジェクトの精算メンバー(Member)に共有相手のUser IDを紐付ける
      await tx.member.update({
        where: { id: memberId },
        data: { userId: friendUserId },
      });

      // 2. 共有設定を作成または更新
      if (existingShare) {
        await tx.projectShare.update({
          where: { id: existingShare.id },
          data: { role: targetRole },
        });
      } else {
        await tx.projectShare.create({
          data: {
            projectId,
            userId: friendUserId,
            role: targetRole,
          },
        });
      }
    });

    revalidatePath(`/projects/${projectId}`);
  } catch (e) {
    console.error(e);
    return { error: '共有処理中にエラーが発生しました。' };
  }

  return { success: true };
}

export async function actionRemoveProjectShare(projectShareId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  try {
    const share = await prisma.projectShare.findUnique({
      where: { id: projectShareId },
      include: { project: true },
    });

    if (!share) return { error: '共有設定が見つかりません。' };
    if (share.project.createdBy !== currentUser.id) {
      return { error: '発起人のみが共有を解除できます。' };
    }

    await prisma.$transaction(async (tx) => {
      // 1. 紐付いているメンバーから userId を削除
      const member = await tx.member.findFirst({
        where: {
          projectId: share.projectId,
          userId: share.userId,
        },
      });

      if (member) {
        await tx.member.update({
          where: { id: member.id },
          data: { userId: null },
        });
      }

      // 2. 共有設定を削除
      await tx.projectShare.delete({
        where: { id: projectShareId },
      });
    });

    revalidatePath(`/projects/${share.projectId}`);
  } catch (e) {
    console.error(e);
    return { error: '共有解除処理中にエラーが発生しました。' };
  }

  return { success: true };
}

export async function actionUpdateProjectShareRole(projectShareId: string, role: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  if (role !== 'editor' && role !== 'viewer_all' && role !== 'viewer_personal') {
    return { error: '無効な権限が指定されました。' };
  }

  try {
    const share = await prisma.projectShare.findUnique({
      where: { id: projectShareId },
      include: { project: true },
    });

    if (!share) return { error: '共有設定が見つかりません。' };
    if (share.project.createdBy !== currentUser.id) {
      return { error: '発起人のみが権限を変更できます。' };
    }

    await prisma.projectShare.update({
      where: { id: projectShareId },
      data: { role },
    });

    revalidatePath(`/projects/${share.projectId}`);
  } catch (e) {
    console.error(e);
    return { error: '権限更新処理中にエラーが発生しました。' };
  }

  return { success: true };
}

// ==========================================
// 7. 類似・重複支出関連 Server Actions
// ==========================================

export async function actionConfirmDuplicate(expenseId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  try {
    await prisma.expense.update({
      where: { id: expenseId },
      data: { duplicateConfirmed: true },
    });

    // 関連するリロードを走らせる
    const exp = await prisma.expense.findUnique({
      where: { id: expenseId },
    });
    if (exp) {
      revalidatePath(`/projects/${exp.projectId}`);
    }
  } catch (e) {
    console.error(e);
    return { error: '重複の確認処理中にエラーが発生しました。' };
  }

  return { success: true };
}

// ==========================================
// 8. データベース自動マイグレーション用臨時 Server Action
// ==========================================

export async function actionRunDDL() {
  try {
    console.log('Running manual DDL migrations...');

    // 1. Friendship テーブルの作成
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Friendship" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "friendId" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Friendship_userId_friendId_key" ON "Friendship"("userId", "friendId");
    `);

    // 2. ProjectShare テーブルの作成
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ProjectShare" (
        "id" TEXT NOT NULL,
        "projectId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "ProjectShare_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ProjectShare_projectId_userId_key" ON "ProjectShare"("projectId", "userId");
    `);

    // 3. Member テーブルへの userId カラムの追加
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "userId" TEXT;
    `);

    // 4. Expense テーブルへの duplicateConfirmed カラムの追加
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "duplicateConfirmed" BOOLEAN NOT NULL DEFAULT false;
    `);

    console.log('Manual DDL migrations completed successfully.');
    return { success: true };
  } catch (err: any) {
    console.error('Error running manual DDL migrations:', err);
    return { error: err.message || 'DDL実行中にエラーが発生しました。' };
  }
}

// ==========================================
// 9. パスワード再設定用 Server Action
// ==========================================

export async function actionResetPassword(formData: FormData) {
  const email = formData.get('email') as string;
  const name = formData.get('name') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!email || !name || !newPassword) {
    return { error: 'すべての項目を入力してください。' };
  }

  try {
    // メールアドレスと登録名が一致するユーザーを検索
    const user = await prisma.user.findFirst({
      where: {
        email: email.trim(),
        name: name.trim(),
      },
    });

    if (!user) {
      return { error: '入力されたメールアドレスとユーザー名の組み合わせが見つかりません。' };
    }

    // パスワードを更新
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newPassword,
      },
    });

    console.log(`Password reset successfully for user: ${email}`);
    return { success: true };
  } catch (err: any) {
    console.error('Error during password reset:', err);
    return { error: err.message || 'パスワードの再設定中にエラーが発生しました。' };
  }
}

// ==========================================
// 10. プロフィール（領収書発行元情報）更新用 Server Action
// ==========================================

export async function actionUpdateProfile(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: 'ログインが必要です。' };

  const receiptIssuerName = formData.get('receiptIssuerName') as string;
  const receiptIssuerZip = formData.get('receiptIssuerZip') as string;
  const receiptIssuerAddress = formData.get('receiptIssuerAddress') as string;
  const receiptIssuerTel = formData.get('receiptIssuerTel') as string;
  const receiptIssuerRegNo = formData.get('receiptIssuerRegNo') as string;

  const bankCode = formData.get('bankCode') as string;
  const bankName = formData.get('bankName') as string;
  const branchCode = formData.get('branchCode') as string;
  const branchName = formData.get('branchName') as string;
  const accountType = formData.get('accountType') as string;
  const accountNumber = formData.get('accountNumber') as string;
  const accountHolder = formData.get('accountHolder') as string;
  const paypayUrl = formData.get('paypayUrl') as string;
  const showBankAccount = formData.get('showBankAccount') === 'true' || formData.get('showBankAccount') === 'on';
  const showPaypay = formData.get('showPaypay') === 'true' || formData.get('showPaypay') === 'on';

  // 口座名義カナのサーバー側バリデーション (カタカナ、長音、スペース類のみ許容)
  if (accountHolder && !/^[ァ-ヶーｱ-ﾝﾞﾟ\s　]+$/.test(accountHolder)) {
    return { error: '口座名義は必ずカナ表記（カタカナ）で入力してください。' };
  }

  try {
    await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        receiptIssuerName: receiptIssuerName ? receiptIssuerName.trim() : null,
        receiptIssuerZip: receiptIssuerZip ? receiptIssuerZip.trim() : null,
        receiptIssuerAddress: receiptIssuerAddress ? receiptIssuerAddress.trim() : null,
        receiptIssuerTel: receiptIssuerTel ? receiptIssuerTel.trim() : null,
        receiptIssuerRegNo: receiptIssuerRegNo ? receiptIssuerRegNo.trim() : null,
        bankCode: bankCode ? bankCode.trim() : null,
        bankName: bankName ? bankName.trim() : null,
        branchCode: branchCode ? branchCode.trim() : null,
        branchName: branchName ? branchName.trim() : null,
        accountType: accountType ? accountType.trim() : null,
        accountNumber: accountNumber ? accountNumber.trim() : null,
        accountHolder: accountHolder ? accountHolder.trim() : null,
        paypayUrl: paypayUrl ? paypayUrl.trim() : null,
        showBankAccount,
        showPaypay,
      },
    });

    revalidatePath('/profile');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating user profile:', err);
    return { error: err.message || 'プロフィールの更新中にエラーが発生しました。' };
  }
}
