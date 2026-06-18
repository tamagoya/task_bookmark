# Modification Analysis: タブ選択保存・ウィンドウグループ化・一覧更新（2026-06-18）

## メタ情報

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-06-18 |
| 対象要件 | 保存・閉じる対象タブの選択、ウィンドウ単位一括選択、タブ一覧の手動更新 |
| ステータス | ✅ 実装完了 |
| 参照 | `request/20260618_feedback.md`, `request/20260618_UI_image.png` |

---

## 1. 新規要件の要約

### 1.1 ユーザーフィードバック原文

> 仕事を保存せず、割り込みタスクを行ってしまっとき、データが混ざるので保存して閉じる対象と、無視する対象を開いているタブ一覧から選べるようにしたい。  
> その時に、一つ一つのタブを選択するのは大変なので、ウィンド毎にグルーピングしていて、ウィンド単位で一括チェック、一括チェック外しができるようにしたい。  
> また、タブの一覧は最新ではないので、最新の開いている一覧を表示するよう、最新化ボタンがほしい。

### 1.2 解決方針

| 要件 | 解決策 |
|------|--------|
| 保存・閉じる対象の選択 | 各タブにチェックボックス。チェックされたタブのみ `SAVE_WORK_STATE` の対象 |
| ウィンドウ一括操作 | ウィンドウヘッダーのチェックボックスで当該ウィンドウ内タブを一括 ON/OFF |
| 一覧の最新化 | 「現在のタブ」見出し横に更新ボタン。クリックで `GET_CURRENT_TABS` を再実行 |
| 無視URL設定との関係 | ユーザー選択 → 無視URLフィルタの順で適用（両立） |

---

## 2. 影響範囲一覧

### 2.1 User Stories

| ファイル | 影響内容 |
|----------|----------|
| `user_stories.md` | **US-2**: ウィンドウグループ表示、更新ボタン、選択件数表示を受け入れ基準に追加。**US-3**: 選択タブのみ保存・閉じる、未選択タブは残す、0件選択時バリデーションを追加。 |

### 2.2 要件資料（requirements）

| ファイル | 影響 |
|----------|------|
| `intent_clarification_questions.md` | **変更なし** |
| `nfrs.md` | **変更なし**（既存のタブ取得 500ms 要件内） |
| `prfaq.md` | **変更なし**（任意追記可） |
| `measurement_criteria.md` | **変更なし** |
| `risks.md` | **変更なし** |

### 2.3 Unit 定義

| ファイル | 影響内容 |
|----------|----------|
| `unit-02-tab-capture.md` | `getAllWindowsTabEntries()` 追加、`selectedTabIds` によるフィルタ、保存・閉じる対象の絞り込み |
| `unit-05-ui-ux.md` | Tab List Component にチェックボックス、ウィンドウグループ、更新ボタンを追加 |

### 2.4 ドメインモデル

| ファイル | 影響 |
|----------|------|
| ドメイン層 | **変更なし**。`TabInfo` は不変のまま。`CapturedTabEntry` はアプリケーション層 DTO として新設。 |

### 2.5 論理設計

| ファイル | 影響内容 |
|----------|----------|
| `unit-02-tab-capture_logical_design.md` | `getAllWindowsTabEntries`, `filterEntriesBySelectedTabIds`, 保存フローのシーケンス更新 |
| `unit-05-ui-ux_logical_design.md` | Tab List Component の UI フロー、選択状態管理、更新ボタン |

### 2.6 ADR

| ファイル | 内容 |
|----------|------|
| `unit-05-ui-ux_adr-033-tab-selection-on-save.md` | タブ選択を UI 層で管理し `selectedTabIds` で Service Worker に渡す設計判断 |

### 2.7 実装

| ファイル | 変更内容 |
|----------|----------|
| `FRONTEND/sidepanel/sidepanel.html` | 更新ボタン、選択件数表示 |
| `FRONTEND/sidepanel/sidepanel.css` | ウィンドウグループ、チェックボックス、更新ボタンスタイル |
| `FRONTEND/sidepanel/sidepanel.ts` | 選択状態管理、グループ描画、保存時 `selectedTabIds` 送信 |
| `FRONTEND/background/service-worker.ts` | `GET_CURRENT_TABS` / `SAVE_WORK_STATE` 拡張 |
| `FRONTEND/src/application/services/tab-capture-service.ts` | `getAllWindowsTabEntries()` |
| `FRONTEND/src/application/types/captured-tab-entry.ts` | DTO とフィルタユーティリティ |
| `FRONTEND/tests/application/types/captured-tab-entry.test.ts` | ユニットテスト |
| `FRONTEND/tests/application/services/tab-capture-service.test.ts` | `getAllWindowsTabEntries` テスト |

---

## 3. データフロー

```
[サイドパネル]
  loadCurrentTabs() → GET_CURRENT_TABS → tabId/windowId 付き一覧
  ユーザーがチェックボックス操作 → selectedTabIds (Set) 更新
  保存ボタン → SAVE_WORK_STATE { title, memo, selectedTabIds }

[Service Worker]
  getAllWindowsTabEntries()
  → filterEntriesBySelectedTabIds(entries, selectedTabIds)
  → extractTabsFromEntries()
  → ignoreRulesService.filterTabsForSave()   // 既存 US-10
  → ignoreRulesService.filterTabIdsForClose() // 既存 US-10
  → カレンダー保存 + 選択タブのみ閉じる
```

---

## 4. ビジネスルール

1. **デフォルト選択**: 初回表示時は全タブが選択状態
2. **更新時の選択維持**: 更新ボタン押下時、既存タブの選択状態を維持。新規タブは選択 ON
3. **0件選択**: 保存ボタン押下時、選択 0 件ならバリデーションエラー（保存しない）
4. **未選択タブ**: 保存対象外かつ閉じない（割り込みタスク用タブを残す）
5. **無視URLとの優先順**: ユーザー選択 → 無視URLルール（選択されたタブのうち ignoreOnSave/ignoreOnClose が適用）

---

## 5. 非機能・セキュリティ

- **XSS**: タブタイトル・URL は `textContent` で表示（既存方針維持）
- **パフォーマンス**: タブ取得は既存 `getAllWindowsTabs` と同等（キャッシュなし）
- **アクセシビリティ**: チェックボックスに `aria-label`、更新ボタンに `aria-label` / `title`

---

## 6. テスト

| テスト | 内容 |
|--------|------|
| `captured-tab-entry.test.ts` | `filterEntriesBySelectedTabIds`, `extractTabsFromEntries` |
| `tab-capture-service.test.ts` | `getAllWindowsTabEntries` の tabId/windowId 返却、TabInfo 失敗時の扱い |
| 手動検証 | 複数ウィンドウ、部分選択保存、更新ボタン、ウィンドウ一括選択 |

---

**作成者**: Modification & Impact Analysis エージェント  
**最終更新**: 2026-06-18
