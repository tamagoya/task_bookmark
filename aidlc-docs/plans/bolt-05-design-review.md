# Bolt 5: 保存済み仕事一覧表示 - 既存設計確認結果

## 確認日時
2026-01-22

## 確認対象

### 1. User Story 4 (US-4) の要件 ✅

**機能**: Google Calendarから保存済みの仕事状態を取得し、サイドパネルに時系列で一覧表示する

**受け入れ基準**:
- [ ] サイドパネルに「保存済み仕事」セクションが表示される
- [ ] 専用カレンダーから過去のイベントを取得し、時系列（新しい順）で表示する
- [ ] 各仕事について、以下が表示される：
  - [ ] 仕事名（カレンダーイベントのタイトル）
  - [ ] 保存日時（開始時間と終了時間）
  - [ ] タブ数（視覚的な情報量の指標）
  - [ ] ファビコンのサムネイル（最初の数個のタブのファビコンを表示）
- [ ] 検索機能（仕事名で検索可能）
- [ ] 日付フィルタリング（今日、今週、今月など）
- [ ] データ取得中はローディングインジケーターを表示する
- [ ] 取得エラー時は、エラーメッセージと再試行ボタンを表示する

---

### 2. Domain Model (Unit 3) の確認 ✅

#### WorkState Entity

**属性**:
- `eventId: EventId` - カレンダーイベントID（一意の識別子）
- `title: EventTitle` - 仕事名（カレンダーイベントのタイトル）
- `description: EventDescription | null` - イベント説明（JSON形式のメタデータ）
- `startTime: Date` - 開始時刻
- `endTime: Date` - 終了時刻
- `metadata: WorkStateMetadata | null` - 仕事状態のメタデータ（タブ情報、メモ、前後関係など）

**重要なポイント**:
- `metadata`は`null`の可能性がある（破損データの場合）
- `metadata.tabs`でタブ情報の配列にアクセス可能
- `metadata.memo`でメモにアクセス可能

#### WorkStateMetadata Value Object

**属性**:
- `version: SchemaVersion` - スキーマバージョン
- `tabs: TabInfo[]` - タブ情報の配列
- `savedAt: string` - 保存日時（ISO 8601形式）
- `memo?: string` - 作業メモ（任意）
- `restoredFrom?: string` - 復元元のイベントID（任意）
- `restoredTo?: string[]` - 復元先のイベントID配列（任意）
- `extensions?: Record<string, unknown>` - 拡張フィールド（任意）

**TabInfo Value Object**:
- `url: string` - URL
- `title: string` - タイトル
- `faviconUrl?: string` - ファビコンURL（任意）
- `index: number` - インデックス
- `extensions?: Record<string, unknown>` - 拡張フィールド（任意）

---

### 3. Logical Design (Unit 3) の確認 ✅

#### CalendarEventService

**既に実装済み**:
```typescript
async getWorkStateEvents(
  startDate: Date,
  endDate: Date,
  calendarId: CalendarId,
  accessToken: AccessToken
): Promise<WorkState[]>
```

- 日付範囲で仕事状態の一覧を取得
- `CalendarEventRepository.findByDateRange`を呼び出す
- 破損データも含めて返す（`isCorrupted: true`のWorkStateも含む）

#### CalendarEventRepository

**既に実装済み**:
```typescript
async findByDateRange(
  startDate: Date,
  endDate: Date,
  calendarId: CalendarId,
  accessToken: AccessToken
): Promise<WorkState[]>
```

- Google Calendar APIからイベントを取得
- 各イベントを`WorkState`に変換
- 変換エラーが発生したイベントはスキップ（ログに記録）
- 破損データも部分的に読み込み可能な場合は`WorkState`として返す

---

### 4. 既存実装の状態確認 ✅

| コンポーネント | 状態 | ファイル | 備考 |
|---------------|------|---------|------|
| CalendarEventService.getWorkStateEvents | ✅ 実装済み | `src/application/services/calendar-event-service.ts` | そのまま使用可能 |
| CalendarEventRepository.findByDateRange | ✅ 実装済み | `src/infrastructure/repositories/calendar-event-repository-impl.ts` | そのまま使用可能 |
| WorkState | ✅ 実装済み | `src/domain/entities/work-state.ts` | そのまま使用可能 |
| WorkStateMetadata | ✅ 実装済み | `src/domain/value-objects/work-state-metadata.ts` | タブ情報へのアクセス可能 |
| TabInfo | ✅ 実装済み | `src/domain/value-objects/tab-info.ts` | ファビコンURLへのアクセス可能 |
| Service Worker | ⚠️ 部分実装 | `background/service-worker.ts` | `GET_WORK_STATE_EVENTS`未実装 |
| サイドパネルUI | ⚠️ 部分実装 | `sidepanel/sidepanel.ts` | 一覧表示未実装 |

---

### 5. Bolt 5で必要な追加実装

#### 5.1 Service Workerメッセージハンドラー

**実装内容**:
- `GET_WORK_STATE_EVENTS`メッセージタイプの処理
- 認証状態の確認
- `CalendarEventService.getWorkStateEvents`の呼び出し
- レスポンスのフォーマット（UIで使いやすい形式に変換）

**注意点**:
- `WorkState`からUIで必要な情報のみを抽出
- `metadata`が`null`の場合の処理（破損データ）
- エラーハンドリング

#### 5.2 サイドパネルUI拡張

**実装内容**:
- 保存済み仕事一覧セクション
- 検索入力欄
- フィルタリングボタン（今日、今週、今月、すべて）
- ローディングインジケーター
- エラーメッセージと再試行ボタン
- ファビコンサムネイル表示

**UI要素**:
- 各仕事項目:
  - 仕事名（タイトル）
  - 保存日時（開始時間 - 終了時間）
  - タブ数
  - ファビコンサムネイル（最初の5個のタブのファビコン）

#### 5.3 検索・フィルタリング機能

**実装内容**:
- 検索機能: クライアント側で実装（取得したデータをフィルタリング）
- フィルタリング機能: 日付範囲の計算とAPI呼び出し

**日付範囲の計算**:
- 今日: 今日の0:00:00 〜 23:59:59
- 今週: 今週の月曜日0:00:00 〜 日曜日23:59:59
- 今月: 今月の1日0:00:00 〜 月末23:59:59
- すべて: 過去30日分（デフォルト）

---

### 6. データフロー

```
サイドパネル
  ↓ (GET_WORK_STATE_EVENTS メッセージ)
Service Worker
  ↓ (認証状態確認)
AuthRepository.getCurrent()
  ↓ (認証済み)
CalendarEventService.getWorkStateEvents(startDate, endDate, calendarId, accessToken)
  ↓
CalendarEventRepository.findByDateRange(startDate, endDate, calendarId, accessToken)
  ↓
GoogleCalendarAdapter.listEvents(calendarId, startDate, endDate, accessToken)
  ↓
Google Calendar API
  ↓ (CalendarEvent[])
GoogleCalendarAdapter
  ↓ (CalendarEvent[])
CalendarEventRepositoryImpl._convertCalendarEventToWorkState()
  ↓ (WorkState[])
CalendarEventService
  ↓ (WorkState[])
Service Worker (UI用にフォーマット)
  ↓ (フォーマット済みデータ)
サイドパネル (表示)
```

---

### 7. 破損データの扱い

**重要なポイント**:
- `WorkState.metadata`が`null`の場合、タブ情報は表示できない
- `WorkState.isCorrupted`が`true`の場合でも、`title`と`eventId`は表示可能
- 破損データの場合、タブ数は0、ファビコンサムネイルは空配列として表示

**UIでの表示方針**:
- 破損データでも仕事名と保存日時は表示
- タブ情報が取得できない場合は「データが破損しています」などのメッセージを表示（オプション）

---

### 8. パフォーマンス要件

- **過去30日分の取得**: 3秒以内で完了
- **検索・フィルタリング**: クライアント側で実行（即座に反映）
- **ファビコン読み込み**: 非同期で読み込み、エラー時はデフォルトアイコン

---

## 確認完了

既存設計の確認が完了しました。以下の実装に進むことができます：

1. ✅ Service Workerメッセージハンドラーの実装
2. ✅ サイドパネルUIの拡張
3. ✅ 検索・フィルタリング機能の実装

**次のステップ**: コード生成に進む

---

**確認者**: AI-DLC Code Generation Agent  
**確認日**: 2026-01-22
