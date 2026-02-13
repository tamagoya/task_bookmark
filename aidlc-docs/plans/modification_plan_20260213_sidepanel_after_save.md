# 改修計画: 保存後にサイドパネルを開いた状態にする

## 概要

保存成功後、新しいタブを1つ開いた新規ウィンドウが表示されるが、ユーザーがすぐに次のタスクに切り替えられるよう、**その新規ウィンドウでタスクブックマークのサイドパネルを自動で開いた状態にする**改修です。

## 新規要件の整理

| 項目 | 内容 |
|------|------|
| トリガー | 仕事状態の保存が成功した直後（既存: 全タブを閉じ→新規ウィンドウを1タブで表示） |
| 追加動作 | 新規ウィンドウを作成したあと、そのウィンドウに対して `chrome.sidePanel.open({ windowId })` を呼び、サイドパネルを開いた状態にする |
| 目的 | 保存後すぐに次のタスクを選んだり、新しい仕事を保存できるようにする（「すぐにタスクブックマークを開いて別の仕事を再開できる」の強化） |
| 失敗時 | サイドパネルを開く処理が失敗しても、保存は成功として扱い、レスポンスは `success: true` のまま返す（ログのみ記録） |

**ビジネス価値**
- US-3 の受け入れ基準「すぐにタスクブックマークを開いて別の仕事を再開できるようにする」を、アイコンクリックなしで実現する。
- 保存→新規ウィンドウ→即サイドパネル表示の一連の流れで、操作ステップを減らす。

**受け入れ基準**
- [ ] 保存成功後、新しいタブを1つ開いた新規ウィンドウが表示される（既存どおり）
- [ ] その新規ウィンドウで、タスクブックマークのサイドパネルが自動で開いた状態になる
- [ ] サイドパネルを開く処理が失敗した場合でも、保存は成功として扱われ、ユーザーには成功メッセージが返る

---

## アーティファクトの更新順序（ウォーターフォール）

| 順序 | レイヤー | パス | 対応 |
|------|----------|------|------|
| 1 | ストーリー | `aidlc-docs/story-artifacts/user_stories.md` | US-3 の受け入れ基準に「保存後の新規ウィンドウでサイドパネルが開いた状態になる」を追加 |
| 2 | 要件資料 | `aidlc-docs/requirements/` 以下 | 意図明確化・NFR（UX）・PR/FAQ のうち影響するものを軽微に更新 |
| 3 | Unit定義 | `aidlc-docs/design-artifacts/units/` | Unit-5（UI/UX）の責任範囲に「保存後新規ウィンドウでのサイドパネル自動表示」を追加。Unit-2 は変更なし（createWindow の戻り値利用は SW 側の責務） |
| 4 | ドメインモデル | `aidlc-docs/design-artifacts/domain-models/` | 変更なし |
| 5 | 論理設計 | `aidlc-docs/design-artifacts/logical-designs/` | 保存フロー（Service Worker）に「createWindow 後・sidePanel.open」を追記 |
| 6 | ADR | `aidlc-docs/design-artifacts/adrs/` | 必要なら「保存後に新規ウィンドウでサイドパネルを開く」決定を既存 ADR に追記 or 新規 ADR |
| 7 | 実装 | `FRONTEND/` | service-worker: createWindow の戻り値を取得し、`chrome.sidePanel.open({ windowId })` を呼ぶ。失敗時はログのみ |

---

## ステップ1: 既存コンテキストの読み込み

- [x] `user_stories.md` の US-3（保存）を確認
- [x] 保存後の処理（service-worker の SAVE_WORK_STATE、createWindow）を確認
- [x] `chrome.sidePanel.open` の既存利用（アイコンクリック時）を確認
- [ ] `requirements/` の該当箇所を確認
- [ ] Unit-2 / Unit-5 の論理設計を確認

---

## ステップ2: 新規要件の分析と具体化

### 技術方針

1. **保存成功後の処理（Service Worker）**
   - 現状: `windowsAdapter.createWindow(['about:newtab'])` の戻り値は未使用。
   - 変更: `const newWindow = await windowsAdapter.createWindow(['about:newtab'])` とし、`newWindow?.id` が存在する場合に `chrome.sidePanel.open({ windowId: newWindow.id })` を呼ぶ。
   - `chrome.sidePanel.open` は Promise を返す場合があるため、`await` し、try/catch で囲む。失敗時は `logger.warn` のみとし、`sendResponse({ success: true, ... })` には影響させない。

2. **権限・API**
   - 既に `sidePanel` 権限と `chrome.action.onClicked` で `chrome.sidePanel.open` を使用しているため、追加権限は不要。

3. **テスト**
   - Service Worker の SAVE_WORK_STATE ハンドラのテストで、createWindow 後に sidePanel.open が呼ばれること（および windowId が新規ウィンドウの ID であること）をモックで検証する。

---

## ステップ3: 影響範囲の特定（Impact Analysis）

詳細は `modification_analysis_20260213_sidepanel_after_save.md` に記載する。

### User Stories
- **US-3（仕事状態の保存）**: 受け入れ基準に「保存後の新規ウィンドウで、タスクブックマークのサイドパネルが開いた状態になる」を追加。

### 要件資料
- **intent_clarification_questions.md**: 「保存後は新規ウィンドウでサイドパネルを開いた状態にし、すぐに次のタスクに切り替えられるようにする」旨を追記可能。
- **nfrs.md**: UX 要件に「保存後の新規ウィンドウでサイドパネルを自動表示する」を追記可能。
- **prfaq.md**: 「保存したあと、次のタスクはどうやって選ぶ？」などに「保存後は自動でサイドパネルが開きます」を追記可能。
- **measurement_criteria.md**: 変更なし。
- **risks.md**: 変更なし。

### Units
- **Unit-5（UI/UX）**: 責任範囲に「保存後に表示される新規ウィンドウでサイドパネルを自動で開く」を追加。
- **Unit-2（タブキャプチャ）**: 変更なし（createWindow は既存どおり。サイドパネルを開くのは Service Worker / UI 責務）。

### Domain Models / Logical Designs / ADR
- ドメインモデル: 変更なし。
- 論理設計: 保存フロー（unit-02 または service-worker の記述）に「createWindow 後、chrome.sidePanel.open({ windowId }) を呼ぶ」を追記。
- ADR: 「保存後に新規ウィンドウでサイドパネルを開く」を記録（既存 ADR-027 の拡張 or 新規小さい ADR）。

### 実装
- **FRONTEND/background/service-worker.ts**: SAVE_WORK_STATE 内で、createWindow の戻り値を取得し、`newWindow?.id` がある場合に `chrome.sidePanel.open({ windowId: newWindow.id })` を呼ぶ。失敗時はログのみ。
- **テスト**: service-worker のメッセージハンドラをテストする場合、chrome.sidePanel.open のモックと、createWindow の戻り値（windowId）が渡されることを検証。

---

## ステップ4: 改修計画の策定

1. **要件・ストーリーの更新**: ウォーターフォールの 1〜2 を実施する。
2. **設計の更新**: 3〜6 を実施し、Unit-5・論理設計・必要に応じて ADR を更新する。
3. **実装**: 7 に従い、service-worker の修正とテスト追加を行う。
4. **検証**: 保存実行後、新規ウィンドウでサイドパネルが開いていることを手動確認する。

---

## ステップ5: ユーザーへの提案と承認

上記の影響範囲と改修計画をユーザーに提示し、**ユーザーの承認を待つ**。承認後にステップ6（要件・設計のウォーターフォール更新）およびステップ7（実装）に進む。

---

**作成日**: 2026-02-13  
**ステータス**: ✅ 実装完了  
**承認日**: 2026-02-13  
**完了日**: 2026-02-13  

## 実装完了報告（2026-02-13）

- **レイヤー1**: user_stories.md の US-3 に「保存成功後、その新規ウィンドウでタスクブックマークのサイドパネルが開いた状態になる」を追加
- **レイヤー2**: intent_clarification_questions.md（保存後のサイドパネル自動表示）、nfrs.md（UX要件）、prfaq.md（主要機能・Q2）を更新
- **レイヤー3**: unit-05-ui-ux.md の責任範囲に「保存後に表示される新規ウィンドウでサイドパネルを自動で開く」を追加
- **レイヤー5**: unit-02-tab-capture_logical_design.md（保存フローに sidePanel.open を追記）、unit-05-ui-ux_logical_design.md（Side Panel Container に保存後サイドパネル自動表示を追記）を更新
- **レイヤー6**: ADR-027 に決定4「保存成功後、その新規ウィンドウでタスクブックマークのサイドパネルを自動で開く」を追記
- **レイヤー7**: FRONTEND/background/service-worker.ts を修正。`chrome.sidePanel.open()` はユーザージェスチャー必須のため、既存ウィンドウ維持方式に変更: (1) `chrome.windows.getLastFocused()` でサイドパネル付きウィンドウを取得、(2) そのウィンドウに `chrome.tabs.create({ windowId, url: 'about:newtab' })` で新タブを先に作成、(3) `closeAllCapturedTabs(tabIds)` で保存済みタブを閉じ、新タブ+サイドパネルが残る。フォールバック: 維持失敗時は `createWindow(['about:newtab'])`
- **検証**: type-check 成功、全 659 テスト成功
