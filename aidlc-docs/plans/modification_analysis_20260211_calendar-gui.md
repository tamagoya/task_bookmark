# 改修影響分析: Google Calendar GUI 上の「復元」ボタン

**日付**: 2026-02-11  
**新規要件**: タスクブックマークの機能を Google Calendar の GUI 上でも利用できるようにする。タスクブックマークカレンダーの予定詳細に「復元」ボタンを表示し、押下でその予定の状態にブラウザを復元する。

---

## 1. 影響を受けるアーティファクト一覧

### 1.1 ストーリー（レイヤー1）

| ファイル | 影響内容 |
|----------|----------|
| `aidlc-docs/story-artifacts/user_stories.md` | US-5 の受け入れ基準に「Google Calendar の予定詳細から復元ボタンで復元できる」を追加。または新規 User Story「Google Calendar 上で予定詳細を開いたとき、復元ボタンでその状態を復元する」を追加。 |

### 1.2 要件資料（レイヤー2）

| ファイル | 影響の有無 | 影響内容 |
|----------|------------|----------|
| `requirements/intent_clarification_questions.md` | あり | 復元の導線として「Google Calendar の予定詳細からも利用可能」である旨を追記。 |
| `requirements/measurement_criteria.md` | 任意 | 復元の利用経路（サイドパネル / Calendar GUI）の測定を追記可能。 |
| `requirements/nfrs.md` | あり | Content Script の実行範囲（calendar.google.com）、host_permissions、CSP との整合を明記。 |
| `requirements/prfaq.md` | あり | 「カレンダー上の予定からも復元できる」旨を PR/FAQ に追加。 |
| `requirements/risks.md` | あり | 第三者サイト（calendar.google.com）の DOM 変更によるボタン表示不具合リスクと軽減策（セレクタの保守、フォールバック表示）を追記。 |

### 1.3 Unit定義（レイヤー3）

| ファイル | 影響内容 |
|----------|----------|
| `design-artifacts/units/unit-04-restore.md` | 復元の「呼び出し元」として Content Script（Calendar GUI）を追記。インターフェースは既存 RESTORE_WORK_STATE のまま。 |
| `design-artifacts/units/unit-05-ui-ux.md` | 責任範囲に「Google Calendar 上の復元ボタン（Content Script）」を追加。主要コンポーネントに「Calendar Event Detail Injector」等を追加。 |
| `design-artifacts/units/unit-03-calendar-api.md` | 説明欄 JSON に eventId を格納する場合のみ、スキーマ・保存処理の注記を追加。 |

### 1.4 ドメインモデル（レイヤー4）

| ファイル | 影響内容 |
|----------|----------|
| `design-artifacts/domain-models/unit-03-calendar-api_domain_model.md` | 説明欄 JSON に eventId を追加する場合のみ、WorkStateMetadata またはスキーマ説明を更新。変更なしでも可。 |

### 1.5 論理設計（レイヤー5）

| ファイル | 影響内容 |
|----------|----------|
| `design-artifacts/logical-designs/unit-04-restore_logical_design.md` | 復元トリガーとして「Content Script（Calendar 予定詳細）」を追加。メッセージフローに RESTORE_WORK_STATE の呼び出し元として言及。 |
| `design-artifacts/logical-designs/unit-05-ui-ux_logical_design.md` | Google Calendar 用 Content Script の責務・フロー（ページ検出→説明欄パース→ボタン注入→クリック→メッセージ送信）を追加。 |
| （任意）新規 `unit-05-content-script-calendar_logical_design.md` | Content Script 単体の論理設計（検出条件、eventId 取得、DOM 注入位置、エラーハンドリング）を記載。 |

### 1.6 ADR（レイヤー6）

| ファイル | 影響内容 |
|----------|----------|
| `design-artifacts/adrs/` | 新規 ADR: 「Google Calendar への UI 注入は Content Script で行う」ことを記録。説明欄に eventId を格納する方針を採用する場合はその理由・代替案も記録。 |

### 1.7 実装（レイヤー7）

| 対象 | 影響内容 |
|------|----------|
| `FRONTEND/manifest.json` | `content_scripts`: matches `["https://calendar.google.com/*"]`、js/css 指定。`host_permissions`: `https://calendar.google.com/*` を追加。 |
| `FRONTEND/` 新規 | Content Script 用の JS（例: `content-scripts/calendar-restore-button.ts`）および必要なら CSS。Vite で content script をビルドする設定を追加。 |
| `FRONTEND/vite.config.ts`（またはビルド設定） | content script のエントリをビルド出力に含める。 |
| `FRONTEND/src/application/services/calendar-event-service.ts` 等 | 説明欄 JSON に eventId を含める場合、イベント作成後に description を更新する、または初回保存時から eventId を書き込む。 |
| `FRONTEND/background/service-worker.ts` | 変更なし（RESTORE_WORK_STATE は既存のまま Content Script からも呼ばれる）。 |
| テスト | Content Script のユニットテスト（JSON パース、eventId 取得、メッセージ送信のモック）。DOM 依存部分はモックまたは E2E で検証。 |

---

## 2. 修正の順序（ウォーターフォール実行順）

1. **レイヤー1**: `user_stories.md` の US-5 拡張または新規ストーリー追加  
2. **レイヤー2**: `requirements/` の intent_clarification_questions, nfrs, prfaq, risks を更新（影響あるもののみ。measurement_criteria は任意）  
3. **レイヤー3**: `units/unit-04-restore.md`, `unit-05-ui-ux.md` を更新。必要なら `unit-03-calendar-api.md` にスキーマ注記  
4. **レイヤー4**: 説明欄に eventId を格納する場合のみ、該当ドメインモデルを更新  
5. **レイヤー5**: `logical-designs/unit-04-restore_logical_design.md`, `unit-05-ui-ux_logical_design.md` を更新。必要なら Content Script 専用の論理設計を新規作成  
6. **レイヤー6**: 新規 ADR を追加  
7. **レイヤー7**: manifest → 保存処理（eventId 格納）→ Content Script → テストの順で実装  

---

## 3. 破壊的変更（Breaking Changes）の有無

- **既存の復元フロー**: 変更なし。RESTORE_WORK_STATE の仕様はそのまま。呼び出し元がサイドパネルに加えて Content Script になるだけ。
- **説明欄スキーマ**: eventId を追加する場合は後方互換とする（既存イベントには eventId がなく、Content Script は eventId がない場合は URL/DOM からの取得にフォールバックするか、ボタンを出さないなどの方針を決める）。
- **Google Calendar の DOM**: 第三者サイトのため、Google の UI 変更でセレクタが壊れるリスクあり。軽減策としてセレクタの定数化・コメント、可能なら複数セレクタのフォールバックを検討。

---

## 4. 技術メモ（実装時の参照）

- **イベントID取得**: 推奨は「保存時に説明欄 JSON に eventId を格納し、Content Script は表示中の説明欄テキストをパースして eventId を取得」。Google Calendar の URL（eid パラメータ等）からの取得は補助とする。
- **ボタン配置**: 添付画像の要望どおり、予定のタイトル・日時の直下に配置。Google Calendar の月ビュー・週ビュー等でイベント詳細が開いたときの DOM 構造を実装時に確認し、セレクタを決定する。
- **認証**: 復元は既存と同様に Service Worker 側で authRepository.getCurrent() により calendarId / accessToken を取得。未認証時は Content Script 側でメッセージ応答の error を表示する。

---

## 5. 次のアクション

1. **ユーザーの承認**を待つ。  
2. 承認後、**ステップ6（要件・設計のウォーターフォール更新）** を実行する。  
3. 続けて **ステップ7（実装）** を実行するか、`@aidlc-code-generation` で該当 Unit のコード生成に進むかは、ユーザー指示に従う。

---

**作成日**: 2026-02-11  
**ステータス**: ✅ 実装完了  
**作成者**: Modification & Impact Analysis エージェント
