# 06_HANDOFF_TO_CLAUDE.md

## Claude Code 向け引き継ぎガイド

ようこそ。本ドキュメントは、あなたがこのプロジェクト（**TaTekæTa** / タテカエタ）を初めて開き、迅速かつ正確に開発を引き継ぐための最優先ドキュメントです。

---

## 1. このプロジェクトは何か
複数人での旅行・イベント・合宿・飲み会などの複雑な立替支出を、シンプルかつ公平に割り勘・精算し、最小取引回数の送金ルート算出、PayPay/銀行振込サポート、そしてインボイス対応の電子領収書発行・管理（電子印鑑の押印調整対応）までを一気通貫で提供するWebアプリケーションです。

---

## 2. 現在どこまで完成しているか
- **開発進捗度**: コア機能および周辺機能（Mateフレンド共有、通知、メール配信、領収書フル編集、モバイルUI刷新、パフォーマンス改善）は**すべて実装・本番稼働済み**です。
- **稼働環境**: Vercel 本番環境（`https://tatekaeta.vercel.app`）にて稼働中。
- **ビルド状態**: Next.js 16 (Turbopack) のビルド（`npm run build`）はエラー0件で完全通過します。

---

## 3. 直近で何をしていたか
1. **パフォーマンス改善 & 操作ラグの解消**:
   - `prisma.ts` の接続プール制限（1本）を10本へ拡張。
   - `auth.ts` の `getCurrentUser` を React `cache()` でメモ化し、同一リクエスト内での重複DBクエリを完全排除。
   - 各画面（Header, Dashboard, プロジェクト詳細, 領収一覧, Mate管理）のクエリを `Promise.all` で一斉並列実行。
   - 支出登録時の全画面ハードリロード（`window.location.href`）を全廃し、Next.jsのSPA即時遷移（`router.push`）に統一。
   - ベースクルー・メンバー管理に 0ms 楽観的UI更新（Optimistic UI）を導入。
2. **ボタン反応性の改善**:
   - 精算ステータスボタン（`SwipeStatusButton`）がスライド操作だけでなく、**ワンタップ/クリックでも即座に状態が切り替わる**ように改善。
   - 主催者（幹事）による全精算ルートの代理ステータス更新権限を解放。
   - 新規イベント作成モーダル（`CreateProjectModal`）におけるベースクルー自動同期と確実な遷移を担保。

---

## 4. 次に何をすべきか
1. **ユーザーからのフィードバック確認**:
   - 直近で実施したパフォーマンス改善およびボタン反応性改善について、ユーザーからの実機操作レビュー・追加要望を確認してください。
2. **保守・追加要件の実装**:
   - ユーザーから新たな機能追加（例: 領収書の画像直接ダウンロード、CSVエクスポート等）の指示があった場合に、既存仕様を壊さずに設計・実装を進めてください。

---

## 5. 何を勝手に変更してはいけないか（重要制約）
- **既存の領収書ロック仕様**:
  - 発行済み（`receipt_issued`）の領収書、および受け取り側（支払者）が見る領収書は `readOnly={true}` に固定されています。改ざん防止のための確定仕様ですので、勝手にロックを解除しないでください。
- **割り勘・精算アルゴリズム**:
  - `src/lib/settlement.ts` に実装されている端数調整および最小送金回数の最適化ロジックは、数学的整合性がテスト・保証されています。独断で計算方法を変更しないでください。
- **非ブロッキング・エラーセーフ設計**:
  - Resendによるメール送信処理（`src/lib/email.ts`）は、APIキー未設定やネットワーク障害が発生してもアプリのメイン処理（精算や登録）を阻害しない設計になっています。この安全性を損なわないでください。
- **SPA画面遷移**:
  - 画面遷移に `window.location.href` を再導入しないでください（Next.jsのSPA遷移が破壊され、白画面リロードになるため）。

---

## 6. 詳細情報がどのファイルにあるか
本ディレクトリ（`_migration_to_claude/`）内の各ファイルに詳細が記録されています。

- **プロジェクトの全体像・目的・対象ユーザー**:
  👉 [`00_PROJECT_CONTEXT.md`](file:///c:/Users/kyosh/reimburse/_migration_to_claude/00_PROJECT_CONTEXT.md)
- **現在の実装状況・正常稼働部分・留意事項**:
  👉 [`01_CURRENT_STATE.md`](file:///c:/Users/kyosh/reimburse/_migration_to_claude/01_CURRENT_STATE.md)
- **過去の決定経緯・ユーザー指示履歴・仕様変更**:
  👉 [`02_HISTORY_AND_DECISIONS.md`](file:///c:/Users/kyosh/reimburse/_migration_to_claude/02_HISTORY_AND_DECISIONS.md)
- **未確定事項・保留事項・TODO**:
  👉 [`03_PENDING_AND_UNRESOLVED.md`](file:///c:/Users/kyosh/reimburse/_migration_to_claude/03_PENDING_AND_UNRESOLVED.md)
- **技術スタック・コマンド・環境変数一覧**:
  👉 [`04_TECHNICAL_CONTEXT.md`](file:///c:/Users/kyosh/reimburse/_migration_to_claude/04_TECHNICAL_CONTEXT.md)
- **重要ファイルインデックス**:
  👉 [`05_FILE_INDEX.md`](file:///c:/Users/kyosh/reimburse/_migration_to_claude/05_FILE_INDEX.md)
