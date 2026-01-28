# Logical Design: Unit 3 - Google Calendar API連携

## 概要
本ドキュメントは、Unit 3（Google Calendar API連携）のLogical Designを定義します。Domain Modelを拡張し、NFRsを満たすためのアーキテクチャパターンを適用した実装可能な設計です。

## アーキテクチャパターン

### 採用したパターン

1. **レイヤードアーキテクチャ**: ドメイン層、アプリケーション層、インフラストラクチャ層の分離（Unit 1と一貫性を保つ）
2. **Repository パターン**: カレンダーイベントの永続化の抽象化（Unit 1のパターンを拡張）
3. **Factory パターン**: WorkStateとWorkStateMetadataの作成（Unit 1のパターンを拡張）
4. **Domain Events パターン**: イベント駆動アーキテクチャ（Unit 1のパターンを拡張）
5. **Service Layer パターン**: アプリケーションロジックの集約（Unit 1のパターンを拡張）
6. **Retry パターン**: ネットワークエラー時のリトライ（Unit 1で実装済み、再利用）
7. **Strategy パターン**: マイグレーション戦略の実装（新規）
8. **Adapter パターン**: Google Calendar APIとの通信（Unit 1のパターンを拡張）

---

## レイヤー構造

### 1. ドメイン層 (Domain Layer)

**責任**: ビジネスロジックとドメインモデル

**コンポーネント**:
- `TaskBookmark` (Aggregate Root)
- `WorkState` (Entity)
- `EventId`, `EventTitle`, `EventDescription`, `WorkStateMetadata`, `SchemaVersion`, `ValidationError` (Value Objects)
- `TabInfo` (Unit 2から参照、Value Object)
- `CalendarEventRepository` (Interface)
- `WorkStateFactory`, `MetadataMigrator` (Factories)
- Domain Events (`TaskBookmarkCreated`, `TaskBookmarkUpdated`, `TaskBookmarkDeleted`, `RestoreRelationRecorded`, `TaskBookmarkCorrupted`)

**特徴**:
- インフラストラクチャに依存しない
- 純粋なビジネスロジック
- テスト容易性が高い
- スキーマバージョニングとマイグレーション戦略を含む

---

### 2. アプリケーション層 (Application Layer)

**責任**: ユースケースの実装、ドメイン層とインフラストラクチャ層の調整

**コンポーネント**:

#### CalendarEventService
- `createWorkStateEvent(tabs: TabInfo[], title: string, memo?: string): Promise<EventId>`
  - 仕事状態をカレンダーイベントとして保存
  - 依存関係: Domain Layer (TaskBookmark Aggregate, WorkStateFactory), Infrastructure Layer (CalendarEventRepositoryImpl, GoogleCalendarAdapter)

- `getWorkStateEvents(startDate: Date, endDate: Date): Promise<WorkState[]>`
  - 保存済み仕事状態の一覧取得
  - 依存関係: Domain Layer (TaskBookmark Aggregate, WorkStateFactory, MetadataMigrator), Infrastructure Layer (CalendarEventRepositoryImpl)

- `updateWorkStateEvent(eventId: EventId, updates: Partial<WorkState>): Promise<void>`
  - イベントの更新（URL編集、メタデータ更新）
  - 依存関係: Domain Layer (TaskBookmark Aggregate), Infrastructure Layer (CalendarEventRepositoryImpl)

- `deleteWorkStateEvent(eventId: EventId): Promise<void>`
  - イベントの削除（オプション）
  - 依存関係: Domain Layer (TaskBookmark Aggregate), Infrastructure Layer (CalendarEventRepositoryImpl)

**依存関係**:
- Domain Layer (TaskBookmark Aggregate, WorkStateFactory, MetadataMigrator, CalendarEventRepository)
- Infrastructure Layer (CalendarEventRepositoryImpl, GoogleCalendarAdapter, RetryHandler)

#### MetadataMigrationService
- `migrateToLatestVersion(workState: WorkState): Promise<WorkState>`
  - 古いバージョンのWorkStateを最新バージョンにマイグレーション
  - 依存関係: Domain Layer (MetadataMigrator, SchemaVersion)

- `validateAndRepair(workState: WorkState): Promise<WorkState>`
  - 破損データの検証と修復の試み
  - 依存関係: Domain Layer (WorkState, ValidationError)

**依存関係**:
- Domain Layer (MetadataMigrator, SchemaVersion, WorkState)
- Infrastructure Layer (Logger)

#### EventHandler（拡張）
- Domain Eventsの処理（Unit 1から継承）
- 新しいDomain Eventsの処理:
  - `TaskBookmarkCreated`: UI更新、ログ記録
  - `TaskBookmarkUpdated`: UI更新、ログ記録
  - `TaskBookmarkDeleted`: UI更新、ログ記録
  - `TaskBookmarkCorrupted`: エラー通知、ログ記録

**依存関係**:
- Domain Layer (Domain Events)
- Infrastructure Layer (UIMessenger, Logger)

---

### 3. インフラストラクチャ層 (Infrastructure Layer)

**責任**: 外部APIとの通信、永続化、UIとの通信

**コンポーネント**:

#### GoogleCalendarAdapter（拡張）
- Unit 1で実装済みの機能を拡張
- カレンダーイベントのCRUD操作

**実装**:
```typescript
class GoogleCalendarAdapter {
  // Unit 1から継承
  async createCalendar(name: string, accessToken: string): Promise<CalendarId>
  async getCalendar(calendarId: string, accessToken: string): Promise<Calendar>
  async listCalendars(accessToken: string): Promise<Calendar[]>
  
  // Unit 3で追加
  async createEvent(calendarId: string, event: CalendarEvent, accessToken: string): Promise<EventId>
  async getEvent(calendarId: string, eventId: string, accessToken: string): Promise<CalendarEvent>
  async listEvents(calendarId: string, startDate: Date, endDate: Date, accessToken: string): Promise<CalendarEvent[]>
  async updateEvent(calendarId: string, eventId: string, event: CalendarEvent, accessToken: string): Promise<void>
  async deleteEvent(calendarId: string, eventId: string, accessToken: string): Promise<void>
}
```

#### CalendarEventRepositoryImpl
- `CalendarEventRepository`インターフェースの実装
- Google Calendar APIを使用した永続化
- Retry パターンの活用（Unit 1で実装済み）

**実装**:
```typescript
class CalendarEventRepositoryImpl implements CalendarEventRepository {
  async save(workState: WorkState, calendarId: CalendarId, accessToken: AccessToken): Promise<EventId>
  async findByEventId(eventId: EventId, calendarId: CalendarId, accessToken: AccessToken): Promise<WorkState | null>
  async findByDateRange(startDate: Date, endDate: Date, calendarId: CalendarId, accessToken: AccessToken): Promise<WorkState[]>
  async update(eventId: EventId, workState: WorkState, calendarId: CalendarId, accessToken: AccessToken): Promise<void>
  async delete(eventId: EventId, calendarId: CalendarId, accessToken: AccessToken): Promise<void>
}
```

#### RetryHandler（再利用）
- Unit 1で実装済み、Unit 3でも再利用
- Google Calendar API呼び出し時のリトライ処理

#### UIMessenger（再利用）
- Unit 1で実装済み、Unit 3でも再利用
- Service WorkerとUI間のメッセージパッシング

#### Logger（再利用）
- Unit 1で実装済み、Unit 3でも再利用
- エラーログ、パフォーマンスログの記録

---

## コンポーネント図

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ CalendarEvent        │  │ MetadataMigration    │        │
│  │ Service              │  │ Service              │        │
│  └──────────┬───────────┘  └──────────┬───────────┘        │
│             │                         │                     │
│  ┌──────────▼───────────┐  ┌──────────▼───────────┐        │
│  │ EventHandler          │  │ (拡張)               │        │
│  │ (Unit 1から継承)      │  │                     │        │
│  └──────────────────────┘  └──────────────────────┘        │
└───────────┬──────────────────────┬──────────────────────────┘
            │                      │
            │ uses                 │ uses
            ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                              │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ TaskBookmark          │  │ CalendarEvent        │        │
│  │ (Aggregate)           │  │ Repository          │        │
│  │                       │  │ (Interface)          │        │
│  └──────────────────────┘  └──────────────────────┘        │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ WorkState             │  │ WorkStateFactory    │        │
│  │ (Entity)              │  │                     │        │
│  └──────────────────────┘  └──────────────────────┘        │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ MetadataMigrator      │  │ SchemaVersion        │        │
│  │ (Factory)             │  │ (Value Object)       │        │
│  └──────────────────────┘  └──────────────────────┘        │
│  ┌──────────────────────┐                                  │
│  │ Domain Events        │                                  │
│  │ (TaskBookmarkCreated,│                                  │
│  │  TaskBookmarkUpdated,│                                  │
│  │  TaskBookmarkDeleted,│                                  │
│  │  TaskBookmarkCorrupted)│                                │
│  └──────────────────────┘                                  │
└───────────┬─────────────────────────────────────────────────┘
            │
            │ implements
            ▼
┌─────────────────────────────────────────────────────────────┐
│              Infrastructure Layer                            │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ GoogleCalendar        │  │ CalendarEvent        │        │
│  │ Adapter (拡張)        │  │ RepositoryImpl       │        │
│  └──────────────────────┘  └──────────────────────┘        │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ RetryHandler          │  │ UIMessenger          │        │
│  │ (Unit 1から再利用)    │  │ (Unit 1から再利用)    │        │
│  └──────────────────────┘  └──────────────────────┘        │
│  ┌──────────────────────┐                                  │
│  │ Logger                │                                  │
│  │ (Unit 1から再利用)    │                                  │
│  └──────────────────────┘                                  │
└───────────┬─────────────────────────────────────────────────┘
            │
            │ uses
            ▼
┌─────────────────────────────────────────────────────────────┐
│              External APIs                                   │
│  Google Calendar API v3                                      │
│  (Unit 1の認証トークンを使用)                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## データフロー

### 仕事状態の保存フロー

```
1. User → UI Layer (タブ情報、仕事名、メモを入力)
   ↓
2. UI Layer → CalendarEventService.createWorkStateEvent()
   ↓
3. CalendarEventService → WorkStateFactory.createFromTabs()
   ↓
4. WorkStateFactory → WorkState (Entity) を作成
   ↓
5. CalendarEventService → CalendarEventRepository.save()
   ↓
6. CalendarEventRepositoryImpl → GoogleCalendarAdapter.createEvent()
   ↓
7. GoogleCalendarAdapter → RetryHandler.executeWithRetry()
   ↓
8. RetryHandler → Google Calendar API (HTTP Request)
   ↓
9. Google Calendar API → EventId を返す
   ↓
10. GoogleCalendarAdapter → CalendarEventRepositoryImpl
   ↓
11. CalendarEventRepositoryImpl → CalendarEventService
   ↓
12. CalendarEventService → TaskBookmark.createWorkState()
   ↓
13. TaskBookmark → Domain Event: TaskBookmarkCreated
   ↓
14. EventHandler → UIMessenger.sendMessage()
   ↓
15. UIMessenger → UI Layer (保存成功の通知)
```

### 保存済み仕事状態の一覧取得フロー

```
1. User → UI Layer (一覧表示をリクエスト)
   ↓
2. UI Layer → CalendarEventService.getWorkStateEvents()
   ↓
3. CalendarEventService → CalendarEventRepository.findByDateRange()
   ↓
4. CalendarEventRepositoryImpl → GoogleCalendarAdapter.listEvents()
   ↓
5. GoogleCalendarAdapter → RetryHandler.executeWithRetry()
   ↓
6. RetryHandler → Google Calendar API (HTTP Request)
   ↓
7. Google Calendar API → CalendarEvent[] を返す
   ↓
8. GoogleCalendarAdapter → CalendarEventRepositoryImpl
   ↓
9. CalendarEventRepositoryImpl → CalendarEvent[] を返す
   ↓
10. CalendarEventService → 各CalendarEventをWorkStateに変換
   ↓
11. CalendarEventService → WorkStateFactory.createFromCalendarEvent()
   ↓
12. WorkStateFactory → EventDescription.tryParse() (堅牢性: 破損データの処理)
   ↓
13. WorkStateFactory → MetadataMigrator.migrate() (拡張性: 古いバージョンのマイグレーション)
   ↓
14. WorkStateFactory → WorkState[] を作成（破損データは isCorrupted: true でマーク）
   ↓
15. CalendarEventService → WorkState[] を返す
   ↓
16. UI Layer → WorkState[] を表示（破損データは警告表示）
```

### データ破損時の処理フロー

```
1. CalendarEventService → WorkStateFactory.createFromCalendarEvent()
   ↓
2. WorkStateFactory → EventDescription.tryParse()
   ↓
3. EventDescription.tryParse() → JSON解析エラーを検出
   ↓
4. WorkStateFactory → ValidationError[] を作成
   ↓
5. WorkStateFactory → WorkState.markAsCorrupted()
   ↓
6. WorkState → isCorrupted: true, validationErrors: ValidationError[]
   ↓
7. WorkStateFactory → Domain Event: TaskBookmarkCorrupted
   ↓
8. EventHandler → UIMessenger.sendMessage() (エラー通知)
   ↓
9. EventHandler → Logger.error() (エラーログ)
   ↓
10. UI Layer → 破損データを表示（警告アイコン、エラー詳細）
```

### マイグレーションフロー

```
1. CalendarEventService → WorkStateFactory.createFromCalendarEvent()
   ↓
2. WorkStateFactory → EventDescription.parse()
   ↓
3. EventDescription.parse() → WorkStateMetadata (version: "1.0.0") を取得
   ↓
4. WorkStateFactory → SchemaVersion.parse("1.0.0")
   ↓
5. WorkStateFactory → SchemaVersion.parse("1.1.0") (最新バージョン)
   ↓
6. WorkStateFactory → MetadataMigrator.canMigrate() → true
   ↓
7. WorkStateFactory → MetadataMigrator.migrate()
   ↓
8. MetadataMigrator → v1.0.0 → v1.1.0 のマイグレーション戦略を適用
   ↓
9. MetadataMigrator → WorkStateMetadata (version: "1.1.0") を作成
   ↓
10. MetadataMigrator → extensions フィールドに未知のフィールドを保持（前方互換性）
   ↓
11. WorkStateFactory → WorkState (version: "1.1.0") を作成
   ↓
12. CalendarEventService → WorkState を返す
```

---

## 統合ポイント

### 1. Google Calendar API v3
- **目的**: カレンダーイベントのCRUD操作
- **実装**: `GoogleCalendarAdapter`（Unit 1から拡張）
- **エラーハンドリング**: 
  - Retry パターン（最大3回、指数バックオフ）
  - レート制限エラー（429）の処理
  - ネットワークエラーの処理
- **認証**: Unit 1の認証トークンを使用

### 2. Unit 1 (認証) との統合
- **入力**: `CalendarId`, `AccessToken` - 認証状態から取得
- **依存**: 認証済みである必要がある
- **実装**: `AuthenticationService`（Unit 1）から認証状態を取得

### 3. Unit 2 (タブキャプチャ) との統合
- **入力**: `TabInfo[]` - タブ情報の配列
- **依存**: TabInfo型の定義（Bolt 3で実装予定、現時点ではインターフェース定義のみ）

### 4. Service Worker ↔ UI通信
- **目的**: 保存・更新・削除の結果をUIに通知
- **実装**: `UIMessenger`（Unit 1から再利用）
- **メッセージタイプ**:
  - `WORK_STATE_CREATED`: 保存成功
  - `WORK_STATE_UPDATED`: 更新成功
  - `WORK_STATE_DELETED`: 削除成功
  - `WORK_STATE_CORRUPTED`: データ破損の検出

---

## エラーハンドリング戦略

### 1. ネットワークエラー
- **Retry パターン**: 最大3回、指数バックオフ
- **実装**: `RetryHandler`（Unit 1から再利用）
- **エラー通知**: `UIMessenger`でUIに通知

### 2. APIエラー
- **レート制限エラー（429）**: `Retry-After`ヘッダーを確認し、待機
- **認証エラー（401）**: Unit 1の認証フローを再実行
- **その他のエラー**: ユーザーフレンドリーなメッセージを表示

### 3. データ検証エラー
- **スキーマバージョンの不一致**: 自動マイグレーションを試行
- **JSON解析エラー**: 部分的に読み込み可能な場合は`isCorrupted: true`でマーク
- **必須フィールドの欠損**: `ValidationError`を作成し、エラー詳細を記録

### 4. データ破損
- **段階的な検証**: JSON形式 → スキーマバージョン → 必須フィールド → オプションフィールド
- **部分的な読み込み**: 各段階でエラーが発生しても、それまでのデータは保持
- **エラー情報の記録**: `ValidationError[]`に詳細を記録
- **UIでの表示**: 破損データは視覚的に区別し、エラー詳細を表示可能にする

---

## パフォーマンス要件への対応

### 1. レスポンス時間
- **保存時間**: 2秒以内（NFR-001）
  - Google Calendar API呼び出し: 1秒以内
  - データ変換: 100ms以内
  - エラーハンドリング: 500ms以内（リトライ含む）

- **一覧取得時間**: 過去30日分（最大600件）を3秒以内（NFR-001）
  - Google Calendar API呼び出し: 2秒以内
  - データ変換（600件）: 500ms以内
  - マイグレーション（必要に応じて）: 500ms以内

### 2. スループット
- **同時保存リクエスト**: 前のリクエストが完了するまで次のリクエストをキューイング
- **API呼び出し頻度**: Google Calendar APIのレート制限（1秒あたり100リクエスト）を超えないように制御

### 3. リソース使用量
- **メモリ使用量**: 50MB以内（通常時）
- **CPU使用率**: バックグラウンド処理時のCPU使用率は5%以内（アイドル時）

---

## セキュリティ要件への対応

### 1. 認証と認可
- **OAuth 2.0準拠**: Unit 1の認証トークンを使用
- **トークン管理**: Unit 1の`TokenRefreshService`を使用
- **認証状態の検証**: 各API呼び出し前に認証状態を確認

### 2. データ保護
- **機密情報の取り扱い**: URLに機密情報が含まれる可能性があることをユーザーに警告
- **データ暗号化**: ネットワーク通信はHTTPS経由（Google Calendar APIは自動的にHTTPS）
- **データの最小化**: 必要最小限の情報のみを保存（URL、タイトル、ファビコン、メタデータ）

### 3. コンテンツセキュリティポリシー（CSP）
- **Manifest V3準拠**: Content Security Policyに準拠
- **外部リソース**: 信頼できるドメイン（`*.googleapis.com`）からのみリソースを読み込む

---

## 拡張性と後方互換性への対応

### 1. スキーマバージョニング
- **セマンティックバージョニング**: メジャー.マイナー.パッチ形式を使用
- **バージョン管理**: `SchemaVersion` Value Objectで管理
- **マイグレーション**: `MetadataMigrator`で自動マイグレーション

### 2. 後方互換性
- **古いバージョンのデータ**: 自動的に最新バージョンにマイグレーション
- **マイグレーション戦略**: メジャーバージョンが同じ場合は自動マイグレーション

### 3. 前方互換性
- **未知のフィールド**: `extensions`フィールドに保持
- **部分的な読み込み**: 新しいバージョンのデータは、古いバージョンでも部分的に読み込める

### 4. データの永続性
- **長期的な互換性**: 数年にわたって保持されるデータに対応
- **マイグレーションの可逆性**: 可能な限り、マイグレーション前のデータ構造を保持（監査用）

---

## 技術スタック

### 言語とフレームワーク
- **TypeScript**: 型安全性の確保
- **Chrome Extension API**: Manifest V3準拠

### 外部API
- **Google Calendar API v3**: カレンダーイベントのCRUD操作
- **Chrome Identity API**: OAuth 2.0認証（Unit 1から継承）

### データ形式
- **JSON**: イベント説明欄に格納
- **ISO 8601**: 日時形式

---

## デプロイメントモデル

### Chrome拡張機能
- **Service Worker**: バックグラウンド処理
- **Side Panel**: UI表示
- **Manifest V3**: 最新のChrome拡張機能仕様に準拠

### 依存関係
- **Unit 1**: 認証機能、カレンダーID（既に実装済み）
- **Unit 2**: TabInfo型の参照（Bolt 3で実装予定、現時点ではインターフェース定義のみ）

---

## 実装上の注意事項

### 1. イミュータビリティ
- すべてのValue Objectsは不変である
- WorkStateの更新は、新しいインスタンスを作成する必要がある

### 2. エラーハンドリング
- バリデーションエラーは、ドメイン例外として投げる（完全に読み込み不可能な場合）
- 部分的に読み込み可能な場合は、`ValidationError`を保持してWorkStateを作成
- インフラストラクチャエラー（APIエラーなど）は、アプリケーション層で処理

### 3. データ破損への対応
- **段階的な検証**: JSON形式 → スキーマバージョン → 必須フィールド → オプションフィールドの順で検証
- **部分的な読み込み**: 各段階でエラーが発生しても、それまでのデータは保持
- **エラー情報の記録**: どのフィールドでどのようなエラーが発生したかを記録
- **UIでの表示**: 破損データは視覚的に区別し、エラー詳細を表示可能にする

### 4. スキーマバージョニングとマイグレーション
- **自動マイグレーション**: 読み込み時に、古いバージョンのデータを自動的に最新バージョンにマイグレーション
- **マイグレーション戦略**: メジャーバージョンが同じ場合は自動マイグレーション、異なる場合は明示的なマイグレーションが必要
- **データの保持**: マイグレーション後も、元のデータ構造の情報は`extensions`に保持（監査用）
- **前方互換性**: 新しいバージョンのデータは、古いバージョンでも部分的に読み込める（未知のフィールドは`extensions`に保持）

### 5. パフォーマンス
- 大量のイベント取得時は、ページネーションを考慮
- メタデータの解析は、必要最小限の範囲で行う
- 破損データの検証は、パフォーマンスに影響を与えない範囲で行う
- マイグレーションは、必要に応じてのみ実行（バージョンが異なる場合のみ）

---

**作成日**: 2026-01-21  
**最終更新**: 2026-01-21  
**ステータス**: 設計完了
