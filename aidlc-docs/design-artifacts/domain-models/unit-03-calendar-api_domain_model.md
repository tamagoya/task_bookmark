# Domain Model: Unit 3 - Google Calendar API連携

## 概要
本ドキュメントは、Unit 3（Google Calendar API連携）のDomain Modelを定義します。Domain-Driven Design原則に基づいて、カレンダーイベントと仕事状態のビジネスロジックをインフラストラクチャから独立してモデル化しています。

## ドメインの境界
カレンダーAPI連携ドメインは、仕事状態の保存、読み取り、更新を担当します。Google Calendar APIの詳細な実装やHTTP通信の詳細は含みません。タブ情報（TabInfo）はUnit 2で定義されるため、ここではインターフェースとして参照します。

## 堅牢性要件
GoogleカレンダーのWebUIやその他カレンダーツールによって、保存されているデータが書き換えられる可能性があります。そのため、以下の堅牢性要件を満たします：

1. **部分的な読み込み**: データが部分的に破損している場合でも、読み込める部分は表示する
2. **破損データの識別**: データが破損している場合、明確に識別できる
3. **エラー情報の提示**: どのフィールドが破損しているかをユーザーに提示する
4. **最小限の必須フィールド**: `eventId`と`title`が有効であれば、部分的にでも読み込み可能

---

## Aggregates

### TaskBookmark Aggregate

**Aggregate Root**: `TaskBookmark`

仕事状態（タスクブックマーク）の集約ルートです。カレンダーイベントとメタデータを一貫性のある単位として管理します。

#### 構成要素
- **Entity**: `WorkState`
- **Value Objects**: `EventId`, `EventTitle`, `EventDescription`, `WorkStateMetadata`, `SchemaVersion`, `TabInfo`（Unit 2から参照）

#### 不変条件
- イベントIDは一意である必要がある
- 仕事名（タイトル）は空文字列であってはならない
- メタデータのスキーマバージョンは有効なバージョンである必要がある（破損時は緩和）
- タブ情報の配列は空であってはならない（少なくとも1つのタブが必要、破損時は緩和）
- スキーマバージョンはセマンティックバージョニング形式である必要がある

#### 境界
- 仕事状態の変更は、Aggregate Rootを通じてのみ行う
- 外部からの直接的な状態変更は禁止
- カレンダーイベントの永続化はRepositoryを通じて行う

---

## Entities

### WorkState

仕事状態を表すエンティティです。カレンダーイベントと対応し、タブ情報とメタデータを保持します。

#### 識別子
- `eventId: EventId` - カレンダーイベントID（一意の識別子）

#### 属性
- `title: EventTitle` - 仕事名（カレンダーイベントのタイトル）
- `description: EventDescription` - イベント説明（JSON形式のメタデータ）
- `startTime: Date` - 開始時刻
- `endTime: Date` - 終了時刻
- `metadata: WorkStateMetadata` - 仕事状態のメタデータ（タブ情報、メモ、前後関係など）

#### ビジネスルール
1. **時間の一貫性**: `startTime`は`endTime`より前である必要がある（破損時は緩和可能）
2. **メタデータの整合性**: `description`に含まれるJSONは`metadata`と一致している必要がある（破損時は部分的に読み込み可能）
3. **タブ情報の存在**: 正常な状態では`metadata.tabs`は少なくとも1つのタブを含む必要がある（破損時は空配列も許容）
4. **スキーマバージョン**: 正常な状態では`metadata.version`は有効なスキーマバージョンである必要がある（破損時は不明として扱う）
5. **破損データの扱い**: `isCorrupted`が`true`の場合、`metadata`は`null`でも可。ただし、`title`と`eventId`は必須
6. **部分的な読み込み**: データが部分的に破損している場合でも、読み込める部分は表示する

#### ライフサイクル
1. **作成**: タブ情報とメタデータから作成される
2. **保存**: カレンダーイベントとして永続化される
3. **更新**: URL編集やメタデータ更新により変更される
4. **削除**: カレンダーイベントが削除される（オプション）

#### メソッド（ドメインロジック）
- `updateTitle(newTitle: EventTitle): void`
  - 仕事名を更新
  - 不変条件: 新しいタイトルは空文字列であってはならない
  
- `updateMetadata(newMetadata: WorkStateMetadata): void`
  - メタデータを更新
  - 不変条件: 新しいメタデータは有効なスキーマバージョンを持つ必要がある
  
- `recordRestoreRelation(restoredToEventId: EventId): void`
  - 復元関係を記録（この仕事状態から別の仕事状態への復元）
  - 不変条件: `restoredToEventId`は既存のイベントIDである必要がある
  
- `recordRestoredFrom(restoredFromEventId: EventId): void`
  - 復元元を記録（この仕事状態が別の仕事状態から復元された）
  - 不変条件: `restoredFromEventId`は既存のイベントIDである必要がある

- `markAsCorrupted(errors: ValidationError[]): void`
  - データが破損していることをマーク
  - 不変条件: `errors`は空配列であってはならない
  
- `getCorruptedFields(): string[]`
  - 破損しているフィールドのリストを取得
  - 戻り値: 破損フィールド名の配列（例: ["metadata", "description"]）
  
- `canPartiallyLoad(): boolean`
  - 部分的に読み込み可能かどうかを判定
  - 戻り値: `title`と`eventId`が有効であれば`true`

- `updateTabs(newTabs: TabInfo[]): void` (Bolt 8: URL編集機能)
  - タブリスト全体を更新
  - 不変条件: `newTabs`は空配列であってはならない、各要素の`index`は0から始まる連続した整数である必要がある
  - エラー: 空配列の場合`Error('Tab list cannot be empty')`、無効なインデックスの場合`Error('Tab indices must be consecutive starting from 0')`
  
- `addTab(tab: TabInfo, index?: number): void` (Bolt 8: URL編集機能)
  - タブを追加
  - 不変条件: `tab`は有効な`TabInfo`である必要がある、`index`が指定された場合0以上かつ現在のタブ数以下である必要がある
  - エラー: 無効なTabInfoの場合`Error('Invalid tab information')`、無効なインデックスの場合`Error('Index out of range')`
  
- `removeTab(tabIndex: number): void` (Bolt 8: URL編集機能)
  - タブを削除
  - 不変条件: `tabIndex`は0以上かつ現在のタブ数未満である必要がある、削除後タブリストは空であってはならない
  - エラー: インデックスが範囲外の場合`Error('Index out of range')`、最後の1つのタブを削除しようとした場合`Error('Cannot remove the last tab')`
  
- `reorderTabs(fromIndex: number, toIndex: number): void` (Bolt 8: URL編集機能)
  - タブの順序を変更
  - 不変条件: `fromIndex`と`toIndex`は0以上かつ現在のタブ数未満である必要がある
  - エラー: インデックスが範囲外の場合`Error('Index out of range')`
  
- `validateTabList(tabs: TabInfo[]): ValidationError[]` (Bolt 8: URL編集機能)
  - タブリストの検証
  - 戻り値: 検証エラーのリスト（エラーがない場合は空配列）
  - 検証ルール: 空配列チェック、インデックスの連続性、TabInfoの有効性

---

## Value Objects

### EventId

カレンダーイベントIDを表すValue Objectです。不変性を保証します。

#### 属性
- `value: string` - イベントIDの値（Google Calendar APIから取得）

#### 不変性
- 作成後は変更不可
- 等価性は値で判定

#### バリデーション
- 空文字列は許可しない
- Google Calendar APIのイベントID形式に準拠

#### ファクトリメソッド
- `create(value: string): EventId`
  - イベントIDを作成
  - バリデーション: 空文字列でないことを確認

---

### EventTitle

イベントタイトル（仕事名）を表すValue Objectです。不変性を保証します。

#### 属性
- `value: string` - タイトルの値

#### 不変性
- 作成後は変更不可
- 等価性は値で判定

#### バリデーション
- 空文字列は許可しない
- 最大長: 200文字（Google Calendar APIの制限に準拠）

#### ファクトリメソッド
- `create(value: string): EventTitle`
  - タイトルを作成
  - バリデーション: 空文字列でないこと、最大長を超えないことを確認

---

### EventDescription

イベント説明（JSON形式のメタデータ）を表すValue Objectです。不変性を保証します。スキーマバージョニングと拡張性をサポートします。

#### 属性
- `value: string` - JSON形式のメタデータ文字列

#### 不変性
- 作成後は変更不可
- 等価性は値で判定

#### バリデーション
- 有効なJSON形式である必要がある
- スキーマバージョンが含まれている必要がある

#### ファクトリメソッド
- `create(metadata: WorkStateMetadata): EventDescription`
  - メタデータからJSON文字列を作成
  - バリデーション: メタデータが有効であることを確認
  - 注意: `extensions`フィールドも含めて保存（将来の拡張性のため）
  
- `parse(jsonString: string): WorkStateMetadata`
  - JSON文字列からメタデータを解析
  - バリデーション: JSON形式が有効であることを確認
  - 注意: 部分的に破損している場合でも、読み込める部分は返す
  - 注意: 未知のフィールドは`extensions`に格納（前方互換性のため）

- `tryParse(jsonString: string): { metadata: WorkStateMetadata | null, errors: ValidationError[] }`
  - JSON文字列からメタデータを解析（堅牢性を重視）
  - 戻り値: メタデータ（部分的に読み込めた場合）とエラーリスト
  - バリデーション: 段階的に検証し、エラーがあっても部分的に読み込める部分は返す
  - 注意: 未知のフィールドは`extensions`に格納（前方互換性のため）

- `migrate(jsonString: string, targetVersion: SchemaVersion): string`
  - JSON文字列を指定されたバージョンにマイグレーション
  - 戻り値: マイグレーション後のJSON文字列
  - バリデーション: マイグレーション可能なバージョンであることを確認

---

### WorkStateMetadata

仕事状態のメタデータを表すValue Objectです。タブ情報、メモ、前後関係などを含みます。スキーマバージョニングと拡張性をサポートします。

#### 属性
- `version: SchemaVersion` - スキーマバージョン（例: "1.0"）
- `tabs: TabInfo[]` - タブ情報の配列（Unit 2から参照）
- `memo?: string` - 作業メモ（任意）
- `savedAt: string` - 保存日時（ISO 8601形式）
- `restoredFrom?: string` - 復元元のイベントID（任意）
- `restoredTo?: RestoredToEntry[]` - 復元先の情報リスト（任意、オブジェクト配列）
  - `RestoredToEntry.eventId: string` - 復元先のイベントID
  - `RestoredToEntry.restoredAt: string` - 復元日時（ISO 8601形式）
- `extensions?: Record<string, unknown>` - 拡張フィールド（将来のバージョンで追加される可能性のあるフィールド）

#### 不変性
- 作成後は変更不可（新しいメタデータを作成する必要がある）
- 等価性はすべての属性で判定（`extensions`は除外）

#### バリデーション
- `version`は有効なスキーマバージョンである必要がある
- `tabs`は少なくとも1つのタブを含む必要がある（正常な状態）
- `savedAt`は有効なISO 8601形式である必要がある
- `restoredFrom`は有効なイベントID形式である必要がある
- `restoredTo`の各エントリは有効な`eventId`と`restoredAt`を含む必要がある
- `extensions`は任意の構造を持つことができる（将来の拡張用）

#### ファクトリメソッド
- `create(version: SchemaVersion, tabs: TabInfo[], savedAt: Date, memo?: string, extensions?: Record<string, unknown>): WorkStateMetadata`
  - メタデータを作成
  - バリデーション: すべての必須フィールドが有効であることを確認

- `createFromRaw(raw: Record<string, unknown>, version: SchemaVersion): WorkStateMetadata`
  - 生データからメタデータを作成（読み込み時、マイグレーション時）
  - バリデーション: バージョンに応じた必須フィールドを検証
  - 未知のフィールドは`extensions`に格納（前方互換性のため）

#### 拡張性の考慮
- **未知のフィールドの保持**: 新しいバージョンで追加されたフィールドは`extensions`に保持され、古いバージョンでも読み込める
- **後方互換性**: 古いバージョンのデータは、新しいバージョンで読み込める（マイグレーション可能）
- **前方互換性**: 新しいバージョンのデータは、古いバージョンでも部分的に読み込める（未知のフィールドは`extensions`として保持）

---

### SchemaVersion

スキーマバージョンを表すValue Objectです。セマンティックバージョニング（Semantic Versioning）に準拠します。

#### 属性
- `major: number` - メジャーバージョン（破壊的変更）
- `minor: number` - マイナーバージョン（後方互換性のある追加）
- `patch: number` - パッチバージョン（バグ修正）

#### 不変性
- 作成後は変更不可
- 等価性はすべての属性で判定

#### バリデーション
- `major`、`minor`、`patch`は0以上の整数である必要がある

#### ファクトリメソッド
- `create(major: number, minor: number, patch: number): SchemaVersion`
  - スキーマバージョンを作成
  - バリデーション: すべての値が0以上の整数であることを確認

- `parse(versionString: string): SchemaVersion`
  - バージョン文字列（例: "1.0.0"）からスキーマバージョンを作成
  - バリデーション: セマンティックバージョニング形式であることを確認

- `toString(): string`
  - バージョン文字列に変換（例: "1.0.0"）

#### 互換性判定メソッド
- `isCompatibleWith(other: SchemaVersion): boolean`
  - 他のバージョンと互換性があるかどうかを判定
  - ルール: 同じメジャーバージョンであれば互換性がある

- `canMigrateTo(target: SchemaVersion): boolean`
  - 指定されたバージョンにマイグレーション可能かどうかを判定
  - ルール: メジャーバージョンが同じ、または新しいメジャーバージョンがマイグレーションをサポートしている場合

---

### TabInfo（Unit 2から参照）

タブ情報を表すValue Objectです。Unit 2で定義されますが、ここではインターフェースとして参照します。

#### 想定される属性（Unit 2で定義）
- `url: string` - タブのURL
- `title: string` - タブのタイトル
- `faviconUrl?: string` - ファビコンURL（任意）
- `index: number` - タブの順序
- `extensions?: Record<string, unknown>` - 拡張フィールド（将来の拡張用）

---

### ValidationError

データ検証エラーを表すValue Objectです。破損データの詳細を記録します。

#### 属性
- `field: string` - エラーが発生したフィールド名（例: "metadata", "description", "tabs[0].url"）
- `errorCode: string` - エラーコード（例: "INVALID_JSON", "MISSING_FIELD", "INVALID_SCHEMA_VERSION"）
- `errorMessage: string` - エラーメッセージ（ユーザー向け）
- `severity: 'error' | 'warning'` - エラーの深刻度
- `recoverable: boolean` - 部分的に読み込み可能かどうか

#### 不変性
- 作成後は変更不可
- 等価性はすべての属性で判定

#### ファクトリメソッド
- `create(field: string, errorCode: string, errorMessage: string, severity: 'error' | 'warning', recoverable: boolean): ValidationError`
  - 検証エラーを作成
  - バリデーション: すべての必須フィールドが有効であることを確認

#### エラーコードの定義
- `INVALID_JSON`: JSON形式が無効
- `MISSING_FIELD`: 必須フィールドが欠落
- `INVALID_SCHEMA_VERSION`: スキーマバージョンが無効
- `INVALID_TAB_DATA`: タブデータが無効
- `INVALID_DATE_FORMAT`: 日付形式が無効
- `PARTIAL_DATA_LOSS`: データの一部が失われた（部分的に読み込み可能）

---

## Domain Events

### TaskBookmarkCreated

タスクブックマークが作成された時に発行されるDomain Eventです。

#### ペイロード
- `eventId: string` - 作成されたイベントID
- `title: string` - 仕事名
- `createdAt: Date` - 作成日時

#### 発生タイミング
- `WorkState`がカレンダーイベントとして保存された時

---

### TaskBookmarkUpdated

タスクブックマークが更新された時に発行されるDomain Eventです。

#### ペイロード
- `eventId: string` - 更新されたイベントID
- `updatedFields: string[]` - 更新されたフィールドのリスト
- `updatedAt: Date` - 更新日時

#### 発生タイミング
- `WorkState`のタイトルまたはメタデータが更新された時

---

### TaskBookmarkDeleted

タスクブックマークが削除された時に発行されるDomain Eventです。

#### ペイロード
- `eventId: string` - 削除されたイベントID
- `deletedAt: Date` - 削除日時

#### 発生タイミング
- `WorkState`がカレンダーイベントから削除された時

---

### TaskBookmarkCorrupted

タスクブックマークのデータが破損していることが検出された時に発行されるDomain Eventです。

#### ペイロード
- `eventId: string` - 破損したイベントID
- `errors: ValidationError[]` - 検証エラーのリスト
- `detectedAt: Date` - 検出日時
- `canPartiallyLoad: boolean` - 部分的に読み込み可能かどうか

#### 発生タイミング
- カレンダーイベントからWorkStateを読み込む際に、データの破損が検出された時
- 部分的にでも読み込み可能な場合は、このイベントを発行してから部分的に読み込む

#### ビジネス意味
- データの整合性が失われたことを示す
- UIで警告を表示するために使用
- ユーザーにデータの修復を促すために使用

---

### RestoreRelationRecorded

復元関係が記録された時に発行されるDomain Eventです。

#### ペイロード
- `fromEventId: string` - 復元元のイベントID
- `toEventId: string` - 復元先のイベントID
- `recordedAt: Date` - 記録日時

#### 発生タイミング
- `WorkState`の`recordRestoreRelation`または`recordRestoredFrom`メソッドが呼ばれた時

---

### TabsUpdated (Bolt 8: URL編集機能)

タブリストが更新された時に発行されるDomain Eventです。

#### ペイロード
- `eventId: string` - 更新されたイベントID
- `updatedTabs: TabInfo[]` - 更新後のタブ情報の配列
- `operationType: 'update' | 'add' | 'remove' | 'reorder'` - 操作の種類
- `operationDetails?: { fromIndex?: number; toIndex?: number; addedTab?: TabInfo; removedTabIndex?: number }` - 操作の詳細（任意）
- `updatedAt: Date` - 更新日時

#### 発生タイミング
- `WorkState`のタブリストが更新された時（`updateTabs`、`addTab`、`removeTab`、`reorderTabs`が呼ばれた時）

#### ビジネスルール
- `updatedTabs`配列は空であってはならない（少なくとも1つのタブが必要）
- `operationType`は実行された操作の種類を正確に反映する必要がある
- `operationDetails`は、操作の種類に応じて適切な情報を含む必要がある

---

## Repositories

### CalendarEventRepository

カレンダーイベントの永続化を担当するRepositoryインターフェースです。

#### メソッド
- `save(workState: WorkState, calendarId: CalendarId, accessToken: AccessToken): Promise<EventId>`
  - 仕事状態をカレンダーイベントとして保存
  - 戻り値: 作成されたイベントID
  
- `findById(eventId: EventId, calendarId: CalendarId, accessToken: AccessToken): Promise<WorkState | null>`
  - イベントIDで仕事状態を取得
  - 戻り値: 見つかった場合はWorkState、見つからない場合はnull
  - 注意: データが破損している場合でも、部分的に読み込み可能であればWorkStateを返す（`isCorrupted: true`）
  
- `findByDateRange(startDate: Date, endDate: Date, calendarId: CalendarId, accessToken: AccessToken): Promise<WorkState[]>`
  - 日付範囲で仕事状態の一覧を取得
  - 戻り値: 該当する仕事状態の配列（破損データも含む）
  - 注意: データが破損している場合でも、部分的に読み込み可能であればWorkStateを返す（`isCorrupted: true`）
  
- `update(workState: WorkState, calendarId: CalendarId, accessToken: AccessToken): Promise<void>`
  - 仕事状態を更新
  - 不変条件: イベントIDが既に存在する必要がある
  
- `delete(eventId: EventId, calendarId: CalendarId, accessToken: AccessToken): Promise<void>`
  - 仕事状態を削除
  - 不変条件: イベントIDが既に存在する必要がある

#### 注意事項
- 実装はInfrastructure層で行う（`CalendarEventRepositoryImpl`）
- Google Calendar APIの詳細は実装に含まれる

---

## Factories

### WorkStateFactory

WorkStateの作成を担当するFactoryです。複雑なオブジェクト作成と不変条件の検証を行います。スキーマバージョニングとマイグレーションをサポートします。

#### ファクトリメソッド

- `createFromTabs(eventId: EventId, title: EventTitle, tabs: TabInfo[], startTime: Date, endTime: Date, memo?: string): WorkState`
  - タブ情報からWorkStateを作成
  - バリデーション:
    - `startTime`は`endTime`より前であること
    - `tabs`は少なくとも1つのタブを含むこと
    - `title`は空文字列でないこと
  - 注意: 現在のスキーマバージョン（最新）を使用
  
- `createFromCalendarEvent(eventId: EventId, title: string, description: string, startTime: Date, endTime: Date): WorkState`
  - カレンダーイベントからWorkStateを作成（読み込み時）
  - バリデーション:
    - `description`が有効なJSON形式であること（破損時は部分的に読み込み）
    - スキーマバージョンが有効であること（破損時は不明として扱う）
    - `startTime`は`endTime`より前であること（破損時は緩和）
  - 注意: データが部分的に破損している場合でも、読み込める部分は含めてWorkStateを作成する
  - 注意: 古いバージョンのデータは自動的にマイグレーションされる（必要に応じて）
  - 戻り値: 正常な場合は`isCorrupted: false`、破損している場合は`isCorrupted: true`のWorkState

- `createFromCalendarEventWithMigration(eventId: EventId, title: string, description: string, startTime: Date, endTime: Date, targetVersion: SchemaVersion): WorkState`
  - カレンダーイベントからWorkStateを作成（明示的なマイグレーション指定）
  - バリデーション: 上記の`createFromCalendarEvent`と同じ
  - 注意: 指定されたバージョンにマイグレーションしてから作成

- `createFromCorruptedEvent(eventId: EventId, title: string, description: string | null, startTime: Date, endTime: Date, errors: ValidationError[]): WorkState`
  - 破損したカレンダーイベントからWorkStateを作成（部分的に読み込み可能な場合）
  - バリデーション:
    - `title`と`eventId`は必須（これらが無効な場合は例外を投げる）
    - `description`が`null`でも可（破損時）
    - `metadata`は`null`でも可（破損時）
  - 戻り値: `isCorrupted: true`のWorkState
  
- `createWithRestoreRelation(eventId: EventId, title: EventTitle, tabs: TabInfo[], startTime: Date, endTime: Date, restoredFromEventId: EventId, memo?: string): WorkState`
  - 復元関係を含むWorkStateを作成
  - バリデーション:
    - 上記の`createFromTabs`と同じ
    - `restoredFromEventId`が有効なイベントIDであること

---

### MetadataMigrator

メタデータのマイグレーションを担当するFactoryです。古いバージョンのデータを新しいバージョンに変換します。

#### マイグレーションメソッド

- `migrate(metadata: WorkStateMetadata, targetVersion: SchemaVersion): WorkStateMetadata`
  - メタデータを指定されたバージョンにマイグレーション
  - 戻り値: マイグレーション後のメタデータ
  - バリデーション: マイグレーション可能なバージョンであることを確認
  - 注意: 後方互換性を保つため、既存のフィールドは保持される

- `canMigrate(fromVersion: SchemaVersion, toVersion: SchemaVersion): boolean`
  - 指定されたバージョン間でマイグレーション可能かどうかを判定
  - 戻り値: マイグレーション可能な場合`true`
  - ルール: 同じメジャーバージョン、またはマイグレーションをサポートしている場合

- `getMigrationPath(fromVersion: SchemaVersion, toVersion: SchemaVersion): SchemaVersion[]`
  - マイグレーションパス（中間バージョンのリスト）を取得
  - 戻り値: マイグレーションに必要な中間バージョンのリスト
  - 注意: 複数のバージョンを経由する必要がある場合に使用

#### サポートされるマイグレーション

- **v1.0.0 → v1.1.0**: 新しいフィールドの追加（後方互換性あり）
- **v1.x.x → v2.0.0**: メジャーバージョンアップ（マイグレーション戦略が必要）
- **v2.0.0 → v2.1.0**: 新しいフィールドの追加（後方互換性あり）

#### マイグレーション戦略

1. **後方互換性のある変更（マイナーバージョンアップ）**:
   - 新しいフィールドの追加: 既存データには影響なし
   - オプションフィールドの追加: 既存データには影響なし
   - デフォルト値の設定: 既存データにデフォルト値を適用

2. **破壊的変更（メジャーバージョンアップ）**:
   - フィールドの削除: 削除されたフィールドは`extensions`に保持（前方互換性のため）
   - フィールド名の変更: 旧フィールド名から新フィールド名へのマッピング
   - データ型の変更: 変換ロジックを実装

3. **データの保持**:
   - 未知のフィールドは`extensions`に保持
   - マイグレーション後も、元のデータ構造の情報は保持（監査用）

---

## ビジネスルール

### 仕事状態の保存に関するルール
1. **必須フィールド**: 仕事名とタブ情報は必須である
2. **時間の整合性**: 開始時刻は終了時刻より前である必要がある
3. **タブ数の制限**: 少なくとも1つのタブが必要（空の仕事状態は保存不可）
4. **スキーマバージョン**: メタデータには有効なスキーマバージョンが含まれている必要がある

### 仕事状態の更新に関するルール
1. **イベントIDの一意性**: 更新時、イベントIDは変更不可
2. **メタデータの整合性**: 更新後のメタデータは有効なスキーマバージョンを持つ必要がある
3. **タブ情報の保持**: タブ情報を空にすることはできない

### URL編集に関するルール (Bolt 8: URL編集機能)
1. **タブリストの最小要件**:
   - タブリストは空であってはならない（少なくとも1つのタブが必要）
   - 最後の1つのタブは削除できない

2. **タブの順序**:
   - タブのインデックスは0から始まる連続した整数である必要がある（0, 1, 2, ...）
   - タブの順序を変更した後も、インデックスは連続している必要がある

3. **URLの検証**:
   - 追加されるURLは有効なURL形式である必要がある（`TabInfo`のバリデーションに準拠）
   - 同じURLが複数回出現しても問題ない（許可）

4. **編集操作の整合性**:
   - 編集操作（追加、削除、順序変更）は、タブリストの整合性を保つ必要がある
   - 編集後、`metadata.tabs`と`description`（JSON形式）が一致している必要がある

5. **編集履歴の記録**（将来の拡張）:
   - 編集履歴は`WorkStateMetadata.extensions`に記録可能（オプション）
   - 編集履歴には、編集日時、操作の種類、編集前後の状態を含めることができる

### 復元関係に関するルール
1. **循環参照の防止**: 復元関係は循環参照を形成してはならない（将来的な拡張）
2. **イベントIDの存在**: 復元関係に含まれるイベントIDは既に存在する必要がある

### スキーマバージョニングに関するルール
1. **後方互換性**: 新しいスキーマバージョンは、可能な限り後方互換性を保つ
2. **マイグレーション**: 古いスキーマバージョンのデータは、新しいバージョンにマイグレーション可能である必要がある
3. **前方互換性**: 新しいバージョンのデータは、古いバージョンでも部分的に読み込める（未知のフィールドは`extensions`に保持）
4. **セマンティックバージョニング**: メジャー.マイナー.パッチ形式を使用
   - メジャーバージョン: 破壊的変更（マイグレーションが必要）
   - マイナーバージョン: 後方互換性のある追加（自動マイグレーション可能）
   - パッチバージョン: バグ修正（互換性に影響なし）
5. **データの永続性**: Googleカレンダー上のデータは数年にわたって保持されるため、長期的な互換性を考慮
6. **拡張フィールド**: 将来の拡張のために、未知のフィールドは`extensions`に保持
7. **マイグレーションの自動化**: 読み込み時に自動的に最新バージョンにマイグレーション（必要に応じて）
8. **マイグレーションの可逆性**: 可能な限り、マイグレーション前のデータ構造を保持（監査用）

### データ破損と堅牢性に関するルール
1. **部分的な読み込み**: データが部分的に破損している場合でも、読み込める部分は表示する
2. **最小限の必須フィールド**: `eventId`と`title`が有効であれば、部分的にでも読み込み可能
3. **エラー情報の保持**: 破損データには、どのフィールドが破損しているかの情報を含める
4. **ユーザーへの通知**: 破損データは、UIで明確に「データが破損しています」と表示する
5. **修復の可能性**: 部分的に読み込めたデータは、ユーザーが手動で修復できるようにする（将来的な拡張）

---

## 他のUnitsとのインターフェース

### Unit 1（認証）とのインターフェース
- **入力**: `CalendarId`, `AccessToken` - 認証状態から取得
- **依存**: 認証済みである必要がある

### Unit 2（タブキャプチャ）とのインターフェース
- **入力**: `TabInfo[]` - タブ情報の配列
- **依存**: TabInfo型の定義（Bolt 3で実装予定）

### Unit 4（状態復元）とのインターフェース
- **出力**: `WorkState[]` - 保存済み仕事状態の一覧
- **入力**: 復元関係の記録リクエスト

### Unit 5（UI/UX）とのインターフェース
- **出力**: `WorkState[]` - 一覧表示用のデータ
- **入力**: 保存・更新・削除リクエスト

---

## データ構造（JSONスキーマ）

### バージョン1.0.0（初期バージョン）

```json
{
  "version": "1.0.0",
  "tabs": [
    {
      "url": "https://example.com",
      "title": "Example Page",
      "faviconUrl": "https://example.com/favicon.ico",
      "index": 0
    }
  ],
  "memo": "作業メモ",
  "savedAt": "2026-01-21T10:30:00Z",
  "restoredFrom": "event-id-123",
  "restoredTo": ["event-id-456", "event-id-789"]
}
```

### バージョン1.1.0（拡張例：将来の追加フィールド）

```json
{
  "version": "1.1.0",
  "tabs": [
    {
      "url": "https://example.com",
      "title": "Example Page",
      "faviconUrl": "https://example.com/favicon.ico",
      "index": 0,
      "extensions": {
        "pinned": false
      }
    }
  ],
  "memo": "作業メモ",
  "savedAt": "2026-01-21T10:30:00Z",
  "restoredFrom": "event-id-123",
  "restoredTo": ["event-id-456", "event-id-789"],
  "extensions": {
    "tags": ["work", "important"],
    "priority": "high"
  }
}
```

### スキーマバリデーション（バージョン1.0.0）
- `version`: 必須、文字列、セマンティックバージョニング形式（例: "1.0.0"）
- `tabs`: 必須、配列、少なくとも1つの要素を含む（正常な状態）
- `memo`: 任意、文字列
- `savedAt`: 必須、文字列、ISO 8601形式
- `restoredFrom`: 任意、文字列、有効なイベントID形式
- `restoredTo`: 任意、配列、各要素は有効なイベントID形式
- `extensions`: 任意、オブジェクト、任意の構造（将来の拡張用）

### スキーマバリデーション（バージョン1.1.0以降）
- 上記のすべてのフィールド
- `extensions`: 任意、オブジェクト、任意の構造（新しいフィールドはここに追加可能）

### 拡張性の考慮
- **未知のフィールド**: 新しいバージョンで追加されたフィールドは、古いバージョンでは`extensions`として扱われる
- **フィールドの削除**: 削除されたフィールドは、マイグレーション時に`extensions`に保持される（前方互換性のため）
- **フィールド名の変更**: 旧フィールド名は`extensions`に保持され、新フィールド名にマッピングされる

---

## 実装上の注意事項

### イミュータビリティ
- すべてのValue Objectsは不変である
- WorkStateの更新は、新しいインスタンスを作成する必要がある

### エラーハンドリング
- バリデーションエラーは、ドメイン例外として投げる（完全に読み込み不可能な場合）
- 部分的に読み込み可能な場合は、`ValidationError`を保持してWorkStateを作成
- インフラストラクチャエラー（APIエラーなど）は、アプリケーション層で処理

### データ破損への対応
- **段階的な検証**: JSON形式 → スキーマバージョン → 必須フィールド → オプションフィールドの順で検証
- **部分的な読み込み**: 各段階でエラーが発生しても、それまでのデータは保持
- **エラー情報の記録**: どのフィールドでどのようなエラーが発生したかを記録
- **UIでの表示**: 破損データは視覚的に区別し、エラー詳細を表示可能にする

### スキーマバージョニングとマイグレーション
- **自動マイグレーション**: 読み込み時に、古いバージョンのデータを自動的に最新バージョンにマイグレーション
- **マイグレーション戦略**: メジャーバージョンが同じ場合は自動マイグレーション、異なる場合は明示的なマイグレーションが必要
- **データの保持**: マイグレーション後も、元のデータ構造の情報は`extensions`に保持（監査用）
- **前方互換性**: 新しいバージョンのデータは、古いバージョンでも部分的に読み込める（未知のフィールドは`extensions`に保持）
- **拡張フィールド**: 将来の拡張のために、`extensions`フィールドを使用

### パフォーマンス
- 大量のイベント取得時は、ページネーションを考慮
- メタデータの解析は、必要最小限の範囲で行う
- 破損データの検証は、パフォーマンスに影響を与えない範囲で行う

---

**作成日**: 2026-01-21  
**最終更新**: 2026-02-03  
**ステータス**: 設計完了（Bolt 8: URL編集機能の拡張を追加）
