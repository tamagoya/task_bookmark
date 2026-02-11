# 改修計画: 全ウィンドウ保存・保存後は新規ウィンドウで1タブ表示

## 概要

保存対象を「現在のChromeウィンドウのタブ」から「**全てのChromeウィンドウのタブ**」に変更し、保存後に**全てのタブを閉じたうえで、新しいタブを1つ開いた新規ウィンドウ**を表示する仕様に変更します。これにより、複数ウィンドウで仕事をしているユーザーが一括で状態を保存し、すぐにタスクブックマークを開いて別の仕事に移れるようにします。

## 新規要件の整理

| 項目 | 現行 | 変更後 |
|------|------|--------|
| 保存対象 | 現在開いているChromeウィンドウのタブのみ | **全てのChromeウィンドウで開いているタブ** |
| 保存後のタブ | 現在のウィンドウのタブを閉じる | **全ウィンドウの保存したタブを閉じる** |
| 保存後の画面 | （タブを閉じただけ） | **新しいウィンドウを開き、そのウィンドウには新しいタブを1つ表示する** |

**ビジネス価値**:
- 複数ウィンドウにまたがる仕事を1回の操作で保存できる
- 保存後すぐに「まっさらな1タブのウィンドウ」が開くため、タスクブックマークを開いて別の仕事を再開しやすい

**受け入れ基準**:
- [ ] サイドパネルで「保存」実行時、全Chromeウィンドウのタブが対象として取得・保存される
- [ ] タブ一覧表示時、全ウィンドウのタブが一覧表示される（または「現在のウィンドウ」と「全ウィンドウ」の切り替えが可能）
- [ ] 保存成功後、保存対象だった全ウィンドウのタブが閉じられる
- [ ] 保存成功後、新しいウィンドウが1つ開き、そのウィンドウには新しいタブが1つのみ開いている（about:newtab 等）
- [ ] 上記の一連処理におけるエラーハンドリングが適切である（保存失敗時はタブを閉じない／新規ウィンドウを開かない）

---

## アーティファクトの更新順序（ウォーターフォール）

| 順序 | レイヤー | パス | 対応 |
|------|----------|------|------|
| 1 | ストーリー | `aidlc-docs/story-artifacts/user_stories.md` | US-2, US-3 の受け入れ基準を「全ウィンドウ対象」「保存後は新規ウィンドウ1タブ」に合わせて更新 |
| 2 | 要件資料 | `aidlc-docs/requirements/` 以下 | 意図明確化・測定基準・NFR・PR/FAQ・リスクのうち影響するものを更新 |
| 3 | Unit定義 | `aidlc-docs/design-artifacts/units/unit-02-tab-capture.md` 等 | 責任範囲を「全ウィンドウのタブ取得」「全ウィンドウのタブを閉じる」「新規ウィンドウ作成」まで含むように更新 |
| 4 | ドメインモデル | `aidlc-docs/design-artifacts/domain-models/unit-02-tab-capture_domain_model.md` | イベントや値オブジェクトで「全ウィンドウ」を扱う場合の拡張を検討・記載 |
| 5 | 論理設計 | `aidlc-docs/design-artifacts/logical-designs/unit-02-tab-capture_logical_design.md` 等 | 全ウィンドウ取得・一括閉じ・新規ウィンドウ作成のフローを追加 |
| 6 | ADR | `aidlc-docs/design-artifacts/adrs/` | 全ウィンドウ保存・保存後新規ウィンドウの決定を記録するADRを追加 or 既存ADRを更新 |
| 7 | 実装 | `FRONTEND/` | アダプタ・サービス・Service Worker の修正とテスト追加 |

---

## ステップ1: 既存コンテキストの読み込み

- [x] `user_stories.md` の US-2, US-3 を確認
- [x] `requirements/` 一式を確認
- [x] Unit-02, Unit-03 の Unit 定義・ドメインモデル・論理設計を確認
- [x] `ChromeTabsAdapter`, `ChromeWindowsAdapter`, `TabCaptureService`, `service-worker.ts` の現行実装を確認

---

## ステップ2: 新規要件の分析と具体化

- **保存対象**: `chrome.tabs.query({})` で全タブ取得、または `chrome.windows.getAll()` で全ウィンドウを取得したうえで各ウィンドウのタブを取得。タブの順序は「ウィンドウID昇順・同一ウィンドウ内は index 昇順」などで一意に定義する。
- **表示**: 取得対象を「現在のウィンドウ」か「全ウィンドウ」に切り替え可能にするか、または常に「全ウィンドウ」で表示するかは要件で確定する（本計画では「保存時は常に全ウィンドウ」「一覧表示も全ウィンドウ」を前提に影響範囲を記載）。
- **保存後のタブを閉じる**: 保存時に取得した全タブの `tabId` を保持し、保存成功後に `chrome.tabs.remove(tabIds)` で一括閉じる。複数ウィンドウにまたがるため、`closeCurrentWindowTabs()` を拡張するか、新メソッド `closeAllCapturedTabs(tabIds: number[])` のような形で「保存対象だったタブのみ」を閉じる設計が安全。
- **新規ウィンドウ**: 既存の `ChromeWindowsAdapter.createWindow(urls?: string[])` を利用。`createWindow(['about:newtab'])` または `chrome://newtab` で「新しいタブ1つのウィンドウ」を開く。保存成功後かつ全タブを閉じた後に1回だけ呼ぶ。

---

## ステップ3: 影響範囲の特定（Impact Analysis）

### User Stories
- **US-2（現在のタブ状態の取得と表示）**: 「現在のウィンドウ」に加え、「全ウィンドウ」のタブを取得・表示する旨を追記。複数ウィンドウ時はウィンドウ単位のグループ表示やラベル表示を検討。
- **US-3（仕事状態の保存）**: 保存対象を「全ウィンドウのタブ」に変更。保存後の動作として「保存した全タブを閉じる」「新しいウィンドウを1つ開き、その中に新しいタブを1つ表示する」を追記。

### 要件資料（requirements）
- **intent_clarification_questions.md**: 利用シーンに「複数ウィンドウにまたがる仕事」を明記。保存対象が「全ウィンドウ」である旨を回答に追加。
- **measurement_criteria.md**: 保存対象が全ウィンドウになるため、タブ数や保存時間の目標値（例: 最大20タブ→複数ウィンドウ合計で増える可能性）を必要に応じて見直し。
- **nfrs.md**: タブ情報取得のレスポンス時間が「全ウィンドウ」で増える可能性があるため、「全ウィンドウのタブ取得は XXX ms 以内」など必要に応じて記載。
- **prfaq.md**: 「現在のタブ」から「すべてのウィンドウのタブ」に変わる旨、保存後に新規ウィンドウが1つ開く旨をPR/FAQに反映。
- **risks.md**: 全ウィンドウ対象によるタブ数増加（パフォーマンス・API制限）や、保存後に全タブを閉じることによる誤操作リスクを追記・軽減策を記載。

### Units
- **Unit-02（タブ状態キャプチャ）**: 責任範囲に「全ウィンドウのタブ取得」「保存対象タブの一括閉じ」「新規ウィンドウ＋1タブの作成」に係るインターフェースを追加。`getAllWindowsTabs()`, `closeTabsByIds(tabIds)`, および新規ウィンドウ作成の利用を定義。
- **Unit-03（Calendar API連携）**: 入力となるタブ情報が「全ウィンドウ分」になるだけのため、インターフェース変更は最小限。必要なら「タブ数上限」や注意事項を追記。

### Domain Models
- **unit-02-tab-capture_domain_model.md**: `TabsCaptured` で「全ウィンドウ」を表す場合の `windowId` の扱い（複数ウィンドウの場合は 0 や配列など）を定義。必要なら新イベントや拡張を記載。

### Logical Designs
- **unit-02-tab-capture_logical_design.md**: `getAllWindowsTabs()`、`closeAllCapturedTabs(tabIds)`、保存後の `createWindow(['about:newtab'])` のフローを追加。ChromeTabsAdapter / ChromeWindowsAdapter の新メソッドを記載。

### ADRs
- 新規 ADR: 「保存対象を全ウィンドウとする」「保存後に新規ウィンドウを1つ開き1タブのみ表示する」という決定と理由・代替案を記録。

### 実装（FRONTEND）
- **chrome-tabs-adapter.ts**: 全タブ取得 `getAllTabs(): Promise<chrome.tabs.Tab[]>` を追加（`chrome.tabs.query({})`）。
- **chrome-windows-adapter.ts**: 既存 `createWindow(urls?)` をそのまま利用。必要なら `createWindowWithSingleNewTab()` のようなラッパーを追加。
- **tab-capture-service.ts**: `getAllWindowsTabs()`, `closeAllCapturedTabs(tabIds: number[])` を追加。既存 `getCurrentWindowTabs` は一覧表示用に残すか、表示モードに応じて切り替え。
- **optimized-tab-capture-service.ts**: 上記メソッドのキャッシュ・監視の要否を検討し、必要なら委譲を追加。
- **background/service-worker.ts**: `SAVE_WORK_STATE` で `getAllWindowsTabs()` を使用し、保存成功後に `closeAllCapturedTabs(tabIds)` を実行し、続けて `createWindow(['about:newtab'])` を呼ぶ。
- **sidepanel**: タブ一覧取得で `GET_CURRENT_TABS` の代わりに「全ウィンドウ」用メッセージを送るか、既存メッセージの payload でモードを切り替える。UI に「全ウィンドウのタブを表示しています」などの説明を追加可能。
- **TabsCaptured イベント**: 全ウィンドウの場合は `windowId` を 0 にする、または既存のまま「メインウィンドウID」を渡すなど、ドメイン側のルールを決めて実装。
- **テスト**: 全ウィンドウ取得・一括閉じ・新規ウィンドウ作成のユニットテスト・統合テストを追加。既存テストの「現在のウィンドウ」前提を修正。

---

## ステップ4: 改修計画の策定

1. **要件・ストーリーの更新**: 上記ウォーターフォールの 1〜2 を実施し、仕様の一貫性を確保する。
2. **設計の更新**: 3〜6 を実施し、Unit・ドメイン・論理設計・ADR を更新する。
3. **実装**: 7 に従い、アダプタ → サービス → Service Worker → サイドパネルの順で実装し、テストを追加・更新する。
4. **検証**: 複数ウィンドウを開いた状態で保存→全タブが保存されること、保存後に全タブが閉じられ、新規ウィンドウに1タブだけが開くことを手動・自動で確認する。

---

## ステップ5: ユーザーへの提案と承認

- 上記の影響範囲と改修計画をユーザーに提示し、**ユーザーの承認を待つ**。承認後にステップ6（要件・設計のウォーターフォール更新）およびステップ7（実装）に進む。

---

**作成日**: 2026-02-11  
**ステータス**: ✅ 実装完了  
**承認日**: 2026-02-11  
**完了日**: 2026-02-11  
**作成者**: Modification & Impact Analysis エージェント

## 実装完了報告（2026-02-11）

- レイヤー1〜6: 要件・設計のウォーターフォール更新を実施
- レイヤー7: ChromeTabsAdapter.getAllTabs、TabCaptureService.getAllWindowsTabs / closeAllCapturedTabs、OptimizedTabCaptureService の拡張、Service Worker の GET_CURRENT_TABS / SAVE_WORK_STATE の変更、保存後の createWindow(['about:newtab']) を実装
- テスト: chrome-tabs-adapter.getAllTabs、tab-capture-service.getAllWindowsTabs / closeAllCapturedTabs のユニットテストを追加
- ビルド・全テスト（652件）成功
