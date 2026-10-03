# 07_NEON_MIGRATION.md — Supabase → Neon 移行手順

## 前提（2026-10-03 調査）
- アプリは Supabase を **Postgres としてのみ** 利用している。`@supabase/*` クライアント、Supabase Auth、Storage は未使用（`auth.users` / `storage.objects` とも 0 行）。
- 使用テーブルは `public` スキーマの Prisma モデル 12 個のみ。インストール済み拡張は Supabase 既定のもの（`pgcrypto` / `uuid-ossp` / `pg_stat_statements` / `supabase_vault`）だけで、アプリは依存していない。
- `prisma/migrations` は無く、`_prisma_migrations` テーブルも無い（スキーマは `prisma db push` 運用）。
- 現行 Supabase プロジェクト `reimburse` は **ap-south-1（ムンバイ）**。Postgres 17。
- Neon に東京リージョンは無い。アジアは Singapore (`aws-ap-southeast-1`) と Sydney のみ。Vercel 関数は `hnd1`（東京）なので、**Singapore を推奨**（現在のムンバイより東京から近い）。
- コード側の変更は `src/lib/prisma.ts` に `connect_timeout=15` を補うことのみ。Supabase のままでも動くので、この変更は移行前にマージしてよい。
- Vercel は GitHub 未連携（2026-10-03 時点）。マージしても自動デプロイされない点に注意（手順 4 参照）。

## 1. Neon プロジェクトを作る
1. https://console.neon.tech で新規プロジェクト。Postgres version **17**、Region **AWS Asia Pacific (Singapore)**。
2. Dashboard の "Connect" から 2 種類の接続文字列を控える。
   - **Pooled**（ホストに `-pooler` が付く）→ `DATABASE_URL`
   - **Direct**（`-pooler` なし）→ `DIRECT_URL`
   - どちらも末尾に `?sslmode=require` が付いていることを確認。

## 2. データを移す（書き込みが少ない時間帯に）
Supabase の直接接続ホスト `db.<ref>.supabase.co` は IPv6 のみのため、手元からは **Session pooler**（Supabase Dashboard → Connect → Session pooler, ポート 5432）の URL を使う。クライアントは pg_dump / pg_restore **17 以上**。

```bash
export SUPABASE_URL='postgresql://postgres.<ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres'
export NEON_DIRECT_URL='postgresql://<user>:<password>@<endpoint>.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'

# public スキーマのみダンプ（auth/storage 等の Supabase 管理スキーマは不要）
pg_dump "$SUPABASE_URL" --schema=public --no-owner --no-privileges -Fc -f tatekaeta.dump

# Neon へリストア（"schema public already exists" のエラーは無害）
pg_restore --no-owner --no-privileges -d "$NEON_DIRECT_URL" tatekaeta.dump
```

## 3. 検証
両方の DB で同じクエリを流し、件数が一致することを確認する。

```sql
SELECT 'User' t, count(*) FROM "User" UNION ALL
SELECT 'Project', count(*) FROM "Project" UNION ALL
SELECT 'Member', count(*) FROM "Member" UNION ALL
SELECT 'MasterMember', count(*) FROM "MasterMember" UNION ALL
SELECT 'Expense', count(*) FROM "Expense" UNION ALL
SELECT 'ExpensePayment', count(*) FROM "ExpensePayment" UNION ALL
SELECT 'ExpenseShare', count(*) FROM "ExpenseShare" UNION ALL
SELECT 'ExpenseAttachment', count(*) FROM "ExpenseAttachment" UNION ALL
SELECT 'Settlement', count(*) FROM "Settlement" UNION ALL
SELECT 'Friendship', count(*) FROM "Friendship" UNION ALL
SELECT 'ProjectShare', count(*) FROM "ProjectShare" UNION ALL
SELECT 'Notification', count(*) FROM "Notification";
```

スキーマが Prisma と一致しているかも確認する（"No difference detected." が出れば OK。差分が出たら切替を中止して調べる）。

```bash
DIRECT_URL="$NEON_DIRECT_URL" DATABASE_URL="$NEON_DIRECT_URL" npx prisma migrate diff \
  --from-url "$NEON_DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
```

## 4. Vercel の環境変数を切り替える
Vercel → Project → Settings → Environment Variables で Production（必要なら Preview も）を更新。
- `DATABASE_URL` = Neon pooled URL
- `DIRECT_URL` = Neon direct URL

保存後、再デプロイしないと反映されない（環境変数はビルド・デプロイ時に読み込まれる）。

> [!IMPORTANT]
> 2026-10-03 時点で Vercel プロジェクトは GitHub と未連携のため、`main` へのマージだけでは本番に反映されない（本番は 9/4 のデプロイのまま）。
> - DB の切り替えだけなら、Deployments で現在の本番デプロイを **Redeploy** すればよい（9/4 時点のコードのまま接続先だけ Neon になる）。
> - `main` の最新コード（このPRの `connect_timeout` を含む）を出すには、Vercel → Settings → Git で `frat-flat/reimburse` を連携して Production Branch を `main` にするか、手元で `vercel --prod` を実行する。DB切替とコード更新は別々に行うと、問題が出たときに原因を切り分けやすい。

## 5. 動作確認
ログイン、プロジェクト一覧、立替の登録、精算画面、領収書表示を一通り確認。Vercel の Runtime Logs に Prisma の接続エラーが出ていないか見る。

## 6. ロールバック
問題があれば Vercel の `DATABASE_URL` / `DIRECT_URL` を Supabase の値に戻して Redeploy。切替後に Neon 側へ書かれたデータは Supabase に無いので、戻す場合はその分を手で移す。

## 7. 後片付け
1〜2 週間問題が無ければ Supabase プロジェクト `reimburse` を Pause（その後削除）。
