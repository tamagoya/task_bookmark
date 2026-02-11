# 改修分析: Google Calendar GUI「前のタスクへ」ボタン

**作成日**: 2026-02-11
**要件**: Google Calendar GUI 上で、restoredFrom の情報から「前のタスクへ」ボタンを表示し、クリックで前のカレンダー予定詳細に遷移する

---

## 新規要件の分析

### 機能概要
- タスクブックマークの JSON に `restoredFrom`（復元元のイベントID）が含まれる場合、Content Script が「前のタスクへ」ボタンを復元ボタンの横に表示する
- クリックすると、復元元の Google Calendar イベント詳細画面に遷移する

### 技術的実現方法
1. Content Script が説明欄 JSON の `restoredFrom` フィールドを検出
2. 「前のタスクへ」ボタンを注入
3. クリック時に Service Worker に `GET_EVENT_CALENDAR_URL` メッセージを送信（eventId を payload に含める）
4. Service Worker が calendarId を取得し、Google Calendar の予定詳細 URL（`/r/eventedit/<eid>`）を構築して返す
   - `eid` = base64url(`eventId calendarId`)
5. Content Script が返された URL に `window.location.href` で遷移

---

## 影響範囲の特定

### レイヤー 1: ストーリー
- **US-5（仕事状態の復元）**: 受け入れ基準に追加
- **US-7（仕事の前後関係の可視化）**: 受け入れ基準に追加

### レイヤー 2: 要件資料
- **intent_clarification_questions.md**: Q6 に追記（Google Calendar GUI 上での前後関係ナビゲーション）
- **nfrs.md**: Content Script の責任範囲に追記
- **prfaq.md**: 主要機能に追記
- **risks.md**: RISK-015 に追記
- **measurement_criteria.md**: 変更なし

### レイヤー 3: Unit 定義
- **unit-05-ui-ux.md**: Content Script コンポーネント（9番）に機能追加

### レイヤー 4: ドメインモデル
- 変更なし（`restoredFrom` は既存フィールド）

### レイヤー 5: 論理設計
- **unit-05-ui-ux_logical_design.md**: Content Script セクションに「前のタスクへ」のフロー追加

### レイヤー 6: ADR
- **ADR-028**: 「前のタスクへ」ナビゲーション機能の決定を追記

### レイヤー 7: 実装
- **content-scripts/calendar-restore-button.ts**: 「前のタスクへ」ボタンの注入ロジック追加
- **background/service-worker.ts**（またはメッセージハンドラ）: `GET_EVENT_CALENDAR_URL` ハンドラ追加
- **テスト**: Content Script のユニットテスト追加

---

## 修正ファイル一覧（ウォーターフォール順）

| 順序 | ファイル | 修正内容 |
|------|---------|---------|
| 1 | `aidlc-docs/story-artifacts/user_stories.md` | US-5, US-7 に受け入れ基準追加 |
| 2a | `aidlc-docs/requirements/intent_clarification_questions.md` | Q6 回答に追記 |
| 2b | `aidlc-docs/requirements/nfrs.md` | Content Script CSP セクション更新 |
| 2c | `aidlc-docs/requirements/prfaq.md` | 主要機能に追記 |
| 2d | `aidlc-docs/requirements/risks.md` | RISK-015 に追記 |
| 2e | `aidlc-docs/requirements/measurement_criteria.md` | 変更なし |
| 3 | `aidlc-docs/design-artifacts/units/unit-05-ui-ux.md` | Content Script コンポーネント更新 |
| 4 | （ドメインモデル） | 変更なし |
| 5 | `aidlc-docs/design-artifacts/logical-designs/unit-05-ui-ux_logical_design.md` | Content Script フロー追加 |
| 6 | `aidlc-docs/design-artifacts/adrs/unit-05-ui-ux_adr-028-google-calendar-content-script.md` | 決定追記 |
| 7a | `FRONTEND/content-scripts/calendar-restore-button.ts` | 「前のタスクへ」ボタン実装 |
| 7b | `FRONTEND/background/service-worker.ts`（関連ハンドラ） | `GET_EVENT_CALENDAR_URL` ハンドラ追加 |
| 7c | テスト | 既存テスト 659 件はすべてパス。Content Script 単体テストは未追加（既存方針に合わせ任意） |
