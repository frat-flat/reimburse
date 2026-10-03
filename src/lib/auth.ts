import { cache } from 'react';
import { cookies } from 'next/headers';
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { prisma } from './prisma';
import { User } from '@prisma/client';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const SESSION_COOKIE = 'session_user_id';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 1週間
const RESET_TOKEN_TTL = 60 * 60; // 1時間
const SCRYPT_KEYLEN = 64;

export const MIN_PASSWORD_LENGTH = 8;

/**
 * セッション署名用の秘密鍵。
 * 本番では SESSION_SECRET を設定する。未設定時は DATABASE_URL から導出する（DB接続先を変えると全員ログアウトになる）。
 */
function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('SESSION_SECRET または DATABASE_URL が設定されていません。');
  return createHash('sha256').update(`tatekaeta-session:${dbUrl}`).digest('hex');
}

function sign(value: string): string {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

// ==========================================
// パスワード
// ==========================================

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function isHashed(stored: string): boolean {
  return stored.startsWith('scrypt$');
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!isHashed(stored)) {
    // 旧来の平文保存分（ログイン成功時にハッシュへ置き換える）
    return safeEqual(password, stored);
  }
  const [, saltB64, hashB64] = stored.split('$');
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}

// ==========================================
// セッション
// ==========================================

function encodeSession(userId: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

function decodeSession(value: string): string | null {
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const [userId, expiresAt, signature] = parts;
  if (!safeEqual(signature, sign(`${userId}.${expiresAt}`))) return null;
  if (Number(expiresAt) < Math.floor(Date.now() / 1000)) return null;
  return userId;
}

export async function startSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encodeSession(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * クッキーセッションから現在のログインユーザーを取得する（同一リクエスト内メモ化）
 */
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return null;

  const userId = decodeSession(value);
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
  });
});

/**
 * メールアドレスとパスワードでログイン
 */
export async function login(email: string, password: string) {
  if (!email || !password) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    omit: { password: false },
  });

  if (!user || !(await verifyPassword(password, user.password))) {
    return null;
  }

  if (!isHashed(user.password)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(password) },
    });
  }

  await startSession(user.id);
  return { id: user.id, name: user.name, email: user.email };
}

/**
 * ログアウト処理
 */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// ==========================================
// パスワード再設定トークン
// ==========================================
// DBにトークンを保存しない署名付きトークン。現在のパスワード値を署名に含めるため、
// パスワード変更後は同じトークンを再利用できない。

export function createPasswordResetToken(user: Pick<User, 'id' | 'password'>): string {
  const expiresAt = Math.floor(Date.now() / 1000) + RESET_TOKEN_TTL;
  const payload = `${user.id}.${expiresAt}`;
  return `${payload}.${sign(`reset:${payload}:${user.password}`)}`;
}

export async function verifyPasswordResetToken(token: string): Promise<Pick<User, 'id'> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, expiresAt, signature] = parts;
  if (Number(expiresAt) < Math.floor(Date.now() / 1000)) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true },
  });
  if (!user) return null;

  const expected = sign(`reset:${userId}.${expiresAt}:${user.password}`);
  return safeEqual(signature, expected) ? { id: user.id } : null;
}
