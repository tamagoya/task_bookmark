# 改修計画: 復元〜保存までのUX向上（仕事名の引き継ぎ・復元時刻の表示）

## 概要

仕事を再開してから仕事を保存するまでのUXを向上します。
- **仕事名の引き継ぎ**: 復元した仕事の名前を、保存フォームの仕事名のデフォルト値とする。保存時に別の名前に変更することも可能。
- **復元時刻の表示**: 復元を押した時刻をサイドパネルに表示し、いつから作業を開始したかを分かりやすくする。

## 新規要件の整理

| 項目 | 内容 |
|------|------|
| 対象 | サイドパネルの保存フォーム（復元後に保存するユースケース） |
| 仕事名 | 復元時に取得したイベントのタイトルを、保存フォームの「仕事名」の初期値として表示。ユーザーはそのまま保存するか、編集してから保存可能。 |
| 復元時刻 | 復元ボタンを押した時刻を、保存セクション内に「復元した時刻: YYYY-MM-DD HH:mm」のように表示。 |
| クリア条件 | 保存が成功したら、上記のデフォルト値と復元時刻表示に使っているストレージをクリアし、次回からは通常の空フォームとする。 |

**ビジネス価値**
- 復元→作業→保存の流れで、毎回同じ仕事名を打ち直さずに済む。
- いつからその仕事を再開したかが一目で分かり、時間の見積もりや記録に役立つ。

**受け入れ基準**
- [ ] 復元実行後、サイドパネルの保存フォームを開くと、仕事名が復元したイベントのタイトルで初期表示される
- [ ] 仕事名は保存前に編集可能で、別の名前で保存できる
- [ ] 復元した時刻が保存セクション内に表示される（復元していない場合は非表示）
- [ ] 保存が成功すると、復元関連のストレージがクリアされ、次回表示時は空のフォーム・復元時刻非表示になる
- [ ] カレンダー予定詳細から復元した場合も、同様に仕事名・復元時刻が反映される

---

## アーティファクトの更新順序（ウォーターフォール）

| 順序 | レイヤー | パス | 対応 |
|------|----------|------|------|
| 1 | ストーリー | `aidlc-docs/story-artifacts/user_stories.md` | US-3 / US-5 に「復元後の保存で仕事名を引き継ぐ」「復元時刻を表示する」受け入れ基準を追加 |
| 2 | 要件資料 | `aidlc-docs/requirements/` 以下 | 意図明確化・NFR（UX）・PR/FAQ のうち影響するものを更新 |
| 3 | Unit定義 | `aidlc-docs/design-artifacts/units/` | Unit-4（復元）, Unit-5（UI/UX）の責任範囲・入出力を更新 |
| 4 | ドメインモデル | `aidlc-docs/design-artifacts/domain-models/` | 変更なし（既存の WorkState / メタデータで足りる） |
| 5 | 論理設計 | `aidlc-docs/design-artifacts/logical-designs/` | 復元フロー戻り値・保存フォーム初期化フローを追記 |
| 6 | ADR | `aidlc-docs/design-artifacts/adrs/` | 必要なら「復元セッション情報の保持と保存フォームへの反映」を追記 |
| 7 | 実装 | `FRONTEND/` | 復元戻り値に title 追加、storage に lastRestoredWorkTitle 追加、サイドパネルで初期値・復元時刻表示・クリア処理 |

---

## ステップ1: 既存コンテキストの読み込み

- [ ] `user_stories.md` の US-3（保存）, US-5（復元）を確認
- [ ] `requirements/` 一式を確認
- [ ] Unit-4, Unit-5 の Unit 定義・論理設計を確認
- [ ] 復元フロー（RESTORE_WORK_STATE、RestoreService）と保存フロー（SAVE_WORK_STATE、lastRestored* の利用）を確認
- [ ] サイドパネル（保存フォーム、updateUIForAuthStatus）を確認

---

## ステップ2: 新規要件の分析と具体化

### 技術方針

1. **復元時のタイトル取得**  
   - 既存の `RestoreService.restoreWorkState` は内部で `workState` を取得している。戻り値に `title: workState.title.value` を追加する。  
   - `OptimizedRestoreService` はそのまま戻り値を伝搬する。

2. **Chrome Storage の拡張**  
   - 復元後にすでに `lastRestoredEventId` と `lastRestoredAtTime` を保存している。  
   - ここに `lastRestoredWorkTitle` を追加し、service-worker の RESTORE_WORK_STATE ハンドラで `result.title` を格納する。  
   - 保存成功時のクリア対象に `lastRestoredWorkTitle` を含める。

3. **サイドパネル**  
   - 認証済み表示時に `chrome.storage.local.get(['lastRestoredEventId','lastRestoredAtTime','lastRestoredWorkTitle'])` で取得。  
   - 値がある場合: 仕事名入力に `lastRestoredWorkTitle` を初期表示し、「復元した時刻」要素に `lastRestoredAtTime` をフォーマットして表示。  
   - 値がない場合: 復元時刻ブロックは非表示、仕事名は空。  
   - 保存成功後は `form.reset()` に加え、上記ストレージが service-worker 側でクリアされるため、再度ストレージを読んで UI を更新（復元時刻非表示・デフォルト仕事名なし）。  
   - `chrome.storage.onChanged` で lastRestored* の変更を購読し、他タブ/カレンダーから復元した場合も表示を更新する。

4. **HTML**  
   - 保存セクション内に「復元した時刻: YYYY-MM-DD HH:mm」用の要素を追加（初期は非表示）。  
   - 表示時は `textContent` で設定し XSS を防ぐ。

---

## ステップ3: 影響範囲の特定（Impact Analysis）

詳細は `modification_analysis_20260213_restore_save_ux.md` に記載する。

### User Stories
- **US-3（仕事状態の保存）**: 受け入れ基準に「復元直後の場合は、保存フォームの仕事名が復元した仕事名で初期表示され、必要に応じて変更して保存できる」を追加。
- **US-5（仕事状態の復元）**: 受け入れ基準に「復元後、サイドパネルに復元した時刻が表示され、保存フォームの仕事名は復元した仕事名がデフォルトで入る」を追加。

### 要件資料
- **intent_clarification_questions.md**: 復元〜保存のUX（仕事名引き継ぎ・復元時刻表示）の意図を追記可能。
- **nfrs.md**: UX 要件に「復元後の保存フォームで仕事名を引き継ぎ、復元時刻を表示する」を追記可能。
- **prfaq.md**: 使い方の Q&A に「復元したあと、保存するときの仕事名は？」「復元した時刻はどこで見る？」を追加可能。
- **measurement_criteria.md**: 変更なし。
- **risks.md**: 変更なし。

### Units
- **Unit-4（状態復元）**: 復元 API の戻り値に `title` を追加する旨を記載。
- **Unit-5（UI/UX）**: 保存フォームの「復元セッションからの初期値」と「復元した時刻の表示」を責任範囲に追加。

### Domain Models / ADR
- ドメインモデル: 変更なし。
- ADR: 復元セッション情報を Chrome Storage に保持し、保存フォームに反映する方針を記録する場合は新規または既存 ADR に追記。

### 実装
- **RestoreService** / **OptimizedRestoreService**: 戻り値に `title` を追加。
- **background/service-worker.ts**: RESTORE_WORK_STATE で `lastRestoredWorkTitle` を set。SAVE_WORK_STATE のクリアに `lastRestoredWorkTitle` を追加。
- **sidepanel**: 保存セクションに復元時刻表示要素を追加。`applyLastRestoredSession()` を実装し、認証済み表示時・保存成功後・storage 変更時に呼ぶ。`chrome.storage.onChanged` の購読を追加。
- **sidepanel.html**: 復元した時刻表示用の要素を追加。

---

## ステップ4: 改修計画の策定

1. **要件・ストーリーの更新**: ウォーターフォールの 1〜2 を実施する。  
2. **設計の更新**: 3〜6 を実施し、Unit・論理設計・必要に応じて ADR を更新する。  
3. **実装**: 7 に従い、RestoreService 戻り値 → service-worker の storage 拡張 → サイドパネル（HTML・TS）の順で実装し、テストを追加・更新する。  
4. **検証**: 復元後にサイドパネルで仕事名・復元時刻が表示されること、保存でクリアされること、カレンダーから復元した場合も同様であることを手動・自動で確認する。

---

## ステップ5: ユーザーへの提案と承認

上記の影響範囲と改修計画をユーザーに提示し、**ユーザーの承認を待つ**。承認後にステップ6（要件・設計のウォーターフォール更新）およびステップ7（実装）に進む。

---

**作成日**: 2026-02-13  
**ステータス**: ✅ 実装完了  
**承認日**: 2026-02-13  
**完了日**: 2026-02-13  

## 実装完了報告（2026-02-13）

- **レイヤー1**: user_stories.md に US-3（復元直後の保存フォームで仕事名を引き継ぐ）、US-5（復元後の復元時刻表示・仕事名デフォルト）を追加
- **レイヤー2**: intent_clarification_questions.md, nfrs.md, prfaq.md（Q6a, Q6b）を更新
- **レイヤー3**: unit-04-restore.md（出力に title 追加）、unit-05-ui-ux.md（Save Form の責任に復元セッション表示を追加）
- **レイヤー5**: unit-04-restore_logical_design.md（戻り値に title）、unit-05-ui-ux_logical_design.md（保存フォーム初期表示フロー）を更新
- **レイヤー6**: unit-05-ui-ux_adr-029-restore-session-save-form.md を新規作成
- **レイヤー7**:
  - RestoreService.restoreWorkState の戻り値に `title: workState.title.value` を追加
  - OptimizedRestoreService の戻り型に `title: string` を追加
  - service-worker: RESTORE_WORK_STATE で `lastRestoredWorkTitle` を set、SAVE_WORK_STATE 成功時の remove に `lastRestoredWorkTitle` を追加
  - sidepanel.html: 保存セクションに「復元した時刻」表示要素（#restored-at-display）を追加
  - sidepanel.ts: applyLastRestoredSession()、formatRestoredAt() を実装。updateUIForAuthStatus と保存成功後・chrome.storage.onChanged で呼び出し
  - sidepanel.css: .restored-at-display のスタイルを追加
- **テスト**: restore-service.test.ts の期待値に title を追加。全 659 テスト成功、type-check・build 成功
