# 改修影響分析: 復元〜保存までのUX向上（仕事名の引き継ぎ・復元時刻の表示）

## メタ情報

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-02-13 |
| 対象要件 | 仕事を再開してから仕事を保存するまでのUX向上。復元した仕事名を保存フォームのデフォルトにし、復元した時刻を表示する。 |
| ステータス | ✅ 実装完了（2026-02-13） |

---

## 1. 新規要件の要約

- **仕事名の引き継ぎ**: 復元したイベントのタイトルを、保存フォームの「仕事名」の初期値とする。ユーザーはそのまま保存するか、編集してから保存できる。
- **復元時刻の表示**: 復元ボタンを押した時刻を、保存セクション内に「復元した時刻: YYYY-MM-DD HH:mm」のように表示する。
- **クリア**: 保存が成功したら、復元関連のストレージ（lastRestoredEventId, lastRestoredAtTime, lastRestoredWorkTitle）をクリアする。

---

## 2. 影響範囲一覧

### 2.1 User Stories

| ファイル | 影響内容 |
|----------|----------|
| `aidlc-docs/story-artifacts/user_stories.md` | US-3: 受け入れ基準に「復元直後の場合は、保存フォームの仕事名が復元した仕事名で初期表示され、必要に応じて変更して保存できる」を追加。US-5: 受け入れ基準に「復元後、サイドパネルの保存セクションに復元した時刻が表示され、保存フォームの仕事名は復元した仕事名がデフォルトで入る」を追加。 |

### 2.2 要件資料（requirements）

| ファイル | 影響内容 |
|----------|----------|
| `aidlc-docs/requirements/intent_clarification_questions.md` | 復元〜保存のUX（仕事名引き継ぎ・復元時刻表示）の意図を追記（任意・軽微）。 |
| `aidlc-docs/requirements/nfrs.md` | 6.3 UX要件に「復元後の保存フォームで、復元した仕事名をデフォルト表示し、復元した時刻を表示する」を追記。 |
| `aidlc-docs/requirements/prfaq.md` | 使い方のFAQに「復元したあと、保存するときの仕事名は？」「復元した時刻はどこで見る？」を追加。 |
| `aidlc-docs/requirements/measurement_criteria.md` | **変更なし**。 |
| `aidlc-docs/requirements/risks.md` | **変更なし**。 |

### 2.3 Unit 定義

| ファイル | 影響内容 |
|----------|----------|
| `aidlc-docs/design-artifacts/units/unit-04-restore.md` | 出力に「復元した仕事のタイトル（保存フォームのデフォルト値用）」を追加。Restore Service の戻り値に title を含める旨を記載。 |
| `aidlc-docs/design-artifacts/units/unit-05-ui-ux.md` | Save Form Component の責任に「復元セッション時の仕事名の初期表示」「復元した時刻の表示」を追加。 |

### 2.4 ドメインモデル

| ファイル | 影響内容 |
|----------|----------|
| （該当なし） | **変更なし**。既存の WorkState / メタデータで足りる。 |

### 2.5 論理設計

| ファイル | 影響内容 |
|----------|----------|
| `aidlc-docs/design-artifacts/logical-designs/unit-04-restore_logical_design.md` | 復元フローの戻り値に title を追加するシーケンスを追記。 |
| `aidlc-docs/design-artifacts/logical-designs/unit-05-ui-ux_logical_design.md` | 保存フォームの初期化フロー（復元セッション情報の読み取り・表示・クリア）を追記。 |

### 2.6 ADR

| ファイル | 影響内容 |
|----------|----------|
| （新規または既存ADR） | 「復元セッション情報（lastRestoredWorkTitle, lastRestoredAtTime）を Chrome Storage に保持し、保存フォームに反映する」方針を記録。必要に応じて新規 ADR または既存 ADR に追記。 |

### 2.7 実装（FRONTEND）

| ファイル | 影響内容 |
|----------|----------|
| `FRONTEND/src/application/services/restore-service.ts` | `restoreWorkState` の戻り値に `title: workState.title.value` を追加。 |
| `FRONTEND/src/application/services/optimized-restore-service.ts` | 戻り値の型と伝搬を `{ windowId, tabIds, title }` に更新。 |
| `FRONTEND/background/service-worker.ts` | RESTORE_WORK_STATE: `chrome.storage.local.set` に `lastRestoredWorkTitle: result.title` を追加。SAVE_WORK_STATE: 保存成功時の `remove` に `lastRestoredWorkTitle` を追加。 |
| `FRONTEND/sidepanel/sidepanel.html` | 保存セクション内に「復元した時刻」表示用の要素（例: `id="restored-at-display"`）を追加。初期は非表示。 |
| `FRONTEND/sidepanel/sidepanel.ts` | `applyLastRestoredSession()` を実装。`chrome.storage.local.get` で lastRestored* を取得し、仕事名の初期値と復元時刻表示を更新。`updateUIForAuthStatus` と保存成功後・`chrome.storage.onChanged` で呼び出す。 |
| テスト | RestoreService / OptimizedRestoreService の戻り値に title が含まれることのテストを追加・更新。必要に応じて sidepanel のストレージ連携のテストを追加。 |

---

## 3. 修正の順序（ウォーターフォール）

1. **レイヤー1**: `user_stories.md` の更新  
2. **レイヤー2**: `requirements/intent_clarification_questions.md`, `nfrs.md`, `prfaq.md` の更新（measurement_criteria, risks は変更なし）  
3. **レイヤー3**: `units/unit-04-restore.md`, `units/unit-05-ui-ux.md` の更新  
4. **レイヤー4**: ドメインモデルは変更なし  
5. **レイヤー5**: `unit-04-restore_logical_design.md`, `unit-05-ui-ux_logical_design.md` の更新  
6. **レイヤー6**: ADR の追加・更新（必要に応じて）  
7. **レイヤー7**: 実装（RestoreService → OptimizedRestoreService → service-worker → sidepanel HTML/TS）およびテスト  

---

## 4. 破壊的変更・リスク

- **破壊的変更**: なし。RestoreService の戻り値にプロパティを追加するだけであり、既存の呼び出し元は `result.title` を使わなければ従来どおり動作する。
- **リスク**: 
  - Chrome Storage のキーが 1 つ増える（lastRestoredWorkTitle）。既存の lastRestoredEventId / lastRestoredAtTime と同時にクリアするため、一貫性は維持される。
  - 復元した仕事名をそのまま表示するため、長いタイトルや特殊文字は既存の入力欄の maxlength（200）とサニタイズで扱う。

---

## 5. 承認後の次のアクション

- ユーザーの承認後、上記ウォーターフォール順でレイヤー1〜6 のアーティファクトを更新する。
- 続けてレイヤー7（実装・テスト）を実施する。
- 実装完了後、`@aidlc-code-generation` で該当 Unit のテスト不足があれば補完するか、手動でテストを追加する。

---

**作成者**: Modification & Impact Analysis エージェント
