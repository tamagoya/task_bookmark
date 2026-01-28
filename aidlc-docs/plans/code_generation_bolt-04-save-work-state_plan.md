# Bolt 4: 仕事状態の保存 - コード生成計画

## 概要
Bolt 4「仕事状態の保存」のコード生成計画です。タブ情報とメタデータをカレンダーイベントとして保存する機能を実装します。

## 実装範囲

### 新規実装
1. **Service Workerメッセージハンドラー**
   - `GET_CURRENT_TABS`: 現在のタブ一覧を取得
   - `SAVE_WORK_STATE`: 仕事状態を保存

2. **サイドパネルUI拡張**
   - タブ一覧表示セクション
   - 保存フォーム（仕事名、メモ入力）
   - 保存ボタン
   - ローディングインジケーター
   - 成功/失敗メッセージ

3. **時間計算の修正**
   - `CalendarEventService.createWorkStateEvent`の時間計算を修正
   - 開始時間: 現在時刻の30分前
   - 終了時間: 現在時刻

### 既存実装の活用
- `CalendarEventService` - カレンダーイベントのCRUD操作
- `TabCaptureService` - タブ情報の取得
- `WorkStateFactory` - WorkState作成
- `EventDescription` - JSON形式データの管理

---

## 実行ステップ

### ステップ1: Domain ModelとLogical Designの読み込み ✅
- [x] Unit 3のDomain Modelを確認
- [x] Unit 3のLogical Designを確認
- [x] User Story 3の要件を確認
- [x] 既存実装の状態を確認

### ステップ2: コード構造の設計
- [ ] Service Workerのメッセージハンドラー設計
- [ ] サイドパネルUIの構造設計
- [ ] 依存関係の初期化設計

### ステップ3: ドメイン層の実装（TDD）
- [ ] 既存のドメイン層は実装済み（変更不要）

### ステップ4: アプリケーション層の実装（TDD）
- [ ] `CalendarEventService.createWorkStateEvent`の時間計算を修正
- [ ] テストを先に書く（RED）
- [ ] 実装を書く（GREEN）
- [ ] リファクタリング（IMPROVE）

### ステップ5: インフラストラクチャ層の実装（TDD）
- [ ] Service Workerメッセージハンドラーの実装
- [ ] 依存関係の初期化
- [ ] テストを先に書く（RED）
- [ ] 実装を書く（GREEN）
- [ ] リファクタリング（IMPROVE）

### ステップ6: UI層の実装
- [ ] サイドパネルHTMLの拡張
- [ ] サイドパネルCSSの拡張
- [ ] サイドパネルTypeScriptの拡張
- [ ] タブ一覧表示機能
- [ ] 保存フォーム機能
- [ ] 成功/失敗メッセージ表示

### ステップ7: ユニットテストの生成（TDD）
- [ ] Service Workerメッセージハンドラーのテスト
- [ ] 時間計算の修正テスト
- [ ] UIコンポーネントのテスト（可能な範囲）

### ステップ8: テストの実行とカバレッジ確認
- [ ] すべてのテストを実行
- [ ] カバレッジ80%以上を確認
- [ ] 失敗したテストを修正

### ステップ9: ビルドエラーの確認と修正
- [ ] TypeScriptコンパイルエラーの確認
- [ ] ビルドエラーの修正
- [ ] ビルド成功を確認

### ステップ10: コードレビュー
- [ ] コード品質の確認
- [ ] セキュリティチェック
- [ ] パフォーマンスチェック
- [ ] レビュー結果の記録

### ステップ11: セキュリティレビュー
- [ ] OWASP Top 10の確認
- [ ] ハードコードされた秘密情報の確認
- [ ] 入力検証の確認
- [ ] セキュリティレビュー結果の記録

### ステップ12: 結果の分析と修正提案
- [ ] テスト結果の分析
- [ ] コードレビュー結果の分析
- [ ] セキュリティレビュー結果の分析
- [ ] 修正提案の生成
- [ ] 結果ドキュメントの作成

---

## 実装詳細

### Service Workerメッセージハンドラー

```typescript
// background/service-worker.ts (拡張)
case 'GET_CURRENT_TABS':
  const tabs = await tabCaptureService.getCurrentWindowTabs();
  sendResponse({ success: true, tabs });
  break;

case 'SAVE_WORK_STATE':
  const { title, memo } = message.payload;
  const tabs = await tabCaptureService.getCurrentWindowTabs();
  const authState = await authRepository.find();
  if (!authState || !authState.calendarId) {
    sendResponse({ success: false, error: 'Not authenticated' });
    break;
  }
  const eventId = await calendarEventService.createWorkStateEvent(
    tabs,
    title,
    authState.calendarId,
    authState.accessToken,
    memo
  );
  sendResponse({ success: true, eventId: eventId.value });
  break;
```

### サイドパネルUI

```typescript
// sidepanel/sidepanel.ts (拡張)
// タブ一覧表示
async function loadCurrentTabs(): Promise<void> {
  // GET_CURRENT_TABSメッセージを送信
  // タブ一覧を表示
}

// 保存フォーム
async function saveWorkState(): Promise<void> {
  // バリデーション
  // SAVE_WORK_STATEメッセージを送信
  // 成功/失敗メッセージを表示
}
```

---

## 受け入れ基準

- [ ] タブ情報とメタデータをカレンダーイベントとして保存できる
- [ ] イベント説明欄にJSON形式でデータが保存される
- [ ] 保存フォームで仕事名とメモを入力できる
- [ ] 保存成功・失敗時に適切なメッセージが表示される
- [ ] 保存時間が2秒以内（p50）
- [ ] ユニットテストのカバレッジが80%以上

---

**作成日**: 2026-01-22  
**ステータス**: 計画作成完了
