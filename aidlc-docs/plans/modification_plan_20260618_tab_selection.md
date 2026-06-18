# Modification Plan: タブ選択保存・ウィンドウグループ化・一覧更新（2026-06-18）

## 概要

2026/06/18 のユーザーフィードバック（`request/20260618_feedback.md`）に基づき、保存・閉じる対象タブをユーザーが一覧から選択できる機能を追加する。ウィンドウ単位の一括選択と、タブ一覧の手動更新ボタンも提供する。

## 背景となる課題（フィードバック原文より）

- 仕事を保存せず割り込みタスクを行うと、保存時に関係ないタブまで混ざってしまう
- 保存して閉じる対象と無視する対象を、開いているタブ一覧から選びたい
- タブを1つずつ選ぶのは手間なので、ウィンドウ単位の一括チェック／一括解除が欲しい
- タブ一覧が最新でないため、最新化ボタンが欲しい

## 実行ステップ

- [x] **ステップ1**: 既存コンテキストの読み込み（US-2, US-3, Unit-02, Unit-05, 既存 FRONTEND 実装）
- [x] **ステップ2**: 新規要件の分析と具体化（`modification_analysis_20260618_tab_selection.md`）
- [x] **ステップ3**: 影響範囲の特定（Impact Analysis）
- [x] **ステップ4**: アーティファクト更新（ウォーターフォール: 1→3→5→6→7）
- [x] **ステップ5**: 実装（`FRONTEND/` 配下）
- [x] **ステップ6**: テスト実行・ビルド検証

## アーティファクト更新順序（ウォーターフォール）

| 順序 | レイヤー | 更新ファイル |
|------|----------|--------------|
| 1 | User Stories | `aidlc-docs/story-artifacts/user_stories.md`（US-2, US-3 追記） |
| 2 | 要件資料 | **変更なし**（`nfrs.md`, `risks.md` 等） |
| 3 | Unit 定義 | `unit-02-tab-capture.md`, `unit-05-ui-ux.md` |
| 4 | ドメインモデル | **変更なし**（`CapturedTabEntry` はアプリケーション層の DTO） |
| 5 | 論理設計 | `unit-02-tab-capture_logical_design.md`, `unit-05-ui-ux_logical_design.md` |
| 6 | ADR | `unit-05-ui-ux_adr-033-tab-selection-on-save.md` |
| 7 | 実装 | `FRONTEND/sidepanel/*`, `FRONTEND/background/service-worker.ts`, `FRONTEND/src/application/*` |

## 実装サマリ

| 領域 | 変更内容 |
|------|----------|
| サイドパネル UI | ウィンドウグループ表示、タブ／ウィンドウチェックボックス、更新ボタン、選択件数表示 |
| Service Worker | `GET_CURRENT_TABS` に `tabId`/`windowId` 追加、`SAVE_WORK_STATE` に `selectedTabIds` 対応 |
| アプリケーション層 | `getAllWindowsTabEntries()`, `CapturedTabEntry`, `filterEntriesBySelectedTabIds()` |

## 検証結果

- `npm run type-check`: 成功
- `npm run build`: 成功
- `npm test`: 770 tests passed

---

**作成日**: 2026-06-18  
**ステータス**: ✅ 完了  
**参照**: `modification_analysis_20260618_tab_selection.md`, `request/20260618_feedback.md`
