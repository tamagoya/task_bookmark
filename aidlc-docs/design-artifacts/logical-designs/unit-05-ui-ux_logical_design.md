# Logical Design: Unit 5 - UI/UX実装

## 概要
本ドキュメントは、Unit 5（UI/UX実装）のLogical Designを定義します。Unit定義を拡張し、NFRsを満たすためのアーキテクチャパターンを適用した実装可能な設計です。特に、Bolt 7で実装する前後関係の可視化UIの詳細設計を含みます。

## アーキテクチャパターン

### 採用したパターン

1. **レイヤードアーキテクチャ**: プレゼンテーション層（UI）、アプリケーション層、ドメイン層の分離
2. **Component パターン**: UIコンポーネントの分離と再利用
3. **Observer パターン**: UI状態の更新とイベント通知（簡易実装、コールバック関数）
4. **Adapter パターン**: Service Workerとの通信（UIMessenger）
5. **Service Layer パターン**: 前後関係取得ロジックの集約（RestoreRelationService）
6. **Strategy パターン（Bolt 9）**: エラー分類とメッセージ生成の戦略（ErrorHandlingService）
7. **Retry パターン（Bolt 9）**: リトライ処理（既存のRetryHandlerを拡張、ドメイン層でRetryPolicyを定義）

---

## レイヤー構造

### 1. プレゼンテーション層 (Presentation Layer)

**責任**: ユーザーインターフェースの表示とユーザー操作の処理

**コンポーネント**:

#### Side Panel Container
**責任**: サイドパネルのメインコンテナとルーティング

**主要機能**:
- サイドパネルの表示制御
- 画面遷移の管理（タブ一覧、保存済み仕事一覧、詳細表示）
- 認証状態の管理

**実装ファイル**:
- `FRONTEND/sidepanel/sidepanel.html`
- `FRONTEND/sidepanel/sidepanel.ts`

**依存関係**:
- Chrome Side Panel API
- Application Layer (各種Service)

---

#### Tab List Component
**責任**: 現在のタブ一覧の表示

**主要機能**:
- タブ一覧の表示（タイトル、URL、ファビコン）
- タブの順序表示
- スクロール可能なリスト

**実装ファイル**:
- `FRONTEND/sidepanel/sidepanel.html` (tabs-section)
- `FRONTEND/sidepanel/sidepanel.ts` (loadCurrentTabs, renderTabsList)

**依存関係**:
- Application Layer (TabCaptureService)

---

#### Save Form Component
**責任**: 仕事状態保存のフォーム

**主要機能**:
- 仕事名の入力（必須）
- メモの入力（任意）
- 保存ボタン
- バリデーション

**実装ファイル**:
- `FRONTEND/sidepanel/sidepanel.html` (save-section)
- `FRONTEND/sidepanel/sidepanel.ts` (saveWorkState)

**依存関係**:
- Application Layer (CalendarEventService)

---

#### Work State List Component
**責任**: 保存済み仕事一覧の表示

**主要機能**:
- 時系列での一覧表示
- 検索機能（仕事名で検索）
- 日付フィルタリング（今日、今週、今月）
- 復元ボタン
- 詳細表示ボタン（将来の拡張）
- **前後関係インジケーター**（Bolt 7で追加）

**実装ファイル**:
- `FRONTEND/sidepanel/sidepanel.html` (work-states-section)
- `FRONTEND/sidepanel/sidepanel.ts` (loadWorkStates, renderWorkStateList)

**依存関係**:
- Application Layer (CalendarEventService, RestoreRelationService)

**UIデザイン**:
```
┌─────────────────────────────────┐
│ プロジェクトAの調査        [🔗]  │ ← 前後関係インジケーター
│ 5タブ | 2026-01-22 10:00        │
│ [復元]                          │
└─────────────────────────────────┘
```

---

#### Work State Detail Component
**責任**: 保存済み仕事の詳細表示と編集

**主要機能**:
- 仕事の詳細情報表示
- URLリストの表示と編集（Bolt 8で実装予定）
- **前後関係の表示**（Bolt 7で実装）
- 保存ボタン（編集後）

**実装ファイル**:
- `FRONTEND/sidepanel/sidepanel.html` (work-state-detail-section) - 新規追加
- `FRONTEND/sidepanel/sidepanel.ts` (showWorkStateDetail, renderRestoreRelations) - 新規追加

**依存関係**:
- Application Layer (CalendarEventService, RestoreRelationService)
- Application Layer (RestoreService) - 復元処理

---

#### Google Calendar 予定詳細用 Content Script（Calendar Event Detail Injector）
**責任**: calendar.google.com の予定詳細に「復元」ボタンを注入し、クリックで拡張の復元フローを起動する

**主要機能**:
1. **検出**: 予定詳細パネルが表示されたとき、説明欄テキストにタスクブックマークのJSON（`version`, `tabs` 等）が含まれるか判定
2. **eventId / restoredFrom 取得**: 説明欄JSONをパースし、トップレベルの `eventId` および `restoredFrom`（復元元イベントID）を取得
3. **ボタン注入**: タイトル・日時の直下に「復元」ボタンを挿入。`restoredFrom` が存在する場合は「前のタスクへ」ボタンも併せて挿入（DOMセレクタは定数化し、Google UI変更時に保守しやすくする）
4. **復元実行**: 「復元」クリック時に `chrome.runtime.sendMessage({ type: 'RESTORE_WORK_STATE', payload: { eventId } })` を送信
5. **前のタスクへ**: 「前のタスクへ」クリック時に `chrome.runtime.sendMessage({ type: 'GET_EVENT_CALENDAR_URL', payload: { eventId: restoredFrom } })` を送信し、返却された URL に `window.location.href` で遷移
6. **フィードバック**: 応答の success/error に応じてメッセージ表示（未認証・APIエラー等）

**実装ファイル**:
- `FRONTEND/content-scripts/calendar-restore-button.ts`（または同等パス）
- `FRONTEND/content-scripts/calendar-restore-button.css`（任意）
- manifest.json の `content_scripts` と `host_permissions`（`https://calendar.google.com/*`）

**メッセージフロー**:
```
[Calendar 予定詳細] → 説明欄パース → eventId / restoredFrom 取得
       → 「復元」「前のタスクへ」ボタン表示
       → 「復元」クリック: sendMessage(RESTORE_WORK_STATE, { eventId })
          → [Service Worker] 既存の復元フロー（findById → createWindow → restoreTabs → recordRestore）
       → 「前のタスクへ」クリック: sendMessage(GET_EVENT_CALENDAR_URL, { eventId: restoredFrom })
          → [Service Worker] authState.calendarId 取得 → イベント詳細URL構築（eventedit）→ 返却
          → Content Script が返却URLに遷移
```

**依存関係**:
- Unit 4: 既存 RESTORE_WORK_STATE ハンドラを利用
- Unit 3: 説明欄スキーマ（eventId 格納）との整合

**UIデザイン**:
```
┌─────────────────────────────────┐
│ 動作確認                          │
│ 2月11日(水) 19:23–19:53          │
│ [復元] [前のタスクへ]  ← 注入するボタン（restoredFrom がある場合のみ「前のタスクへ」表示） │
│ {"version":"1.0.0","eventId":"... │
└─────────────────────────────────┘
```

---

**Work State Detail のUIデザイン**:
```
┌─────────────────────────────────┐
│ 仕事名: プロジェクトAの調査      │
│ 保存日時: 2026-01-22 10:00      │
│ タブ数: 5                        │
│                                  │
│ 【前後関係】                     │
│                                  │
│ ← 復元元: プロジェクトBの調査     │
│    (2026-01-21 15:00)            │
│    [詳細を見る]                  │
│                                  │
│ → 復元先:                        │
│    - プロジェクトAの続き          │
│      (2026-01-22 14:00)          │
│      [詳細を見る]                │
│    - プロジェクトAの再開          │
│      (2026-01-23 09:00)          │
│      [詳細を見る]                │
└─────────────────────────────────┘
```

---

#### Restore Relation View Component（新規、Bolt 7）
**責任**: 前後関係の可視化

**主要機能**:
- 復元元の表示（`restoredFrom`）
- 復元先の表示（`restoredTo`）
- 復元チェーンの表示（オプション）
- クリック可能なリンク（詳細表示への遷移）

**実装ファイル**:
- `FRONTEND/sidepanel/sidepanel.html` (restore-relations-section)
- `FRONTEND/sidepanel/sidepanel.ts` (loadRestoreRelations, renderRestoreRelations, renderRestoreChain)

**依存関係**:
- Application Layer (RestoreRelationService)

**UIデザイン**:
```
┌─────────────────────────────────┐
│ 【前後関係】                     │
│                                  │
│ ← 復元元                         │
│   プロジェクトBの調査             │
│   保存日時: 2026-01-21 15:00     │
│   [詳細を見る]                   │
│                                  │
│ → 復元先 (2件)                   │
│   ┌─────────────────────────┐   │
│   │ プロジェクトAの続き       │   │
│   │ 復元日時: 2026-01-22 14:00│   │
│   │ [詳細を見る]             │   │
│   └─────────────────────────┘   │
│   ┌─────────────────────────┐   │
│   │ プロジェクトAの再開       │   │
│   │ 復元日時: 2026-01-23 09:00│   │
│   │ [詳細を見る]             │   │
│   └─────────────────────────┘   │
└─────────────────────────────────┘
```

---

#### Progress Indicator Component
**責任**: ローディングとプログレスの表示

**主要機能**:
- 保存中のローディング表示
- 復元中のプログレスバー
- データ取得中のローディング表示

**実装ファイル**:
- `FRONTEND/sidepanel/sidepanel.html` (message-section)
- `FRONTEND/sidepanel/sidepanel.ts` (showMessage)

---

#### Error Message Component
**責任**: エラーメッセージの表示

**主要機能**:
- エラーメッセージの表示
- リトライボタン
- エラーの種類に応じた適切なメッセージ
- **エラー分類とメッセージ生成（Bolt 9で拡張）**: `ErrorHandlingService`を使用してエラーを分類し、ユーザーフレンドリーなメッセージを生成

**実装ファイル**:
- `FRONTEND/sidepanel/sidepanel.html` (message-section, url-edit-error)
- `FRONTEND/sidepanel/sidepanel.ts` (showMessage, showModalError)

**拡張内容（Bolt 9）**:
- `ErrorHandlingService`を使用してエラーを分類
- `ErrorCode`、`ErrorMessage`、`ErrorSeverity`を使用
- リトライ可能なエラーの場合、`RetryPolicy`に基づいてリトライボタンを表示

---

#### Accessibility Component（新規、Bolt 9）
**責任**: アクセシビリティ要件の実装

**主要機能**:
- ARIAラベルの設定
- キーボードショートカットの実装
- フォーカス管理
- スクリーンリーダー対応

**実装ファイル**:
- `FRONTEND/sidepanel/sidepanel.html` (aria-label属性)
- `FRONTEND/sidepanel/sidepanel.ts` (キーボードイベントハンドラー)
- `FRONTEND/sidepanel/sidepanel.css` (フォーカススタイル)

**依存関係**:
- Domain Layer (AriaLabel, KeyboardShortcut)

---

### 2. アプリケーション層 (Application Layer)

**責任**: ユースケースの実装、プレゼンテーション層とドメイン層の調整

**コンポーネント**:

#### RestoreRelationService（新規、Bolt 7）
**責任**: 前後関係データの取得と構築

**主要メソッド**:
- `getRestoreRelations(eventId: EventId, calendarId: CalendarId, accessToken: AccessToken): Promise<RestoreRelations>`
  - 指定されたイベントIDの前後関係を取得
  - 依存関係: Domain Layer (WorkState, EventId), Infrastructure Layer (CalendarEventRepository)
  
- `getRestoreChain(eventId: EventId, calendarId: CalendarId, accessToken: AccessToken, maxDepth?: number): Promise<RestoreChain>`
  - 復元チェーンを構築（オプション機能）
  - 最大深度を制限（デフォルト: 10レベル）して無限ループを防止
  - 依存関係: Domain Layer (WorkState, EventId), Infrastructure Layer (CalendarEventRepository)

**実装ファイル**:
- `FRONTEND/src/application/services/restore-relation-service.ts`（新規）

**実装フロー**:
1. `CalendarEventRepository.findById()`で元のWorkStateを取得
2. `WorkState.metadata.restoredFrom`から復元元のイベントIDを取得
3. `CalendarEventRepository.findById()`で復元元のWorkStateを取得（存在する場合）
4. `WorkState.metadata.restoredTo`から復元先の情報リストを取得
   - 各エントリは `{ eventId: string; restoredAt: string }` 形式
5. `CalendarEventRepository.findById()`で各復元先のWorkStateを取得
6. `RestoreRelations`オブジェクトを構築して返す

**エラーハンドリング**:
- 存在しないイベントIDの場合は`null`を返す
- 削除されたイベントの場合は「削除済み」と表示

**依存関係**:
- Domain Layer (WorkState, EventId, CalendarId, AccessToken)
- Infrastructure Layer (CalendarEventRepository, Logger)

---

#### ErrorHandlingService（新規、Bolt 9）
**責任**: エラーの分類、メッセージ生成、リトライ可能性の判定

**主要メソッド**:
- `classifyError(errorCode: ErrorCode): { category: ErrorCategory, severity: ErrorSeverity }`
  - エラーを分類し、カテゴリと重要度を返す
  - ビジネスルール: エラーコードに基づいて分類
  
- `generateUserMessage(errorCode: ErrorCode, context?: Record<string, unknown>): ErrorMessage`
  - エラーコードからユーザーフレンドリーなメッセージを生成
  - ビジネスルール: エラーコードとコンテキストに基づいてメッセージを生成
  
- `isRetryable(errorCode: ErrorCode, retryPolicy: RetryPolicy): boolean`
  - エラーがリトライ可能かどうかを判定
  - ビジネスルール: リトライポリシーに基づいて判定

**実装ファイル**:
- `FRONTEND/src/application/services/error-handling-service.ts`（新規）

**依存関係**:
- Domain Layer (ErrorCode, ErrorCategory, ErrorSeverity, ErrorMessage, RetryPolicy)
- Infrastructure Layer (Logger)

**使用例**:
```typescript
// エラーを分類
const { category, severity } = errorHandlingService.classifyError(errorCode);

// ユーザーフレンドリーなメッセージを生成
const errorMessage = errorHandlingService.generateUserMessage(errorCode, { operation: '保存' });

// リトライ可能かどうかを判定
const retryable = errorHandlingService.isRetryable(errorCode, retryPolicy);
```

---

### 3. ドメイン層 (Domain Layer)

**責任**: ビジネスロジックとドメインモデル

**コンポーネント**:

#### RestoreRelation Value Object（新規、Bolt 7）
**責任**: 復元関係を表す不変オブジェクト

**属性**:
- `eventId: string` - イベントID
- `title: string` - 仕事名
- `savedAt: string` - 保存日時（ISO 8601形式）
- `restoredAt?: string` - 復元日時（ISO 8601形式、復元先の場合のみ）

**メソッド**:
- `static create(data: RestoreRelationData): RestoreRelation`
- `equals(other: RestoreRelation): boolean`

**実装ファイル**:
- `FRONTEND/src/domain/value-objects/restore-relation.ts`（新規）

---

#### RestoreChain Value Object（新規、Bolt 7、オプション）
**責任**: 復元チェーンを表す不変オブジェクト

**属性**:
- `chain: RestoreRelation[]` - 復元チェーンの配列（時系列順）

**メソッド**:
- `static create(relations: RestoreRelation[]): RestoreChain`
- `getDepth(): number` - チェーンの深度を取得
- `equals(other: RestoreChain): boolean`

**実装ファイル**:
- `FRONTEND/src/domain/value-objects/restore-chain.ts`（新規、オプション）

---

#### ErrorCode Value Object（新規、Bolt 9）
**責任**: エラーコードを表す不変オブジェクト

**属性**:
- `code: string` - エラーコード（例: "AUTH_FAILED", "NETWORK_ERROR"）
- `category: ErrorCategory` - エラーのカテゴリ

**実装ファイル**:
- `FRONTEND/src/domain/value-objects/error-code.ts`（新規）

---

#### ErrorMessage Value Object（新規、Bolt 9）
**責任**: ユーザーフレンドリーなエラーメッセージを表す不変オブジェクト

**属性**:
- `message: string` - ユーザー向けメッセージ（日本語）
- `technicalDetails?: string` - 技術的な詳細（デバッグ用、オプション）

**実装ファイル**:
- `FRONTEND/src/domain/value-objects/error-message.ts`（新規）

---

#### ErrorSeverity Value Object（新規、Bolt 9）
**責任**: エラーの重要度を表す不変オブジェクト

**値**:
- `INFO` - 情報（処理は続行可能）
- `WARNING` - 警告（処理は続行可能だが注意が必要）
- `ERROR` - エラー（処理は失敗したが、リトライ可能な場合がある）
- `CRITICAL` - 致命的（処理は失敗し、リトライ不可能）

**実装ファイル**:
- `FRONTEND/src/domain/value-objects/error-severity.ts`（新規）

---

#### RetryPolicy Value Object（新規、Bolt 9）
**責任**: リトライポリシーを表す不変オブジェクト

**属性**:
- `maxRetries: number` - 最大リトライ回数（デフォルト: 3）
- `baseDelayMs: number` - ベース遅延時間（ミリ秒、デフォルト: 1000）
- `backoffStrategy: BackoffStrategy` - バックオフ戦略（LINEAR, EXPONENTIAL, FIXED）
- `retryableErrorCodes: ErrorCode[]` - リトライ可能なエラーコードのリスト

**実装ファイル**:
- `FRONTEND/src/domain/value-objects/retry-policy.ts`（新規）

---

#### AriaLabel Value Object（新規、Bolt 9）
**責任**: ARIAラベルを表す不変オブジェクト

**属性**:
- `label: string` - ARIAラベル（日本語）
- `description?: string` - 追加の説明（オプション）

**実装ファイル**:
- `FRONTEND/src/domain/value-objects/aria-label.ts`（新規）

---

#### KeyboardShortcut Value Object（新規、Bolt 9）
**責任**: キーボードショートカットを表す不変オブジェクト

**属性**:
- `key: string` - キー（例: "Enter", "Escape", "Ctrl+S"）
- `action: string` - アクション名（例: "保存", "キャンセル"）
- `description?: string` - 説明（オプション）

**実装ファイル**:
- `FRONTEND/src/domain/value-objects/keyboard-shortcut.ts`（新規）

---

### 4. インフラストラクチャ層 (Infrastructure Layer)

**責任**: 外部システムとの通信とデータ永続化

**コンポーネント**:

#### UIMessenger
**責任**: Service WorkerとUIコンポーネント間のメッセージング

**主要メソッド**:
- `sendMessage(message: UIMessage): Promise<UIResponse>`
- `onMessage(handler: (message: UIMessage) => void): void`

**実装ファイル**:
- `FRONTEND/src/infrastructure/adapters/ui-messenger.ts`（既存）

**拡張内容（Bolt 7）**:
- `GET_RESTORE_RELATIONS`メッセージ型の追加
- `RESTORE_RELATIONS_RESPONSE`メッセージ型の追加

---

## データフロー

### 前後関係の取得フロー（Bolt 7）

1. **ユーザー操作**: 保存済み仕事一覧で「詳細を見る」をクリック
2. **UI**: `showWorkStateDetail(eventId)`を呼び出し
3. **UI**: `loadRestoreRelations(eventId)`を呼び出し
4. **UI**: Service Workerに`GET_RESTORE_RELATIONS`メッセージを送信
5. **Service Worker**: `RestoreRelationService.getRestoreRelations()`を呼び出し
6. **RestoreRelationService**: 
   - `CalendarEventRepository.findById()`で元のWorkStateを取得
   - `WorkState.metadata.restoredFrom`から復元元のイベントIDを取得
   - 復元元のWorkStateを取得（存在する場合）
   - `WorkState.metadata.restoredTo`から復元先のイベントIDリストを取得
   - 各復元先のWorkStateを取得
7. **RestoreRelationService**: `RestoreRelations`オブジェクトを構築
8. **Service Worker**: `RESTORE_RELATIONS_RESPONSE`メッセージをUIに送信
9. **UI**: `renderRestoreRelations(relations)`で前後関係を表示

---

## UI/UX設計原則

### シンプルさ
- ブックマーク作成と同等の手軽さ
- 不要な情報を表示しない
- 直感的な操作

### 視覚的フィードバック
- すべての操作に明確なフィードバック
- ローディング状態の表示
- 成功/失敗メッセージの表示

### エラー処理
- ユーザーフレンドリーなエラーメッセージ
- リトライ機能の提供
- エラーの種類に応じた適切なメッセージ

### アクセシビリティ（Bolt 9で拡張）

#### キーボード操作
- **すべての主要機能をキーボードで操作可能**: Tabキーでフォーカス移動、Enterキーで実行
- **ショートカットキー**: 
  - `Ctrl+S` / `Cmd+S`: 保存
  - `Escape`: モーダルを閉じる
  - `Enter`: フォーム送信、ボタン実行
- **フォーカス管理**: エラー発生時、適切な要素にフォーカスを移動

#### ARIAラベル
- **すべてのUI要素にARIAラベルを設定**: ボタン、入力欄、エラーメッセージなど
- **ラベル形式**: `AriaLabel` Value Objectを使用して一貫性を保つ
- **動的ラベル**: コンテキストに応じて動的にラベルを生成

#### スクリーンリーダー対応
- **セマンティックHTML**: 適切なHTML要素を使用（`<button>`, `<input>`, `<label>`など）
- **aria-live**: エラーメッセージや成功メッセージに`aria-live`属性を設定
- **aria-describedby**: 入力欄にエラーメッセージを関連付ける

#### 色のコントラスト
- **WCAG 2.1 Level AA基準**: コントラスト比4.5:1以上
- **色だけに依存しない**: エラー表示は色だけでなく、アイコンやテキストでも表現

---

## レスポンシブデザイン

- サイドパネルのサイズに応じて適切に表示
- 最小幅: 300px
- 最大幅: 600px（推奨）

---

## エラーハンドリング（Bolt 9で拡張）

### エラーハンドリングアーキテクチャ

Bolt 9では、エラーハンドリングを統一化し、ドメイン層でエラー分類とメッセージ生成を行います。

#### エラーハンドリングフロー

1. **エラー発生**: インフラストラクチャ層またはアプリケーション層でエラーが発生
2. **エラー分類**: `ErrorHandlingService`がエラーコードからエラーのカテゴリと重要度を判定
3. **メッセージ生成**: `ErrorHandlingService`がユーザーフレンドリーなメッセージを生成
4. **Domain Event発行**: `ErrorOccurred`イベントを発行
5. **UI表示**: プレゼンテーション層でエラーメッセージを表示
6. **リトライ判定**: リトライ可能なエラーの場合、`RetryPolicy`に基づいてリトライ

#### エラー分類（Bolt 9）

- **認証エラー**: `AUTH_FAILED`, `TOKEN_EXPIRED` → `AUTHENTICATION`カテゴリ、`ERROR`重要度
- **ネットワークエラー**: `NETWORK_ERROR`, `TIMEOUT`, `OFFLINE` → `NETWORK`カテゴリ、`ERROR`重要度（リトライ可能）
- **APIエラー**: `RATE_LIMIT_EXCEEDED`, `API_ERROR` → `API`カテゴリ、`WARNING`重要度（リトライ可能）
- **バリデーションエラー**: `VALIDATION_ERROR`, `INVALID_INPUT` → `VALIDATION`カテゴリ、`WARNING`重要度（リトライ不可能）
- **データエラー**: `DATA_CORRUPTED` → `DATA`カテゴリ、`CRITICAL`重要度（リトライ不可能）

#### リトライポリシー（Bolt 9）

- **デフォルトポリシー**: 最大3回、ベース遅延1000ms、指数バックオフ
- **リトライ可能なエラー**: ネットワークエラー、APIエラー（レート制限を除く）
- **リトライ不可能なエラー**: 認証エラー、バリデーションエラー、データエラー
- **レート制限エラー**: リトライ可能だが、`Retry-After`ヘッダーに基づいて待機時間を調整

#### エラーメッセージ表示（Bolt 9）

- **ユーザーフレンドリー**: 技術的な詳細は含めず、ユーザーが理解できる日本語で記述
- **コンテキスト対応**: エラーコードとコンテキストに基づいて適切なメッセージを生成
- **アクショナブル**: 可能な限り、ユーザーが取るべきアクションを提示
- **表示場所**: 
  - モーダル内エラー: モーダル内に表示（例: URL編集モーダル）
  - グローバルエラー: サイドパネルのメッセージセクションに表示

### 前後関係取得時のエラー（Bolt 7）

- **存在しないイベントID**: 「前後関係を取得できませんでした」と表示
- **削除されたイベント**: 「削除済み」と表示
- **ネットワークエラー**: 「ネットワークエラーが発生しました。再試行してください。」と表示（Bolt 9で統一化）
- **認証エラー**: 「認証に失敗しました。もう一度お試しください。」と表示（Bolt 9で統一化）

---

## パフォーマンス要件

- **前後関係の取得**: 3件以内の前後関係を1秒以内で取得（NFR-001を参考）
- **UI応答性**: ユーザー操作に対して100ms以内に応答

---

## テスト戦略

### ユニットテスト
- 各UIコンポーネントのテスト
- `RestoreRelationService`のテスト
- `RestoreRelation` Value Objectのテスト
- フォームバリデーションのテスト
- **`ErrorHandlingService`のテスト（Bolt 9）**
- **エラー分類とメッセージ生成のテスト（Bolt 9）**
- **リトライポリシーのテスト（Bolt 9）**
- **アクセシビリティコンポーネントのテスト（Bolt 9）**

### 統合テスト
- 実際のChrome環境でのUIテスト
- ユーザーフローのテスト
- 前後関係表示のテスト

### E2Eテスト
- Playwrightを使用したE2Eテスト（将来の拡張）

---

## 依存関係

### 外部依存
- Chrome Side Panel API
- Chrome Storage API

### 内部依存
- Unit 1 (認証): 認証状態の表示
- Unit 2 (タブキャプチャ): タブ一覧の表示
- Unit 3 (Calendar API): 保存・一覧表示・編集・前後関係データの取得
- Unit 4 (状態復元): 復元ボタンとプログレス

---

## 実装の優先順位

**優先度**: 高（ユーザー体験の要）

### Bolt別の実装範囲

- **Bolt 1-6**: 基本UI（認証、タブ表示、保存、一覧表示、復元）
- **Bolt 7**: 前後関係の可視化UI（本Logical Designの主要部分）
- **Bolt 8**: URL編集機能
- **Bolt 9-10**: エラーハンドリングとUX改善

---

## リスク

### RISK-009: ユーザー採用率の低下
- **軽減策**: ユーザーテスト、段階的な機能公開

### RISK-008: XSS攻撃
- **軽減策**: 入力のサニタイズ、CSPの適用

### RISK-UI-001: UIの複雑化（Bolt 7）
- **説明**: 前後関係の表示により、UIが複雑になる可能性
- **軽減策**: 
  - シンプルなデザインを採用
  - 詳細表示はオプションとして実装
  - ユーザーテストを実施

---

## 成功基準

- [ ] サイドパネルが正常に表示される
- [ ] すべての主要機能がUIから操作できる
- [ ] フォームバリデーションが正常に動作する
- [ ] エラーメッセージが適切に表示される
- [ ] キーボード操作が可能
- [ ] スクリーンリーダーに対応
- [ ] レスポンシブデザインが適切に動作する
- [ ] **前後関係が可視化される（Bolt 7）**
- [ ] **一覧表示に前後関係インジケーターが表示される（Bolt 7）**
- [ ] **すべてのエラーが適切に分類され、ユーザーフレンドリーなメッセージが表示される（Bolt 9）**
- [ ] **リトライ機能が正常に動作する（Bolt 9）**
- [ ] **キーボード操作が可能になる（Bolt 9）**
- [ ] **スクリーンリーダーに対応する（Bolt 9）**
- [ ] ユニットテストのカバレッジが80%以上

---

**作成日**: 2026-01-22  
**最終更新**: 2026-02-03  
**ステータス**: 設計完了（Bolt 7, Bolt 9対応）
