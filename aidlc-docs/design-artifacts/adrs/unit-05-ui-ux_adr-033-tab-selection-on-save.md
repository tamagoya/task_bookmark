# ADR-033: 保存時のタブ選択 UI と selectedTabIds によるフィルタ

## ステータス

Accepted（2026-06-18）

## コンテキスト

ユーザーフィードバック（2026-06-18）より、割り込みタスク用に開いたタブを保存対象から除外したいという要求があった。従来は全ウィンドウの全タブが保存・閉じる対象だった。

無視URL設定（US-10 / ADR-032）で URL パターン単位の除外は可能だが、**その時点の作業コンテキストに応じた ad-hoc な選択**には対応できない。

## 決定

1. **UI 層（サイドパネル）でタブ選択状態を管理**し、保存時に `selectedTabIds: number[]` を Service Worker へ渡す
2. **ウィンドウ単位のグループ表示**とウィンドウヘッダーチェックボックスで一括選択を提供
3. **更新ボタン**で `GET_CURRENT_TABS` を再実行し、選択状態は可能な限り維持
4. **アプリケーション層**に `CapturedTabEntry`（tabId, windowId, tabInfo）を導入し、選択フィルタを `filterEntriesBySelectedTabIds()` で実装
5. **ドメイン層の TabInfo は変更しない**（tabId/windowId は Chrome API 固有の識別子のため DTO に分離）

## 代替案

| 案 | 不採用理由 |
|----|------------|
| 保存前にモーダルで選択 | フィードバック UI イメージは常時表示の一覧＋チェックボックス |
| 無視URL の拡張のみ | ad-hoc な選択には不向き、設定の事前登録が必要 |
| TabInfo に tabId を追加 | ドメイン層が Chrome API に依存し、カレンダー保存 JSON に不要な ID が混入 |

## 適用順序（無視URLとの関係）

```
全タブ取得
  → ユーザー選択 (selectedTabIds)
  → ignoreOnSave / ignoreOnClose (IgnoreRulesService)
  → 保存 / 閉じる
```

## 結果

### ポジティブ

- 割り込みタスク用タブを残したまま、作業タブのみ保存できる
- ウィンドウ一括操作で選択 UX が向上
- 無視URL設定と独立して機能し、併用可能

### ネガティブ / トレードオフ

- サイドパネルの UI 複雑度が増加
- 選択状態はメモリ上のみ（サイドパネル再読み込みでリセット、初回は全選択）

## 関連

- US-2, US-3（2026-06-18 更新）
- ADR-032（無視URL設定）
- `modification_analysis_20260618_tab_selection.md`
