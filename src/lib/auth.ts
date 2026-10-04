import { cache } from 'react';
import { cookies } from 'next/headers';
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { prisma } from './prisma';
import { User } from '@prisma/client';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const SESSION_COOKIE = 'tt_session';
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
// ダミー資格情報の排除
// ==========================================
// テスト用・サンプル用のアカウントが本番に紛れ込んでもログインできないよう、
// 予約ドメイン（RFC 2606 / 6761）のメールアドレスと、よくあるダミーパスワードを拒否する。

const RESERVED_EMAIL_DOMAINS = ['example.com', 'example.net', 'example.org'];
const RESERVED_EMAIL_TLDS = ['test', 'example', 'invalid', 'localhost', 'local'];

export function isReservedEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@').pop() ?? '';
  if (!domain || domain === 'localhost') return true;
  if (RESERVED_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) return true;
  return RESERVED_EMAIL_TLDS.includes(domain.split('.').pop() ?? '');
}

const DUMMY_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'passw0rd', 'pass1234',
  '12345678', '123456789', '1234567890', '11111111', '00000000', '87654321',
  'qwertyui', 'qwerty123', 'abcd1234', 'abc12345', 'asdfghjk',
  'admin123', 'administrator', 'testtest', 'test1234', 'testuser',
  'demo1234', 'dummy123', 'changeme', 'letmein1', 'welcome1', 'iloveyou',
]);

/** 新しく設定するパスワードとして使えない場合はエラーメッセージを返す */
export function validateNewPassword(password: string, email?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `パスワードは${MIN_PASSWORD_LENGTH}文字以上で入力してください。`;
  }
  const lower = password.toLowerCase();
  const local = email?.trim().toLowerCase().split('@')[0];
  if (DUMMY_PASSWORDS.has(lower) || /^(.)\1+$/.test(password) || (local && lower === local)) {
    return '推測されやすいパスワードは使用できません。別のパスワードを設定してください。';
  }
  return null;
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
// セッションはDBの Session テーブルで管理する。クッキーにはランダムなトークンだけを持たせ、
// DBにはそのハッシュを保存する。ログアウトやパスワード再設定でDBの行を消すと、
// ブラウザにクッキーが残っていても（再読み込み・戻る操作・コピーされたクッキーでも）二度と通らない。

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
}

/** 旧方式（ユーザーIDそのもの・署名付きID）のクッキー。読み取りには一切使わず、見つけたら消す */
const LEGACY_SESSION_COOKIES = ['session_user_id'];

function clearSessionCookies(cookieStore: Awaited<ReturnType<typeof cookies>>): void {
  for (const name of [SESSION_COOKIE, ...LEGACY_SESSION_COOKIES]) {
    cookieStore.set(name, '', { ...sessionCookieOptions(), maxAge: 0, expires: new Date(0) });
  }
}

export async function startSession(userId: string): Promise<void> {
  const cookieStore = await cookies();

  // 既存セッションを引き継がない（セッション固定化対策）
  const previous = cookieStore.get(SESSION_COOKIE)?.value;
  if (previous) {
    await prisma.session.deleteMany({ where: { id: hashToken(previous) } });
  }
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });

  const token = randomBytes(32).toString('base64url');
  await prisma.session.create({
    data: {
      id: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
    },
  });

  for (const name of LEGACY_SESSION_COOKIES) {
    cookieStore.set(name, '', { ...sessionCookieOptions(), maxAge: 0, expires: new Date(0) });
  }
  cookieStore.set(SESSION_COOKIE, token, { ...sessionCookieOptions(), maxAge: SESSION_MAX_AGE });
}

/**
 * クッキーセッションから現在のログインユーザーを取得する（同一リクエスト内メモ化）
 * DBに有効なセッション行がある場合だけユーザーを返す。
 */
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  if (session.user.status !== 'active') return null;

  return session.user;
});

/**
 * 指定ユーザーの全セッションを失効させる（パスワード再設定時など）
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

/**
 * メールアドレスとパスワードでログイン
 */
export async function login(email: string, password: string) {
  if (!email || !password) return null;
  if (isReservedEmail(email)) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    omit: { password: false },
  });

  if (!user || !user.password || !(await verifyPassword(password, user.password))) {
    return null;
  }
  if (user.status !== 'active') return null;

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
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { id: hashToken(token) } });
  }
  clearSessionCookies(cookieStore);
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
