# 改修影響分析: 全ウィンドウ保存・保存後は新規ウィンドウで1タブ表示

**日付**: 2026-02-11  
**新規要件**: 保存対象を「全Chromeウィンドウのタブ」とし、保存後に全タブを閉じたうえで、新しいタブを1つ開いた新規ウィンドウを表示する。

---

## 1. 影響を受けるアーティファクト一覧

### 1.1 ストーリー（レイヤー1）

| ファイル | 影響内容 |
|----------|----------|
| `aidlc-docs/story-artifacts/user_stories.md` | US-2: 「現在のウィンドウ」に加え「全ウィンドウ」のタブを取得・表示する旨を追記。US-3: 保存対象を「全ウィンドウのタブ」に変更し、保存後の動作に「全タブを閉じる」「新規ウィンドウを1つ開き、新しいタブを1つ表示する」を追記。 |

### 1.2 要件資料（レイヤー2）

| ファイル | 影響の有無 | 影響内容 |
|----------|------------|----------|
| `requirements/intent_clarification_questions.md` | あり | 利用シーンに「複数ウィンドウにまたがる仕事」を追加。保存対象が「全ウィンドウのタブ」である旨を回答に追記。 |
| `requirements/measurement_criteria.md` | あり | 保存対象が全ウィンドウになるため、タブ数・保存時間の目標値や注意事項を必要に応じて追記。 |
| `requirements/nfrs.md` | あり | タブ情報取得の対象が「全ウィンドウ」になる場合のレスポンス時間・タブ数上限の記載を検討・追記。 |
| `requirements/prfaq.md` | あり | 保存対象が「すべてのウィンドウのタブ」であること、保存後に新規ウィンドウが1つ開くことをPR/FAQに反映。 |
| `requirements/risks.md` | あり | 全ウィンドウ対象によるタブ数増加（パフォーマンス・レート制限）、保存後に全タブを閉じる行為の誤操作リスクを追記し、軽減策を記載。 |

### 1.3 Unit定義（レイヤー3）

| ファイル | 影響内容 |
|----------|----------|
| `design-artifacts/units/unit-02-tab-capture.md` | 責任範囲に「全ウィンドウのタブ取得」「保存対象タブの一括閉じ（タブID指定）」「新規ウィンドウ＋1タブの作成」を追加。入出力・データフロー・主要メソッドを更新。 |
| `design-artifacts/units/unit-03-calendar-api.md` | 変更なし（入力タブ配列が全ウィンドウ分になるだけのため）。必要ならタブ数に関する注記を追記。 |

### 1.4 ドメインモデル（レイヤー4）

| ファイル | 影響内容 |
|----------|----------|
| `design-artifacts/domain-models/unit-02-tab-capture_domain_model.md` | `TabsCaptured` の `windowId` を「全ウィンドウ」の場合にどう扱うか（0 や optional など）を定義。必要なら新イベントや拡張を記載。 |

### 1.5 論理設計（レイヤー5）

| ファイル | 影響内容 |
|----------|----------|
| `design-artifacts/logical-designs/unit-02-tab-capture_logical_design.md` | `getAllWindowsTabs()`、`closeAllCapturedTabs(tabIds: number[])`、保存後の新規ウィンドウ作成のフローと、ChromeTabsAdapter / ChromeWindowsAdapter の新メソッドを追加。 |

### 1.6 ADR（レイヤー6）

| ファイル | 影響内容 |
|----------|----------|
| `design-artifacts/adrs/` | 新規 ADR を追加: 「保存対象を全ウィンドウとする」「保存後に新規ウィンドウを1つ開き1タブのみ表示する」という決定・理由・代替案・結果を記録。 |

### 1.7 実装（レイヤー7）

| 対象 | 影響内容 |
|------|----------|
| `FRONTEND/src/infrastructure/adapters/chrome-tabs-adapter.ts` | `getAllTabs(): Promise<chrome.tabs.Tab[]>` を追加（`chrome.tabs.query({})`）。 |
| `FRONTEND/src/infrastructure/adapters/chrome-windows-adapter.ts` | 既存 `createWindow(urls?)` を利用。必要なら `createWindowWithSingleNewTab()` のようなラッパーを追加。 |
| `FRONTEND/src/application/services/tab-capture-service.ts` | `getAllWindowsTabs(): Promise<TabInfo[]>`、`closeAllCapturedTabs(tabIds: number[]): Promise<void>` を追加。 |
| `FRONTEND/src/application/services/optimized-tab-capture-service.ts` | 上記メソッドの委譲を追加（キャッシュ・監視の要否を検討）。 |
| `FRONTEND/background/service-worker.ts` | `SAVE_WORK_STATE` で `getAllWindowsTabs()` を使用。保存成功後に `closeAllCapturedTabs(tabIds)`、続けて `createWindow(['about:newtab'])` を実行。 |
| `FRONTEND/sidepanel/` | タブ一覧取得を「全ウィンドウ」に対応（新メッセージまたは既存メッセージの拡張）。UIに説明を追加可能。 |
| `FRONTEND/src/domain/events/tabs-captured.ts` | 全ウィンドウ取得時の `windowId` の扱いを実装（0 または代表ウィンドウID）。 |
| テスト | 全ウィンドウ取得・一括閉じ・新規ウィンドウ作成のユニット・統合テストを追加。既存の「現在のウィンドウ」前提のテストを更新。 |

---

## 2. 修正の順序（ウォーターフォール実行順）

1. **レイヤー1**: `user_stories.md` の US-2, US-3 を更新  
2. **レイヤー2**: `requirements/` の intent_clarification_questions, measurement_criteria, nfrs, prfaq, risks を更新（影響あるもののみ）  
3. **レイヤー3**: `units/unit-02-tab-capture.md` を更新  
4. **レイヤー4**: `domain-models/unit-02-tab-capture_domain_model.md` を更新  
5. **レイヤー5**: `logical-designs/unit-02-tab-capture_logical_design.md` を更新  
6. **レイヤー6**: 新規 ADR を追加  
7. **レイヤー7**: 上記実装リストに従いコード修正・テスト追加  

---

## 3. 破壊的変更（Breaking Changes）の有無

- **既存の「現在のウィンドウのみ」の挙動**: 保存時は「常に全ウィンドウ」に変わるため、現在のウィンドウだけを保存したいユーザーにはオプション（設定やボタンで「現在のウィンドウのみ」を選べる）を将来検討する余地がある。本改修では「常に全ウィンドウ」を前提とする。
- **タブ一覧表示**: 全ウィンドウのタブを表示するため、表示内容・パフォーマンスが変わる。既存の「現在のウィンドウ」表示を残すか、全面「全ウィンドウ」にするかは仕様で確定する。
- **TabsCaptured の windowId**: 全ウィンドウの場合は単一の windowId で表現できないため、0 や「代表ウィンドウID」など、既存の検証ルールと整合するよう定義する必要がある。

---

## 4. 次のアクション

1. **ユーザーの承認**を待つ。  
2. 承認後、**ステップ6（要件・設計のウォーターフォール更新）** を実行する。  
3. 続けて **ステップ7（実装）** を実行するか、`@aidlc-code-generation` で該当 Unit のコード生成に進むかは、ユーザー指示に従う。

---

**作成日**: 2026-02-11  
**ステータス**: ✅ 実装完了  
**作成者**: Modification & Impact Analysis エージェント
