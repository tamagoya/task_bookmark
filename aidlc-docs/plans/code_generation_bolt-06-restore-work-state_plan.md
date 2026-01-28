# Bolt 6: 仕事状態の復元 - コード生成計画

## 概要
Bolt 6「仕事状態の復元」のコード生成計画です。保存済み仕事状態を選択して復元し、タブを新しいウィンドウで一括展開する機能を実装します。

## 実装範囲

### 新規実装
1. **Infrastructure Layer（拡張）**
   - `ChromeTabsAdapter.createTab()` - タブ作成機能
   - `ChromeTabsAdapter.createTabs()` - 複数タブ作成機能
   - `ChromeWindowsAdapter.createWindow()` - ウィンドウ作成機能

2. **Application Layer（新規）**
   - `RestoreService` - 仕事状態の復元処理
   - `TabRestoreManager` - タブの復元処理と順序管理

3. **Application Layer（拡張）**
   - `CalendarEventService.recordRestore()` - 復元メタデータの記録

4. **Service Workerメッセージハンドラー**
   - `RESTORE_WORK_STATE`: 仕事状態を復元

5. **サイドパネルUI拡張**
   - 復元ボタン
   - プログレスインジケーター
   - エラーメッセージ表示

### 既存実装の活用
- `CalendarEventService` - WorkStateの取得、復元メタデータの記録
- `CalendarEventRepository` - WorkStateの取得と更新
- `WorkState` - 復元メタデータの管理（`recordRestoredFrom()`メソッド）
- `WorkStateMetadata` - `restoredTo`フィールド
- `TabInfo` - タブ情報Value Object
- `Logger` - ログ記録

### ドメイン層
- Unit 3のドメインモデルを再利用（新規実装不要）

---

## 実行ステップ

### ステップ1: Domain ModelとLogical Designの読み込み
- [x] Unit 4のLogical Designを確認
- [x] Unit 3のDomain Modelを確認（WorkState、WorkStateMetadata）
- [x] ADR-013, ADR-014, ADR-015を確認
- [x] User Story 5の要件を確認
- [x] 既存実装の状態を確認

**確認結果**:
- Unit 4のLogical Designが完了している
- Unit 3のドメインモデル（WorkState、WorkStateMetadata）が実装済み
- `WorkState.recordRestoredFrom()`メソッドが実装済み
- `WorkStateMetadata.restoredTo`フィールドが実装済み（配列形式）
- `CalendarEventService`に`findById()`メソッドが必要（確認が必要）

### ステップ2: コード構造の設計
- [x] Infrastructure Layerの拡張設計
- [x] Application Layerの新規サービス設計
- [x] Service Workerのメッセージハンドラー設計
- [x] サイドパネルUIの構造設計
- [x] 依存関係の初期化設計

### ステップ3: ドメイン層の実装（TDD）
- [x] 既存のドメイン層は実装済み（変更不要）

### ステップ4: インフラストラクチャ層の実装（TDD）
- [x] `ChromeTabsAdapter.createTab()`のテストを先に書く（RED）
- [x] `ChromeTabsAdapter.createTab()`の実装を書く（GREEN）
- [x] `ChromeTabsAdapter.createTabs()`のテストを先に書く（RED）
- [x] `ChromeTabsAdapter.createTabs()`の実装を書く（GREEN）
- [x] `ChromeWindowsAdapter.createWindow()`のテストを先に書く（RED）
- [x] `ChromeWindowsAdapter.createWindow()`の実装を書く（GREEN）
- [x] リファクタリング（IMPROVE）

### ステップ5: アプリケーション層の実装（TDD）
- [x] `TabRestoreManager`のテストを先に書く（RED）
- [x] `TabRestoreManager`の実装を書く（GREEN）
- [x] `RestoreService`のテストを先に書く（RED）
- [x] `RestoreService`の実装を書く（GREEN）
- [x] `CalendarEventService.recordRestore()`のテストを先に書く（RED）
- [x] `CalendarEventService.recordRestore()`の実装を書く（GREEN）
- [x] `CalendarEventService.findById()`メソッドを追加
- [x] リファクタリング（IMPROVE）

### ステップ6: Service Workerの実装
- [x] `RESTORE_WORK_STATE`メッセージハンドラーの実装
- [x] 依存関係の初期化（RestoreService、TabRestoreManager）
- [x] エラーハンドリング

### ステップ7: UI層の実装
- [x] サイドパネルHTMLの拡張（復元ボタンは既存の`renderWorkStateList()`に追加）
- [x] サイドパネルCSSの拡張（復元ボタンのスタイル）
- [x] サイドパネルTypeScriptの拡張（復元処理、メッセージ表示）

### ステップ8: ユニットテストの生成（TDD）
- [x] `ChromeTabsAdapter`の拡張部分のテスト
- [x] `ChromeWindowsAdapter`の拡張部分のテスト
- [x] `TabRestoreManager`のテスト
- [x] `RestoreService`のテスト
- [x] `CalendarEventService.recordRestore()`のテスト
- [x] エッジケースのテスト（無効なURL、大量タブ、エラー処理）

### ステップ9: テストの実行とカバレッジ確認
- [x] すべてのテストを実行
- [x] カバレッジ確認（Statements: 89.14%, Branches: 71.96%, Functions: 97.61%, Lines: 89.17%）
- [x] 失敗したテストを修正

### ステップ10: ビルドエラーの確認と修正
- [x] TypeScript型チェックを実行
- [x] ビルドを実行
- [x] エラーを修正（最小限の変更）

### ステップ11: コードレビュー
- [x] コード品質の確認
- [x] パフォーマンスの確認
- [x] エラーハンドリングの確認
- [x] セキュリティの確認

### ステップ12: セキュリティレビュー
- [x] ハードコードされた秘密情報の確認
- [x] 入力検証の確認
- [x] エラーメッセージの確認
- [x] 依存関係の脆弱性確認

### ステップ13: 結果の分析と修正提案
- [x] テスト結果を分析
- [x] コードレビュー結果を分析
- [x] セキュリティレビュー結果を分析
- [x] 修正提案を生成
- [x] 結果を記録

---

## 実装の詳細

### Infrastructure Layer

#### ChromeTabsAdapter（拡張）
```typescript
// src/infrastructure/adapters/chrome-tabs-adapter.ts
async createTab(windowId: number, url: string, index?: number): Promise<chrome.tabs.Tab>
async createTabs(windowId: number, urls: string[]): Promise<chrome.tabs.Tab[]>
```

#### ChromeWindowsAdapter（拡張）
```typescript
// src/infrastructure/adapters/chrome-windows-adapter.ts
async createWindow(urls?: string[]): Promise<chrome.windows.Window>
```

### Application Layer

#### TabRestoreManager（新規）
```typescript
// src/application/services/tab-restore-manager.ts
class TabRestoreManager {
  async restoreTabsInOrder(
    tabs: TabInfo[],
    windowId: number,
    onProgress?: (completed: number, total: number) => void
  ): Promise<number[]>
}
```

#### RestoreService（新規）
```typescript
// src/application/services/restore-service.ts
class RestoreService {
  async restoreWorkState(
    eventId: EventId,
    calendarId: CalendarId,
    accessToken: AccessToken,
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ windowId: number; tabIds: number[] }>
}
```

#### CalendarEventService（拡張）
```typescript
// src/application/services/calendar-event-service.ts
async recordRestore(
  eventId: EventId,
  restoredAt: Date,
  calendarId: CalendarId,
  accessToken: AccessToken
): Promise<void>
```

### Service Worker

#### メッセージハンドラー
```typescript
// background/service-worker.ts
case 'RESTORE_WORK_STATE':
  // 復元処理
```

### UI Layer

#### サイドパネル
- 復元ボタン（各仕事項目に追加）
- プログレスインジケーター
- エラーメッセージ表示

---

## パフォーマンス要件
- **復元時間**: 10個のタブを5秒以内で復元（NFR-001）
- **大量タブ**: 20個以上のタブは段階的に読み込む（5個ずつ、100ms待機）
- **順序保証**: タブの順序が保持される

---

## エラーハンドリング
- **無効なURL**: エラーメッセージをログに記録、他のタブは開き続ける
- **ウィンドウ作成エラー**: エラーメッセージを表示、処理を中断
- **部分的な復元**: 成功したタブは開いたまま、失敗したタブのリストを表示

---

**作成日**: 2026-01-22  
**最終更新**: 2026-01-22  
**ステータス**: 実装完了
