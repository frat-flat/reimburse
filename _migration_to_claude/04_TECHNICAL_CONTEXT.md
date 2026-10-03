# 04_TECHNICAL_CONTEXT.md

## 1. 使用技術スタック

| 分類 | 技術・バージョン | 備考 |
| :--- | :--- | :--- |
| **言語** | TypeScript 5.x / Node.js 20+ | 厳格な型チェック運用 |
| **フレームワーク** | Next.js 16.3.2 (App Router) | Turbopack 有効化、Server Components & Server Actions |
| **UIライブラリ** | React 19.0.0 / ReactDOM 19.0.0 | React `cache()`, `useTransition` 活用 |
| **スタイリング** | Tailwind CSS v4 (`@tailwindcss/postcss`) | モダンユーティリティファーストCSS |
| **アイコン** | Lucide React (`lucide-react` v1.34.0) | `strokeWidth: 1.8` アウトライン線画 |
| **ORM / DBクライアント** | Prisma 6.4.0 (`@prisma/client`) | `engineType = "binary"` |
| **データベース** | PostgreSQL (Neon) | AWS シンガポール (`aws-ap-southeast-1`)。移行手順は `07_NEON_MIGRATION.md` |
| **メール配信** | Resend (`resend` SDK v6.26.0) | HTML/テキストマルチパート自動配信 |
| **ホスティング環境** | Vercel | Production URL: `https://tatekaeta.vercel.app` |

---

## 2. 認証・セッション設計
- **セッション方式**: Next.js `cookies()` を利用した HTTP-only Cookie (`session_user_id`) によるステートレス認証。
- **有効期限**: 7日間 (`maxAge: 60 * 60 * 24 * 7`)。
- **最適化**: `src/lib/auth.ts` の `getCurrentUser` を React `cache()` でラップし、同一リクエスト内での重複DBクエリを完全排除。

---

## 3. コマンド一覧

### ① 開発サーバー起動
```bash
npm run dev
# または
npx next dev --turbopack
```

### ② ビルド検証（型チェック ＆ 本番ビルド）
```bash
npm run build
# 内部で prisma generate && next build が実行されます
```

### ③ 本番モード起動
```bash
npm run start
```

### ④ Prismaスキーマ反映・クライアント生成
```bash
npx prisma generate
npx prisma db push
```

---

## 4. デプロイ方法
- **自動デプロイ**:
  - GitHub リポジトリ（`frat-flat/reimburse`）の `main` ブランチへ `git push origin main` すると、Vercel連携により自動で本番ビルド・デプロイが実行されます。
- **本番環境URL**:
  - `https://tatekaeta.vercel.app`

---

## 5. 必要な環境変数一覧（※変数名のみ）

> [!IMPORTANT]
> 秘密鍵・パスワード等の実際の値は含まれていません。ローカル検証時は `.env`、Vercel本番環境では Environment Variables に設定してください。

- `DATABASE_URL` : Neon の **pooled** 接続文字列（ホスト名に `-pooler` が付くもの、`sslmode=require`）。
- `DIRECT_URL` : Neon の **direct** 接続文字列（`-pooler` なし。`prisma db push` / マイグレーション用）。
- `RESEND_API_KEY` : ResendのAPIキー（`re_...`）。※未設定時は自動でモックログ出力にフォールバック。
- `FROM_EMAIL` : メール送信元アドレス表記（例: `TaTekæTa <onboarding@resend.dev>` または独自ドメイン）。
- `NEXT_PUBLIC_APP_URL` : アプリケーションの公開URL（例: `https://tatekaeta.vercel.app`）。

---

## 6. 重要な設計・実装規約
- **Prisma接続プール**:
  - `src/lib/prisma.ts` にて `connection_limit=10&pool_timeout=20&connect_timeout=15` を（URL側で未指定のものだけ）補っており、並列クエリを阻害しないよう構成。`connect_timeout=15` は Neon のコールドスタート対策。
- **エラーセーフ設計**:
  - 通知メール送信（`src/lib/email.ts`）は非同期非ブロッキングで実行され、外部ネットワークエラーが発生してもDBトランザクションやUI操作を中断させない。
- **SPA画面遷移**:
  - フォーム送信完了時や画面遷移時は `window.location.href` を使用せず、Next.jsの `router.push` + `router.refresh` を使用する。
