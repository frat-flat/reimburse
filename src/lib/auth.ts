import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { User } from '@prisma/client';

/**
 * クッキーセッションから現在のログインユーザーを取得する
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session_user_id')?.value;
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
  });
}

/**
 * 簡易ログイン処理
 */
export async function login(email: string, password?: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) return null;

  // デモ用のためプレーンテキストでの簡易比較
  if (password && user.password !== password) {
    return null;
  }

  const cookieStore = await cookies();
  cookieStore.set('session_user_id', user.id, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1週間
  });

  return user;
}

/**
 * ログアウト処理
 */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session_user_id');
}

/**
 * デモ用ユーザー切り替え処理
 */
export async function switchUser(userId: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return null;

  const cookieStore = await cookies();
  cookieStore.set('session_user_id', user.id, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return user;
}
