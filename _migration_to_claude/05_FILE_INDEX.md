# 05_FILE_INDEX.md

## Claude Code が最初に確認すべき重要ファイル一覧（重要度順）

---

### 1. 最重要バックエンド・ロジック & データモデル

| パス | 用途 | 重要な理由 |
| :--- | :--- | :--- |
| [`prisma/schema.prisma`](file:///c:/Users/kyosh/reimburse/prisma/schema.prisma) | DBスキーマ定義 | 全エンティティ（User, Project, Member, Expense, Settlement, Friendship, Notification 等）のリレーションとデータ構造の根幹。 |
| [`src/lib/actions.ts`](file:///c:/Users/kyosh/reimburse/src/lib/actions.ts) | Server Actions（サーバー処理） | 認証、イベント作成、支出登録、精算確定、ステータス更新、Mate申請など、アプリ全体のすべてのDB変更・業務ロジックが集約されている。 |
| [`src/lib/settlement.ts`](file:///c:/Users/kyosh/reimburse/src/lib/settlement.ts) | 割り勘・精算計算エンジン | 5種類の割り勘計算（均等、割合、固定、比率、残金均等）と、最小送金回数を算出するコアアルゴリズムが実装されている。 |
| [`src/lib/notifications.ts`](file:///c:/Users/kyosh/reimburse/src/lib/notifications.ts) | アプリ内通知 ＆ 配信制御 | 通知作成、全アクティブユーザー一斉配信、既読化、メール送信トリガーの統合ハブ。 |
| [`src/lib/email.ts`](file:///c:/Users/kyosh/reimburse/src/lib/email.ts) | メール送信 ＆ HTMLテンプレート | Resend連携、カテゴリ別カラーバッジ付きレスポンシブHTMLメールの生成とエラーセーフな送信処理。 |
| [`src/lib/auth.ts`](file:///c:/Users/kyosh/reimburse/src/lib/auth.ts) | 認証・セッション管理 | Cookieベースのユーザーセッション管理。React `cache()` による同一リクエスト内のDBクエリメモ化を実装。 |
| [`src/lib/prisma.ts`](file:///c:/Users/kyosh/reimburse/src/lib/prisma.ts) | Prisma Client シングルトン | 接続プール設定（`connection_limit=10`）を含むDBクライアント初期化。 |

---

### 2. 主要画面（ページコンポーネント）

| パス | 用途 | 重要な理由 |
| :--- | :--- | :--- |
| [`src/app/projects/[id]/page.tsx`](file:///c:/Users/kyosh/reimburse/src/app/projects/[id]/page.tsx) | イベント詳細画面 | 支出一覧、精算進捗、メンバー、共有設定を統合表示する中心画面。 |
| [`src/app/projects/[id]/settlements/page.tsx`](file:///c:/Users/kyosh/reimburse/src/app/projects/[id]/settlements/page.tsx) | 精算結果・送金・領収書画面 | 精算ルート一覧、PayPay/振込先表示、領収書発行、ステータス切替を担う精算のメイン画面。 |
| [`src/app/dashboard/page.tsx`](file:///c:/Users/kyosh/reimburse/src/app/dashboard/page.tsx) | ダッシュボード | 自分が作成したイベント一覧、共有されたイベント一覧、ベースクルーの一覧画面。 |
| [`src/app/receipts/page.tsx`](file:///c:/Users/kyosh/reimburse/src/app/receipts/page.tsx) | 領収一覧画面 | 全イベント横断で「受け取った領収書」と「発行した領収書」をタブ切り替え表示・印刷。 |
| [`src/app/friends/page.tsx`](file:///c:/Users/kyosh/reimburse/src/app/friends/page.tsx) | Mate（フレンド）管理画面 | メールアドレス検索によるMate申請、受信した申請の承認/拒否、友達一覧の管理。 |
| [`src/app/notifications/page.tsx`](file:///c:/Users/kyosh/reimburse/src/app/notifications/page.tsx) | 通知一覧画面 | 全通知履歴の閲覧、一括既読処理。 |

---

### 3. コアUIコンポーネント

| パス | 用途 | 重要な理由 |
| :--- | :--- | :--- |
| [`src/components/ReceiptModal.tsx`](file:///c:/Users/kyosh/reimburse/src/components/ReceiptModal.tsx) | 領収書プレビュー＆発行モーダル | 印鑑ドラッグ配置、透過スライダー、消費税率計算、項目カスタマイズ、印刷CSS、発行後読み取り専用ロックを実装した重要コンポーネント。 |
| [`src/components/SwipeStatusButton.tsx`](file:///c:/Users/kyosh/reimburse/src/components/SwipeStatusButton.tsx) | 精算ステータス変更ボタン | スワイプ操作およびワンクリック/タップでのステータス切替、楽観的UI更新、権限制御を実装。 |
| [`src/app/projects/[id]/expenses/ExpenseForm.tsx`](file:///c:/Users/kyosh/reimburse/src/app/projects/[id]/expenses/ExpenseForm.tsx) | 支出登録・編集フォーム | 5種類の割り勘UI切り替え、端数調整リアルタイム計算、レシート画像添付、SPA即時遷移。 |
| [`src/components/NotificationDropdown.tsx`](file:///c:/Users/kyosh/reimburse/src/components/NotificationDropdown.tsx) | ベル通知ポップオーバー | 未読バッジ、ドロップダウンリスト、通知詳細全文モーダル。 |
| [`src/components/FloatingActions.tsx`](file:///c:/Users/kyosh/reimburse/src/components/FloatingActions.tsx) | フローティングFAB | 画面右下に常駐する電卓モーダルおよび新規イベント作成鉛筆ボタン。 |
| [`src/components/CreateProjectModal.tsx`](file:///c:/Users/kyosh/reimburse/src/components/CreateProjectModal.tsx) | 新規イベント作成モーダル | ベースクルー自動同期、決済許可設定、即時作成・遷移モーダル。 |
| [`src/components/MobileDrawerNav.tsx`](file:///c:/Users/kyosh/reimburse/src/components/MobileDrawerNav.tsx) | モバイルドロワーメニュー | スマホ向けスライドインナビゲーション。 |
| [`src/components/Header.tsx`](file:///c:/Users/kyosh/reimburse/src/components/Header.tsx) | 共通ヘッダー | ロゴ、PCナビゲーション、Mateバッジ、通知ベル、ログインユーザー情報。 |
