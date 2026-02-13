# 改修影響分析: 保存後にサイドパネルを開いた状態にする

**日付**: 2026-02-13  
**新規要件**: 保存後に新しいタブが開くが、すぐに次のタスクに切り替えられるように、タスクブックマークのサイドパネルを開いた状態にしてほしい。

---

## 1. 要件の具体化

| 項目 | 内容 |
|------|------|
| 対象 | 仕事状態の保存が成功した直後のフロー（全タブ閉じ→新規ウィンドウ1タブ表示） |
| 追加動作 | 新規ウィンドウを作成したあと、そのウィンドウで `chrome.sidePanel.open({ windowId })` を呼び、サイドパネルを開いた状態にする |
| 目的 | 保存後すぐに次のタスクを選択したり、新規保存の入力を始められるようにする |
| 失敗時 | サイドパネルを開く処理が失敗しても保存は成功とする（ログのみ） |

---

## 2. 影響範囲一覧

| レイヤー | パス | 影響の有無 | 修正内容 |
|----------|------|------------|----------|
| ストーリー | `aidlc-docs/story-artifacts/user_stories.md` | あり | US-3 の受け入れ基準に「保存後の新規ウィンドウでサイドパネルが開いた状態になる」を追加 |
| 要件・意図 | `aidlc-docs/requirements/intent_clarification_questions.md` | あり | 保存後のUXとして「新規ウィンドウでサイドパネルを開いた状態にする」旨を追記 |
| 要件・測定 | `aidlc-docs/requirements/measurement_criteria.md` | なし | 変更なし |
| 要件・NFR | `aidlc-docs/requirements/nfrs.md` | あり | UX 要件に「保存後の新規ウィンドウでサイドパネルを自動表示する」を追記可能 |
| 要件・PR/FAQ | `aidlc-docs/requirements/prfaq.md` | あり | 保存後の操作（サイドパネルが自動で開く）を追記可能 |
| 要件・リスク | `aidlc-docs/requirements/risks.md` | なし | 変更なし |
| Unit定義 | `aidlc-docs/design-artifacts/units/unit-05-ui-ux.md` | あり | 責任範囲に「保存後新規ウィンドウでのサイドパネル自動表示」を追加 |
| Unit定義 | `aidlc-docs/design-artifacts/units/unit-02-tab-capture.md` | なし | 変更なし（createWindow の利用は既存どおり） |
| ドメインモデル | `aidlc-docs/design-artifacts/domain-models/` | なし | 変更なし |
| 論理設計 | `aidlc-docs/design-artifacts/logical-designs/unit-02-tab-capture_logical_design.md` または Service Worker 周り | あり | 保存フローに「createWindow 後に chrome.sidePanel.open を呼ぶ」を追記 |
| 論理設計 | `aidlc-docs/design-artifacts/logical-designs/unit-05-ui-ux_logical_design.md` | あり | 保存後サイドパネル自動表示のフローを追記可能 |
| ADR | `aidlc-docs/design-artifacts/adrs/` | あり | 「保存後に新規ウィンドウでサイドパネルを開く」決定を記録（ADR-027 拡張 or 新規） |
| 実装 | `FRONTEND/background/service-worker.ts` | あり | createWindow の戻り値を取得し、`chrome.sidePanel.open({ windowId })` を呼ぶ。失敗時はログのみ |
| テスト | `FRONTEND/` の service-worker 関連テスト | あり | 保存成功後に sidePanel.open が呼ばれることをモックで検証（存在する場合） |

---

## 3. 修正の順序（ウォーターフォール）

1. **レイヤー1**: `user_stories.md` の US-3 に受け入れ基準を1件追加  
2. **レイヤー2**: `intent_clarification_questions.md` / `nfrs.md` / `prfaq.md` を軽微に更新（該当箇所のみ）  
3. **レイヤー3**: `unit-05-ui-ux.md` の責任範囲に1行追加  
4. **レイヤー4**: ドメインモデルはスキップ  
5. **レイヤー5**: 論理設計（保存フロー・Unit-05）に「保存後サイドパネル自動表示」を追記  
6. **レイヤー6**: ADR-027 の拡張または小さい新規 ADR で「保存後サイドパネルを開く」を記録  
7. **レイヤー7**: `service-worker.ts` の修正とテスト追加  

---

## 4. 実装メモ（レイヤー7）

- `windowsAdapter.createWindow(['about:newtab'])` の戻り値を変数に格納する。
- `newWindow?.id` が存在するとき、`await chrome.sidePanel.open({ windowId: newWindow.id })` を try/catch で実行。catch 時は `logger.warn` のみ。
- 既存の `sendResponse({ success: true, eventId: eventId.value })` は、サイドパネル開く処理の成否に依存させない。

---

**作成者**: Modification & Impact Analysis エージェント
