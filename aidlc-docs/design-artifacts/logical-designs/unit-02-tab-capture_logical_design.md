# Logical Design: Unit 2 - タブ状態キャプチャ

## 概要
本ドキュメントは、Unit 2（タブ状態キャプチャ）のLogical Designを定義します。Domain Modelを拡張し、NFRsを満たすためのアーキテクチャパターンを適用した実装可能な設計です。

## アーキテクチャパターン

### 採用したパターン

1. **レイヤードアーキテクチャ**: ドメイン層、アプリケーション層、インフラストラクチャ層の分離（Unit 1、Unit 3と一貫性を保つ）
2. **Service Layer パターン**: アプリケーションロジックの集約（Unit 1、Unit 3のパターンを拡張）
3. **Factory パターン**: TabInfoの作成（Unit 1、Unit 3のパターンを拡張）
4. **Domain Events パターン**: イベント駆動アーキテクチャ（Unit 1、Unit 3のパターンを拡張）
5. **Adapter パターン**: Chrome Tabs APIとの通信（Unit 1、Unit 3のパターンを拡張）
6. **並列処理パターン**: パフォーマンス要件（500ms以内）を満たすための並列取得（新規）

---

## レイヤー構造

### 1. ドメイン層 (Domain Layer)

**責任**: ビジネスロジックとドメインモデル

**コンポーネント**:
- `TabInfo` (Value Object)
- `TabsCaptured` (Domain Event)
- `TabInfoFactory` (Factory)

**特徴**:
- インフラストラクチャに依存しない
- 純粋なビジネスロジック
- テスト容易性が高い
- Unit 3で既に参照されている`TabInfo`の完全な定義

---

### 2. アプリケーション層 (Application Layer)

**責任**: ユースケースの実装、ドメイン層とインフラストラクチャ層の調整

**コンポーネント**:

#### TabCaptureService
タブ情報の取得と構造化を担当するアプリケーションサービスです。

**主要メソッド**:
- `getCurrentWindowTabs(): Promise<TabInfo[]>`
  - 現在のウィンドウのタブ情報を取得
  - 依存関係: Infrastructure Layer (ChromeTabsAdapter, ChromeWindowsAdapter)
  - パフォーマンス要件: 最大20タブの取得を500ms以内で完了（NFR-001）

- `getTabInfo(tabId: number): Promise<TabInfo>`
  - 特定のタブの情報を取得
  - 依存関係: Infrastructure Layer (ChromeTabsAdapter)

- `getFaviconUrl(tabId: number): Promise<string | undefined>`
  - タブのファビコンURLを取得
  - 依存関係: Infrastructure Layer (ChromeTabsAdapter)
  - エラーハンドリング: 取得失敗時は`undefined`を返す

**依存関係**:
- Domain Layer (TabInfo Value Object, TabInfoFactory, TabsCaptured Domain Event)
- Infrastructure Layer (ChromeTabsAdapter, ChromeWindowsAdapter, Logger)

**パフォーマンス最適化**:
- `chrome.tabs.query`を使用して一括取得（並列処理）
- ファビコンURLの取得は必要に応じて遅延読み込み

#### EventHandler（拡張）
Domain Eventsの処理（Unit 1から継承、拡張）

**新しいDomain Eventsの処理**:
- `TabsCaptured`: UI更新、ログ記録

**依存関係**:
- Domain Layer (TabsCaptured Domain Event)
- Infrastructure Layer (UIMessenger, Logger)

---

### 3. インフラストラクチャ層 (Infrastructure Layer)

**責任**: 外部APIとの通信、UIとの通信

**コンポーネント**:

#### ChromeTabsAdapter
Chrome Tabs APIのラッパーです。タブ情報の取得を担当します。

**実装**:
```typescript
class ChromeTabsAdapter {
  /**
   * 現在のウィンドウのタブ情報を一括取得
   * @param windowId ウィンドウID（省略時は現在のウィンドウ）
   * @returns タブ情報の配列
   */
  async getCurrentWindowTabs(windowId?: number): Promise<chrome.tabs.Tab[]>

  /**
   * 特定のタブの情報を取得
   * @param tabId タブID
   * @returns タブ情報
   */
  async getTab(tabId: number): Promise<chrome.tabs.Tab>

  /**
   * タブのファビコンURLを取得
   * @param tabId タブID
   * @returns ファビコンURL（取得できない場合はundefined）
   */
  async getFaviconUrl(tabId: number): Promise<string | undefined>
}
```

**特徴**:
- Chrome Tabs APIの詳細を抽象化
- エラーハンドリング（権限エラー、タブが見つからない場合など）
- パフォーマンス最適化（一括取得APIの活用）

#### ChromeWindowsAdapter
Chrome Windows APIのラッパーです。ウィンドウ情報の取得を担当します。

**実装**:
```typescript
class ChromeWindowsAdapter {
  /**
   * 現在のウィンドウIDを取得
   * @returns 現在のウィンドウID
   */
  async getCurrentWindowId(): Promise<number>

  /**
   * ウィンドウ情報を取得
   * @param windowId ウィンドウID
   * @returns ウィンドウ情報
   */
  async getWindow(windowId: number): Promise<chrome.windows.Window>
}
```

**特徴**:
- Chrome Windows APIの詳細を抽象化
- エラーハンドリング

#### UIMessenger（再利用）
Unit 1で実装済み、Unit 2でも再利用
- Service WorkerとUI間のメッセージパッシング
- タブ情報取得完了の通知

#### Logger（再利用）
Unit 1で実装済み、Unit 2でも再利用
- エラーログ、パフォーマンスログの記録

---

## コンポーネント図

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer                                  │
│  (Side Panel)                                               │
│  - Tab List Component                                       │
└────────────────────┬──────────────────────────────────────────┘
                     │ Message Passing
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Application Layer                              │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ TabCaptureService    │  │ EventHandler          │        │
│  │  - getCurrentWindow  │  │ (Unit 1から継承)     │        │
│  │    Tabs()            │  │  - handleTabsCaptured│        │
│  │  - getTabInfo()      │  │                      │        │
│  │  - getFaviconUrl()   │  │                      │        │
│  └──────────┬───────────┘  └──────────────────────┘        │
└─────────────┬───────────────────────────────────────────────┘
              │
              │ uses
              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Domain Layer                                │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ TabInfo               │  │ TabInfoFactory      │        │
│  │ (Value Object)        │  │                     │        │
│  └──────────────────────┘  └──────────────────────┘        │
│  ┌──────────────────────┐                                  │
│  │ TabsCaptured          │                                  │
│  │ (Domain Event)        │                                  │
│  └──────────────────────┘                                  │
└─────────────┬───────────────────────────────────────────────┘
              │
              │ uses
              ▼
┌─────────────────────────────────────────────────────────────┐
│            Infrastructure Layer                             │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ ChromeTabsAdapter    │  │ ChromeWindowsAdapter │        │
│  │  - getCurrentWindow  │  │  - getCurrentWindow │        │
│  │    Tabs()            │  │    Id()              │        │
│  │  - getTab()          │  │  - getWindow()       │        │
│  │  - getFaviconUrl()   │  │                      │        │
│  └──────────────────────┘  └──────────────────────┘        │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ UIMessenger          │  │ Logger                │        │
│  │ (Unit 1から再利用)   │  │ (Unit 1から再利用)   │        │
│  └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## データフロー

### タブ情報取得フロー

```
1. UI Layer (Side Panel)
   └─> ユーザーがサイドパネルを開く
       └─> TabCaptureService.getCurrentWindowTabs()を呼び出し

2. Application Layer (TabCaptureService)
   └─> ChromeWindowsAdapter.getCurrentWindowId()を呼び出し
       └─> ChromeTabsAdapter.getCurrentWindowTabs(windowId)を呼び出し
           └─> 取得したchrome.tabs.Tab[]をTabInfoFactoryに渡す

3. Domain Layer (TabInfoFactory)
   └─> TabInfoFactory.createFromChromeTab()でTabInfo[]を作成
       └─> バリデーションを実行

4. Application Layer (TabCaptureService)
   └─> TabsCaptured Domain Eventを発行
       └─> EventHandler.handleTabsCaptured()を呼び出し

5. Infrastructure Layer (EventHandler)
   └─> UIMessenger.sendMessage()でUIに通知
       └─> Logger.info()でログ記録

6. UI Layer (Side Panel)
   └─> タブ一覧を表示
```

---

## 統合ポイント

### Chrome Tabs API
- **API**: `chrome.tabs.query()`, `chrome.tabs.get()`
- **権限**: `tabs`権限（manifest.jsonに設定済み）
- **エラーハンドリング**: 権限エラー、タブが見つからない場合の処理

### Chrome Windows API
- **API**: `chrome.windows.getCurrent()`, `chrome.windows.get()`
- **権限**: `windows`権限（manifest.jsonに設定済み）
- **エラーハンドリング**: ウィンドウが見つからない場合の処理

### Unit 1との統合
- **EventHandler**: Unit 1で実装済みのEventHandlerを拡張
- **UIMessenger**: Unit 1で実装済みのUIMessengerを再利用
- **Logger**: Unit 1で実装済みのLoggerを再利用

### Unit 3との統合
- **TabInfo**: Unit 3で既に参照されているTabInfoの完全な定義を提供
- **データ形式**: Unit 3のWorkStateMetadataがTabInfo[]を使用

---

## 技術スタック

### 言語・フレームワーク
- **TypeScript**: 型安全性の確保
- **Chrome Extension APIs**: Chrome Tabs API、Chrome Windows API

### アーキテクチャパターン
- **レイヤードアーキテクチャ**: ドメイン層、アプリケーション層、インフラストラクチャ層
- **Service Layer パターン**: TabCaptureService
- **Factory パターン**: TabInfoFactory
- **Domain Events パターン**: TabsCaptured
- **Adapter パターン**: ChromeTabsAdapter、ChromeWindowsAdapter

---

## パフォーマンス最適化

### 並列処理
- **一括取得**: `chrome.tabs.query()`を使用して、すべてのタブを一度に取得
- **並列変換**: 取得したタブ情報を並列にTabInfoに変換（必要に応じて）

### キャッシュ戦略
- **最小限のキャッシュ**: 取得直後の情報のみをキャッシュ（メモリ使用量を抑制）
- **キャッシュの無効化**: タブが変更された場合、キャッシュを無効化

### 遅延読み込み
- **ファビコンURL**: 必要に応じて遅延読み込み（初期表示時は不要な場合もある）

---

## エラーハンドリング

### タブ取得エラー
- **権限エラー**: ユーザーに権限の許可を促す
- **タブが見つからない**: エラーメッセージを表示し、再試行ボタンを提供
- **部分的な取得**: 取得できたタブのみを返す

### ファビコン取得エラー
- **取得失敗**: `undefined`を返し、デフォルトアイコンを使用
- **エラーを無視**: ファビコン取得エラーは処理を続行

### ウィンドウ取得エラー
- **ウィンドウが見つからない**: エラーメッセージを表示
- **フォールバック**: 可能な限り、現在のウィンドウを取得

---

## セキュリティ考慮事項

### 権限管理
- **最小権限**: `tabs`権限のみを使用（`windows`権限も必要）
- **権限の確認**: タブ取得前に権限を確認

### データ保護
- **URLの機密性**: URLに機密情報が含まれる可能性があることを考慮（Unit 3で保存時に警告）

---

## テスト戦略

### ユニットテスト
- **TabCaptureService**: モックを使用してテスト
- **TabInfoFactory**: バリデーションテスト
- **ChromeTabsAdapter**: Chrome Tabs APIのモックテスト

### 統合テスト
- **実際のChrome環境**: 実際のChrome環境でのタブ取得テスト
- **パフォーマンステスト**: 複数のタブ（10個、20個）でのパフォーマンステスト

### テストカバレッジ
- **目標**: 80%以上（NFR-004）

---

## デプロイメントモデル

### Chrome拡張機能
- **Manifest V3**: Service Workerベース
- **権限**: `tabs`、`windows`権限（manifest.jsonに設定済み）
- **サイドパネル**: Chrome 114+のSide Panel APIを使用

---

## 将来の拡張性

### キャッシュ機能
- 将来的に、タブ情報のキャッシュ機能を追加する可能性がある
- 現時点では、パフォーマンス要件（500ms以内）を満たすため、キャッシュは不要

### 複数ウィンドウ対応
- 将来的に、複数のウィンドウのタブを同時に取得する機能を追加する可能性がある
- 現時点では、現在のウィンドウのみを対象

### タブの監視
- 将来的に、タブの変更を監視する機能を追加する可能性がある
- `chrome.tabs.onUpdated`、`chrome.tabs.onRemoved`などのイベントリスナーを使用

---

## まとめ

Unit 2のLogical Designは、既存のアーキテクチャパターン（Unit 1、Unit 3）と一貫性を保ちながら、タブ情報取得のシンプルな設計となっています：

1. **レイヤードアーキテクチャ**: ドメイン層、アプリケーション層、インフラストラクチャ層の分離
2. **Service Layer パターン**: TabCaptureServiceでアプリケーションロジックを集約
3. **Adapter パターン**: ChromeTabsAdapter、ChromeWindowsAdapterで外部APIを抽象化
4. **Factory パターン**: TabInfoFactoryでTabInfoの作成を担当
5. **Domain Events パターン**: TabsCapturedイベントでイベント駆動アーキテクチャを実現
6. **並列処理パターン**: パフォーマンス要件（500ms以内）を満たすための最適化

この設計により、タブ情報の取得と構造化を、インフラストラクチャから独立して実装できます。また、Unit 3で既に参照されている`TabInfo`の完全な定義を提供し、システム全体の一貫性を保ちます。

---

**作成日**: 2026-01-22  
**最終更新**: 2026-01-22  
**ステータス**: 設計完了
