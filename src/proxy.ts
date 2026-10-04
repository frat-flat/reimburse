import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'tt_session';

// ログインなしで開けるページ
const PUBLIC_PATHS = ['/login', '/reset-password', '/swipe-simulator'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * 1. ログイン状態で表示したページをブラウザ・中間キャッシュに残さない（ログアウト後の再読み込みや
 *    「戻る」で以前のログイン画面が表示されないようにする）。
 * 2. セッションクッキーが無いまま保護ページを開いたら、描画前にログイン画面へ送る。
 * 本当の認証判定は各ページ・Server Action の getCurrentUser()（DBのセッション照合）で行う。
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  let response: NextResponse;
  if (request.method === 'GET' && !hasSession && !isPublicPath(pathname) && !pathname.startsWith('/api/')) {
    response = NextResponse.redirect(new URL('/login', request.url));
  } else {
    response = NextResponse.next();
  }

  response.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export const config = {
  matcher: [
    // 静的ファイル・画像・アイコン類は除外
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|apple-touch-icon.png|icon-192.png|icon-512.png|logo.png|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)',
  ],
};
