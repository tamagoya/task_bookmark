# 改修計画: Google Calendar GUI 上の「復元」ボタン

## 概要

タスクブックマークの復元機能を、サイドパネルに加えて **Google Calendar の予定詳細画面** からも利用できるようにします。タスクブックマークカレンダーの予定を開いたときに、イベント詳細（タイトル・日時の直下）に「復元」ボタンを表示し、クリックでその予定の状態にブラウザを復元します。

## 新規要件の整理

| 項目 | 内容 |
|------|------|
| 対象画面 | Google Calendar（calendar.google.com）の予定詳細表示 |
| 対象イベント | タスクブックマークカレンダーに保存されたイベント（説明欄に当拡張のJSONスキーマが含まれるもの） |
| UI | 予定のタイトル・日時の直下に「復元」ボタンを表示 |
| 動作 | ボタン押下で、その予定に紐づくタブ状態を新しいウィンドウに一括復元（既存の復元フローを再利用） |

**ビジネス価値**  
- カレンダー上で予定を眺めながら、その場でワンクリック復元できる  
- サイドパネルを開かずに、作業再開の導線を増やせる  

**受け入れ基準**  
- [ ] calendar.google.com でタスクブックマークの予定詳細を表示したとき、タイトル・日時の直下に「復元」ボタンが表示される  
- [ ] 「復元」クリックで、その予定のタブ状態が新しいウィンドウに復元される  
- [ ] 復元時は既存と同様に復元メタデータ（復元元・復元先）が記録される  
- [ ] 当拡張のJSONを含まない一般の予定には「復元」ボタンは表示されない  
- [ ] 未認証時や取得失敗時は適切なメッセージを表示する  

---

## アーティファクトの更新順序（ウォーターフォール）

| 順序 | レイヤー | パス | 対応 |
|------|----------|------|------|
| 1 | ストーリー | `aidlc-docs/story-artifacts/user_stories.md` | 復元の導線として「Google Calendar 予定詳細からの復元」を追加（US-5 拡張 or 新規ストーリー） |
| 2 | 要件資料 | `aidlc-docs/requirements/` 以下 | 意図明確化・測定基準・NFR・PR/FAQ・リスクのうち影響するものを更新 |
| 3 | Unit定義 | `aidlc-docs/design-artifacts/units/` | Unit-4（復元）, Unit-5（UI/UX）の責任範囲に「Calendar コンテンツスクリプト」を追加；必要なら新規 Unit（Calendar GUI 連携）を検討 |
| 4 | ドメインモデル | `aidlc-docs/design-artifacts/domain-models/` | 変更なし or 説明欄スキーマに eventId を含める場合のみ軽微に追記 |
| 5 | 論理設計 | `aidlc-docs/design-artifacts/logical-designs/` | コンテンツスクリプトのフロー（検出→ボタン注入→メッセージ→既存復元）を追加 |
| 6 | ADR | `aidlc-docs/design-artifacts/adrs/` | 「Google Calendar への UI 注入は content_scripts で行う」「説明欄に eventId を格納する」等の決定を記録 |
| 7 | 実装 | `FRONTEND/` | manifest の content_scripts / host_permissions、コンテンツスクリプト、必要に応じた説明欄スキーマ拡張と既存復元の呼び出し |

---

## ステップ1: 既存コンテキストの読み込み

- [x] `user_stories.md` の US-5（復元）を確認
- [x] `requirements/` 一式を確認
- [x] Unit-3, Unit-4, Unit-5 の Unit 定義・論理設計を確認
- [x] 既存の復元フロー（RESTORE_WORK_STATE、RestoreService）を確認
- [x] manifest.json（content_scripts 未設定）を確認

---

## ステップ2: 新規要件の分析と具体化

### 技術方針

1. **Content Script の導入**  
   - `https://calendar.google.com/*` に content script を注入する。  
   - manifest に `content_scripts` と `host_permissions`（`https://calendar.google.com/*`）を追加する。

2. **タスクブックマーク予定の検出**  
   - 予定詳細の説明欄（description）に、当拡張の JSON スキーマ（`"version"`, `"tabs"` 等）が含まれるかを判定する。  
   - 含まれる場合のみ「復元」ボタンを表示する。

3. **イベントIDの取得**  
   - **推奨**: 保存時にイベント説明欄の JSON に `eventId` を格納する（スキーマ拡張）。表示時にその JSON をパースして eventId を取得する。  
   - **代替**: Google Calendar の URL や DOM から eid 等を取得する方法は、Google の仕様変更に弱いため、補助とする。

4. **復元の実行**  
   - コンテンツスクリプトは「復元」クリック時に `chrome.runtime.sendMessage` で既存の `RESTORE_WORK_STATE` を呼び出す（payload: `{ eventId }`）。  
   - 認証・calendarId・復元処理・メタデータ記録は既存の Service Worker 側の実装をそのまま利用する。

5. **UI 注入位置**  
   - 添付画像の要望どおり、予定のタイトル・日時の直下に「復元」ボタンを挿入する。  
   - Google Calendar の DOM 構造に依存するため、セレクタは実装時に特定し、変更に備えて保守しやすいようコメント・定数化する。

---

## ステップ3: 影響範囲の特定（Impact Analysis）

### User Stories

- **US-5（仕事状態の復元）**: 受け入れ基準に「Google Calendar の予定詳細から復元ボタンで復元できる」を追加する。  
- または **新規ストーリー**: 「Google Calendar 上で予定詳細を開いたとき、復元ボタンでその状態を復元する」を追加。

### 要件資料（requirements）

- **intent_clarification_questions.md**: 「復元の導線はサイドパネルに加え、Google Calendar の予定詳細からも利用可能にする」旨を追記。  
- **measurement_criteria.md**: 復元の利用経路（サイドパネル / Calendar GUI）の割合を任意で測定する旨を追記可能。  
- **nfrs.md**: コンテンツスクリプトの実行範囲と CSP／ホスト権限を明記。  
- **prfaq.md**: 「カレンダー上の予定からも復元できる」旨を PR/FAQ に追加。  
- **risks.md**: 第三者サイト（calendar.google.com）の DOM 変更によるボタン表示不具合リスクと軽減策を追記。

### Units

- **Unit-4（状態復元）**: 復元の「呼び出し元」として Content Script（Calendar GUI）を追記。インターフェースは既存の `RESTORE_WORK_STATE` のまま。  
- **Unit-5（UI/UX）**: 責任範囲に「Google Calendar 上の復元ボタン（Content Script）」を追加。  
- **Unit-3（Calendar API）**: 説明欄に eventId を格納する場合、保存時のスキーマ拡張を定義。

### Domain Models

- 説明欄 JSON に `eventId` を追加する場合のみ、該当ドメインモデル／スキーマ説明を更新。

### Logical Designs

- **unit-04-restore_logical_design.md**: 復元のトリガーとして「Content Script（Calendar 予定詳細）」を追加。  
- **unit-05-ui-ux_logical_design.md**: Calendar 用 Content Script の責務・メッセージフローを追加。  
- 新規: **content-script calendar の論理設計**（フロー: ページ検出 → 説明欄パース → ボタン注入 → クリック → メッセージ送信）。

### ADRs

- 新規 ADR: Google Calendar への UI 注入を Content Script で行うこと、および説明欄に eventId を格納する方針（採用する場合）を記録。

### 実装（FRONTEND）

- **manifest.json**  
  - `content_scripts`: `matches: ["https://calendar.google.com/*"]`、対象 JS/CSS。  
  - `host_permissions`: `https://calendar.google.com/*` を追加。  
- **新規: content script**  
  - calendar.google.com 用の JS（と必要なら CSS）。  
  - 予定詳細の表示を検知し、説明欄からタスクブックマークの JSON を判定・パースして eventId を取得、ボタン注入・クリックで `RESTORE_WORK_STATE` 送信。  
- **保存処理（Unit-3 実装）**  
  - 説明欄 JSON に `eventId` を含める場合、イベント作成後に description を更新するか、初回保存時から eventId を含めた JSON を書き込む。  
- **既存復元フロー**  
  - 変更なし（RESTORE_WORK_STATE の仕様のまま利用）。  
- **テスト**  
  - コンテンツスクリプトのユニットテスト（JSON パース、eventId 取得、メッセージ送信のモック）。  
  - DOM 構造に依存する部分は可能な範囲でモックまたは E2E で検証。

---

## ステップ4: 改修計画の策定

1. **要件・ストーリーの更新**: 上記ウォーターフォールの 1〜2 を実施する。  
2. **設計の更新**: 3〜6 を実施し、Unit・論理設計・ADR を更新する。  
3. **実装**: 7 に従い、manifest → 説明欄スキーマ（必要なら）→ Content Script → 既存復元の呼び出し確認の順で実装し、テストを追加する。  
4. **検証**: calendar.google.com でタスクブックマークの予定を開き、「復元」が表示され、クリックで復元されることを手動・自動で確認する。

---

## ステップ5: ユーザーへの提案と承認

上記の影響範囲と改修計画をユーザーに提示し、**ユーザーの承認を待つ**。承認後にステップ6（要件・設計のウォーターフォール更新）およびステップ7（実装）に進む。

---

**作成日**: 2026-02-11  
**ステータス**: ✅ 実装完了  
**承認日**: 2026-02-11  
**完了日**: 2026-02-11  
**作成者**: Modification & Impact Analysis エージェント

## 実装完了報告（2026-02-11）

- **レイヤー1〜2**: ストーリー（US-5 に Calendar GUI 復元を追記）、要件資料（intent, nfrs, prfaq, risks）を更新
- **レイヤー3〜4**: Unit-3/4/5 の定義を更新、ドメインモデルは変更なし（説明欄に eventId は PATCH で追加）
- **レイヤー5〜6**: 論理設計（Unit-4, Unit-5）と ADR-028 を追加
- **レイヤー7**:  
  - manifest.json / manifest.json.template に `host_permissions`（calendar.google.com）と `content_scripts` を追加  
  - `content-scripts/calendar-restore-button.ts` を新規作成（説明欄 JSON から eventId 取得・復元ボタン注入・RESTORE_WORK_STATE 送信）  
  - Vite に content script のエントリを追加  
  - CalendarEventRepository に `patchDescriptionToIncludeEventId` を追加し、保存後に説明欄に eventId を PATCH  
  - CalendarEventService.createWorkStateEvent 内で上記 PATCH を呼び出し  
- **テスト**: リポジトリの patchDescriptionToIncludeEventId のユニットテスト、サービス側のモック追加と createWorkStateEvent で patch が呼ばれることの assertion を追加  
- ビルド・全テスト（659件）・verify:all 成功
