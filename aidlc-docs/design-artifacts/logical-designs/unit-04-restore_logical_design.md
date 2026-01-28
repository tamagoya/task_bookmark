# Logical Design: Unit 4 - 状態復元機能

## 概要
本ドキュメントは、Unit 4（状態復元機能）のLogical Designを定義します。Unit定義を拡張し、NFRsを満たすためのアーキテクチャパターンを適用した実装可能な設計です。

## アーキテクチャパターン

### 採用したパターン

1. **レイヤードアーキテクチャ**: ドメイン層、アプリケーション層、インフラストラクチャ層の分離（Unit 1, 2, 3と一貫性を保つ）
2. **Adapter パターン**: Chrome Windows API、Chrome Tabs APIのラッパー（Unit 2のパターンを拡張）
3. **Service Layer パターン**: アプリケーションロジックの集約（Unit 1, 2, 3のパターンを拡張）
4. **Repository パターン**: Unit 3のCalendarEventRepositoryを再利用
5. **Factory パターン**: Unit 3のWorkStateFactoryを再利用
6. **Strategy パターン**: 段階的なタブ読み込み戦略（新規）
7. **Observer パターン**: プログレス通知（簡易実装、コールバック関数）

---

## レイヤー構造

### 1. ドメイン層 (Domain Layer)

**責任**: ビジネスロジックとドメインモデル

**コンポーネント**:
- Unit 3のドメインモデルを再利用:
  - `TaskBookmark` (Aggregate Root)
  - `WorkState` (Entity) - `recordRestoredFrom()`メソッドが既に実装済み
  - `WorkStateMetadata` (Value Object) - `restoredTo`フィールドが既に実装済み
  - `EventId` (Value Object)
  - `TabInfo` (Unit 2から参照、Value Object)

**特徴**:
- インフラストラクチャに依存しない
- 純粋なビジネスロジック
- テスト容易性が高い
- Unit 3のドメインモデルを再利用するため、新しいドメインモデルは不要

---

### 2. アプリケーション層 (Application Layer)

**責任**: ユースケースの実装、ドメイン層とインフラストラクチャ層の調整

**コンポーネント**:

#### RestoreService
仕事状態の復元処理を担当するアプリケーションサービスです。

**主要メソッド**:
- `restoreWorkState(eventId: EventId, calendarId: CalendarId, accessToken: AccessToken, onProgress?: (completed: number, total: number) => void): Promise<{ windowId: number; tabIds: number[] }>`
  - 仕事状態を復元
  - 依存関係: Domain Layer (WorkState), Infrastructure Layer (ChromeWindowsAdapter, ChromeTabsAdapter), Application Layer (CalendarEventService, TabRestoreManager)
  - パフォーマンス要件: 10タブを5秒以内で復元（NFR-001）

**実装フロー**:
1. `CalendarEventService.findById()`でWorkStateを取得
2. `ChromeWindowsAdapter.createWindow()`で新しいウィンドウを作成
3. `TabRestoreManager.restoreTabsInOrder()`でタブを順番通りに復元（段階的読み込み）
4. `CalendarEventService.recordRestore()`で復元メタデータを記録
5. プログレス通知（`onProgress`コールバック）

**依存関係**:
- Domain Layer (WorkState, EventId, TabInfo)
- Infrastructure Layer (ChromeWindowsAdapter, ChromeTabsAdapter, Logger)
- Application Layer (CalendarEventService, TabRestoreManager)

#### TabRestoreManager
タブの復元処理と順序管理を担当するマネージャーです。

**主要メソッド**:
- `restoreTabsInOrder(tabs: TabInfo[], windowId: number, onProgress?: (completed: number, total: number) => void): Promise<number[]>`
  - タブを順番通りに復元
  - 依存関係: Infrastructure Layer (ChromeTabsAdapter, Logger)
  - パフォーマンス要件: 20個以上のタブは段階的に読み込む（5個ずつ、100ms待機）

**実装フロー**:
1. タブ数が20個以上の場合は、バッチサイズ5で段階的に読み込む
2. 各バッチの間に100msの待機時間を設ける
3. 順番通りにタブを作成（並列処理を避ける）
4. エラーが発生したタブはスキップして続行
5. プログレス通知（`onProgress`コールバック）

**依存関係**:
- Domain Layer (TabInfo)
- Infrastructure Layer (ChromeTabsAdapter, Logger)

#### CalendarEventService（拡張）
Unit 3で実装済みのサービスを拡張します。

**追加メソッド**:
- `recordRestore(eventId: EventId, restoredAt: Date, calendarId: CalendarId, accessToken: AccessToken): Promise<void>`
  - 復元メタデータを記録
  - `WorkStateMetadata`の`restoredTo`フィールドに復元日時を追加
  - 依存関係: Domain Layer (WorkState, WorkStateMetadata), Infrastructure Layer (CalendarEventRepositoryImpl)

**実装フロー**:
1. `CalendarEventRepository.findById()`で既存のWorkStateを取得
2. `WorkStateMetadata`の`restoredTo`フィールドに復元日時を追加（新しいメタデータを作成）
3. `WorkState.updateMetadata()`でメタデータを更新
4. `CalendarEventRepository.update()`でカレンダーに保存

**依存関係**:
- Domain Layer (WorkState, WorkStateMetadata, EventId)
- Infrastructure Layer (CalendarEventRepositoryImpl)

#### EventHandler（拡張）
Domain Eventsの処理（Unit 1から継承、拡張）

**新しいDomain Eventsの処理**（将来の拡張）:
- `WorkStateRestored`: 復元完了時のイベント（将来の拡張）

**依存関係**:
- Domain Layer (Domain Events)
- Infrastructure Layer (UIMessenger, Logger)

---

### 3. インフラストラクチャ層 (Infrastructure Layer)

**責任**: 外部APIとの通信、UIとの通信

**コンポーネント**:

#### ChromeTabsAdapter（拡張）
Unit 2で実装済みのアダプターを拡張します。

**追加メソッド**:
- `createTab(windowId: number, url: string, index?: number): Promise<chrome.tabs.Tab>`
  - 新しいタブを作成
  - 依存関係: Chrome Tabs API (`chrome.tabs.create`)
  - エラーハンドリング: 無効なURL、権限エラーなど

- `createTabs(windowId: number, urls: string[]): Promise<chrome.tabs.Tab[]>`
  - 複数のタブを順番通りに作成
  - 依存関係: Chrome Tabs API (`chrome.tabs.create`)
  - 注意: 順序保証のため、並列処理は行わない

**実装**:
```typescript
class ChromeTabsAdapter {
  // Unit 2から継承
  async getCurrentWindowTabs(windowId?: number): Promise<chrome.tabs.Tab[]>
  async getTab(tabId: number): Promise<chrome.tabs.Tab>
  async getFaviconUrl(tabId: number): Promise<string | undefined>
  
  // Unit 4で追加
  async createTab(windowId: number, url: string, index?: number): Promise<chrome.tabs.Tab>
  async createTabs(windowId: number, urls: string[]): Promise<chrome.tabs.Tab[]>
}
```

#### ChromeWindowsAdapter（拡張）
Unit 2で実装済みのアダプターを拡張します。

**追加メソッド**:
- `createWindow(urls?: string[]): Promise<chrome.windows.Window>`
  - 新しいウィンドウを作成
  - 依存関係: Chrome Windows API (`chrome.windows.create`)
  - エラーハンドリング: 権限エラー、リソース不足など

**実装**:
```typescript
class ChromeWindowsAdapter {
  // Unit 2から継承
  async getCurrentWindowId(): Promise<number>
  async getWindow(windowId: number): Promise<chrome.windows.Window>
  
  // Unit 4で追加
  async createWindow(urls?: string[]): Promise<chrome.windows.Window>
}
```

#### CalendarEventRepositoryImpl（再利用）
Unit 3で実装済みのリポジトリを再利用します。

**使用メソッド**:
- `findById(eventId: EventId, calendarId: CalendarId, accessToken: AccessToken): Promise<WorkState | null>`
  - WorkStateの取得に使用
- `update(eventId: EventId, workState: WorkState, calendarId: CalendarId, accessToken: AccessToken): Promise<void>`
  - 復元メタデータの記録に使用

#### Logger（再利用）
Unit 1で実装済みのロガーを再利用します。

#### UIMessenger（再利用）
Unit 1で実装済みのUIメッセンジャーを再利用します。
- プログレス通知に使用（将来の拡張）

---

## データフロー

### 復元フロー

```
ユーザー操作
    │
    ├─> サイドパネル: 「復元」ボタンをクリック
    │
    ├─> Service Worker: RESTORE_WORK_STATE メッセージ受信
    │
    ├─> RestoreService.restoreWorkState()
    │   │
    │   ├─> CalendarEventService.findById() ──> CalendarEventRepositoryImpl.findById()
    │   │                                       └─> GoogleCalendarAdapter.getEvent()
    │   │
    │   ├─> ChromeWindowsAdapter.createWindow()
    │   │   └─> chrome.windows.create()
    │   │
    │   ├─> TabRestoreManager.restoreTabsInOrder()
    │   │   │
    │   │   ├─> タブ数が20個以上の場合:
    │   │   │   ├─> バッチサイズ5で段階的に読み込む
    │   │   │   └─> 各バッチの間に100ms待機
    │   │   │
    │   │   └─> ChromeTabsAdapter.createTab() ──> chrome.tabs.create()
    │   │       （順番通りに作成、並列処理を避ける）
    │   │
    │   └─> CalendarEventService.recordRestore()
    │       ├─> CalendarEventRepositoryImpl.findById()
    │       ├─> WorkState.updateMetadata() ──> restoredToに復元日時を追加
    │       └─> CalendarEventRepositoryImpl.update()
    │
    └─> プログレス通知（onProgressコールバック）
        └─> サイドパネル: プログレスインジケーターを更新
```

---

## パフォーマンス最適化

### 段階的なタブ読み込み

**戦略**: Strategy パターンを使用

**実装**:
- **バッチサイズ**: 5個ずつ
- **待機時間**: 各バッチの間に100ms
- **適用条件**: タブ数が20個以上の場合

**理由**:
- パフォーマンス要件（10タブを5秒以内）を満たす
- 大量タブ（20個以上）の処理を最適化
- ブラウザのリソース使用を抑制

### 順序保証

**戦略**: 順番通りにタブを作成（並列処理を避ける）

**理由**:
- Chrome Tabs APIの`chrome.tabs.create()`を並列実行すると順序が保証されない
- ユーザー要件: タブの順序が保持される必要がある

### 最大タブ数の制限

**戦略**: 30個を超える場合は警告を表示

**理由**:
- ブラウザのリソース使用を抑制
- ユーザー体験の向上

---

## エラーハンドリング

### タブ復元エラー

**無効なURL**:
- エラーメッセージをログに記録
- 他のタブは開き続ける
- 失敗したタブのリストをユーザーに表示

**ネットワークエラー**:
- エラーメッセージを表示
- リトライを促す（将来の拡張）

### ウィンドウ作成エラー

**権限エラー**:
- エラーメッセージを表示
- 処理を中断

**リソース不足**:
- エラーメッセージを表示
- 処理を中断

### 部分的な復元

**戦略**: 成功したタブは開いたまま、失敗したタブのリストを表示

**理由**:
- ユーザー体験の向上
- エラーが発生しても、可能な限り復元を完了

---

## 統合ポイント

### Unit 3との統合

**WorkStateの取得**:
- `CalendarEventService.findById()`を使用
- `CalendarEventRepositoryImpl.findById()`を経由

**復元メタデータの記録**:
- `CalendarEventService.recordRestore()`を使用
- `WorkStateMetadata`の`restoredTo`フィールドに復元日時を追加
- `CalendarEventRepositoryImpl.update()`でカレンダーに保存

### Unit 2との統合

**ChromeTabsAdapter、ChromeWindowsAdapterの拡張**:
- Unit 2で実装済みのアダプターを拡張
- タブ作成、ウィンドウ作成機能を追加

### Unit 1との統合

**認証**:
- `AuthenticationService`から認証状態を取得
- `CalendarId`と`AccessToken`を使用

**ログ**:
- `Logger`を再利用

**UI通知**:
- `UIMessenger`を再利用（将来の拡張）

---

## 技術スタック

- **言語**: TypeScript（既存と一貫性を保つ）
- **API**: 
  - Chrome Windows API (`chrome.windows.create`)
  - Chrome Tabs API (`chrome.tabs.create`)
- **アーキテクチャパターン**: 
  - レイヤードアーキテクチャ（既存と一貫性を保つ）
  - Adapter Pattern（既存パターンを拡張）
  - Service Layer Pattern（既存パターンを拡張）
  - Strategy Pattern（新規採用）

---

## パフォーマンス要件

- **復元時間**: 10個のタブを5秒以内で復元（NFR-001）
- **大量タブ**: 20個以上のタブは段階的に読み込む（5個ずつ、100ms待機）
- **順序保証**: タブの順序が保持される必要がある

---

## テスト戦略

### ユニットテスト
- `RestoreService`のモックテスト
- `TabRestoreManager`のモックテスト
- `ChromeTabsAdapter`、`ChromeWindowsAdapter`の拡張部分のテスト

### 統合テスト
- 実際のChrome環境での復元テスト
- 大量タブ（10個、20個、30個）でのパフォーマンステスト
- エラーケースのテスト（無効なURLなど）

---

**作成日**: 2026-01-22  
**最終更新**: 2026-01-22  
**ステータス**: 設計完了
