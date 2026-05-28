# Modification Plan: 無視URL設定機能の追加（2026-05-28）

## 概要
2026/05/28 のユーザーフィードバック（`request/20260528_feedback.md`）に基づき、ユーザーが「無視URL」を個別設定できる機能を追加する。各無視URLに対して、以下3つの動作を独立に有効化できる。

- **閉じる無視（Close-ignore）**: 保存時にタブを閉じない
- **保存無視（Save-ignore）**: WorkStateに含めない（カレンダーイベントへも記録しない）
- **復元無視（Restore-ignore）**: 復元時にこのURLは開かない（WorkStateとしてのデータは保持）

## 背景となる課題（フィードバック原文より）
- Google Meet 通話中に保存ボタンを押すと、通話タブが閉じられて通話が切断され、ミーティング中のタスク切り替えが困難
- ポータルページや Google Calendar の SPA URL など、情報量の少ないURLが保存されると、復元・一覧でノイズになる

## 利用例（フィードバック原文より）
- **Meet**: 部分一致パターン `meet.google.com` を「閉じる無視 + 復元無視」で登録
  - 通話継続可、保存はされる（どの Meet に参加していたかは履歴として残る）、復元では開かれない
- **ポータル**: 「閉じる無視」または「保存無視」で登録（ノイズ排除）

## 実行ステップ

- [x] **ステップ1**: 既存コンテキストの読み込み
- [x] **ステップ2**: 新規要件の分析と具体化（substring 一本化、3フラグ独立、`chrome.storage.local`、サイドパネル設定セクション）
- [x] **ステップ3**: 影響範囲の特定（Impact Analysis）
- [x] **ステップ4**: アーティファクト更新順序の明示（ウォーターフォール: 1→2a〜2e→3→4→5→6→7）
- [x] **ステップ5**: アーティファクト更新計画の策定（modification_analysis_20260528_url_filter.md）
- [x] **ステップ6**: ユーザーの承認を取得（2026-05-28、回答は分析書 §7・§9 参照）
- [x] **ステップ7**: 承認後、要件資料 → 設計ドキュメントの順で更新（レイヤー1〜6 完了、レイヤー7 実装は別コマンドで実施）

## アーティファクト更新順序（ウォーターフォール）
| 順序 | レイヤー | 想定更新ファイル |
|------|----------|------------------|
| 1 | User Stories | `aidlc-docs/story-artifacts/user_stories.md`（新規 US-10「無視URLの設定」など） |
| 2a | 意図明確化 | `aidlc-docs/requirements/intent_clarification_questions.md` |
| 2b | 測定基準 | `aidlc-docs/requirements/measurement_criteria.md` |
| 2c | 非機能要件 | `aidlc-docs/requirements/nfrs.md` |
| 2d | PR/FAQ | `aidlc-docs/requirements/prfaq.md` |
| 2e | リスク | `aidlc-docs/requirements/risks.md` |
| 3 | Unit 定義 | `unit-02-tab-capture.md`, `unit-04-restore.md`, `unit-05-ui-ux.md`、必要なら新規 `unit-07-url-filter.md` |
| 4 | ドメインモデル | tab-capture / restore のドメインモデル追記 + 新規 `url-filter` ドメインモデル |
| 5 | 論理設計 | tab-capture / restore / ui-ux の論理設計追記、必要なら新規 url-filter 論理設計 |
| 6 | ADR | 新規ADR（パターンマッチング方式、設定スコープ、ストレージ選定、UX フロー） |
| 7 | 実装 | `FRONTEND/` 配下のドメイン層 → アプリケーション層 → サービスワーカー → サイドパネル |

## 注意事項
- ユーザー承認前にコード修正は行わない
- 要件資料を設計より先に更新する（ウォーターフォール順守）
- 影響なしと判断したアーティファクトも「変更なし」と分析書に明記する

---

**作成日**: 2026-05-28
**作成者**: Modification & Impact Analysis エージェント
**ステータス**: ✅ 設計フェーズ完了（レイヤー1〜6 すべて更新済み）／ 🚧 実装（レイヤー7）は次フェーズ
**承認**: 2026-05-28（ユーザー回答は `modification_analysis_20260528_url_filter.md` §7・§9 参照）
