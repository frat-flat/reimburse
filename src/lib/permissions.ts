import { prisma } from './prisma';

// プロジェクト内での権限
// owner: 主催者 / editor: 編集可能 / viewer_all: 全体閲覧 / viewer_personal: 自身の支出のみ閲覧
export type ProjectRole = 'owner' | 'editor' | 'viewer_all' | 'viewer_personal';

export function normalizeShareRole(role: string | null | undefined): ProjectRole {
  if (role === 'editor' || role === 'viewer_personal') return role;
  // 旧データの 'viewer' は全体閲覧として扱う
  return 'viewer_all';
}

/**
 * ログインユーザーのプロジェクト権限を返す（アクセス権がなければ null）
 */
export async function getProjectRole(projectId: string, userId: string): Promise<ProjectRole | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { createdBy: true },
  });
  if (!project) return null;
  if (project.createdBy === userId) return 'owner';

  const share = await prisma.projectShare.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
  return share ? normalizeShareRole(share.role) : null;
}

/** 全員分の支出を編集・削除できるか */
export function canEditAllExpenses(role: ProjectRole | null): boolean {
  return role === 'owner' || role === 'editor';
}

/** 全員分の支出・精算・レポートを閲覧できるか */
export function canViewAll(role: ProjectRole | null): boolean {
  return role === 'owner' || role === 'editor' || role === 'viewer_all';
}

/**
 * ログインユーザーに対応するプロジェクトメンバーを探す。
 * アカウント紐付け済みのメンバーを優先し、名前一致は未紐付けのメンバーに限る。
 */
export function findLinkedMember<M extends { userId: string | null; name: string }>(
  members: M[],
  user: { id: string; name: string }
): M | undefined {
  return (
    members.find((m) => m.userId === user.id) ??
    members.find((m) => m.userId === null && m.name === user.name)
  );
}
