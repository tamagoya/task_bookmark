# Domain Model: Unit 5 - UI/UX実装

## 概要

本ドキュメントは、Unit 5（UI/UX実装）のDomain Modelを定義します。Domain-Driven Design原則に基づいて、エラーハンドリングとアクセシビリティに関するビジネスロジックをインフラストラクチャから独立してモデル化しています。

Unit 5は横断的関心事（Cross-Cutting Concerns）を扱うため、既存のUnit 1-3のドメインモデルを拡張する形で設計されています。

## ドメインの境界

UI/UXドメインは、以下の責務を担当します：

1. **エラーの分類と重要度の判定**: エラーをビジネスルールに基づいて分類し、重要度を判定する
2. **ユーザーフレンドリーなメッセージ生成**: 技術的なエラーをユーザーが理解できるメッセージに変換する
3. **リトライポリシーの定義**: どのエラーがリトライ可能か、どのような戦略でリトライするかを定義する
4. **アクセシビリティ要件の定義**: UI要素のアクセシビリティ要件をドメイン層で定義する

**境界外**:
- 実際のリトライ処理の実行（インフラストラクチャ層）
- エラーログの記録（インフラストラクチャ層）
- UI要素の実際のレンダリング（プレゼンテーション層）

---

## Value Objects

### ErrorCode

エラーコードを表すValue Objectです。エラーの分類と識別に使用されます。

#### 属性
- `code: string` - エラーコード（例: "AUTH_FAILED", "NETWORK_ERROR", "RATE_LIMIT_EXCEEDED"）
- `category: ErrorCategory` - エラーのカテゴリ（認証、ネットワーク、API、バリデーションなど）

#### 不変性
- 作成後は変更不可
- 等価性は`code`で判定

#### バリデーション
- `code`は空文字列であってはならない
- `code`は大文字のスネークケース形式である必要がある（例: "AUTH_FAILED"）

#### ファクトリメソッド
- `create(code: string, category: ErrorCategory): ErrorCode`
  - エラーコードを作成
  - バリデーション: コードが有効な形式であることを確認

#### 定義済みエラーコード

**認証エラー**:
- `AUTH_FAILED` - 認証失敗
- `TOKEN_EXPIRED` - トークン有効期限切れ
- `TOKEN_REFRESH_FAILED` - トークンリフレッシュ失敗

**ネットワークエラー**:
- `NETWORK_ERROR` - ネットワークエラー
- `TIMEOUT` - タイムアウト
- `OFFLINE` - オフライン状態

**APIエラー**:
- `RATE_LIMIT_EXCEEDED` - レート制限超過
- `API_ERROR` - APIエラー
- `INVALID_RESPONSE` - 無効なレスポンス

**バリデーションエラー**:
- `VALIDATION_ERROR` - バリデーションエラー
- `INVALID_INPUT` - 無効な入力
- `MISSING_REQUIRED_FIELD` - 必須フィールド欠落

**データエラー**:
- `DATA_CORRUPTED` - データ破損
- `SCHEMA_VERSION_MISMATCH` - スキーマバージョン不一致

---

### ErrorCategory

エラーのカテゴリを表すValue Objectです。

#### 値
- `AUTHENTICATION` - 認証関連
- `NETWORK` - ネットワーク関連
- `API` - API関連
- `VALIDATION` - バリデーション関連
- `DATA` - データ関連
- `SYSTEM` - システム関連

#### 不変性
- 作成後は変更不可
- 等価性は値で判定

---

### ErrorSeverity

エラーの重要度を表すValue Objectです。既存の`ValidationError`でも使用されていますが、独立したValue Objectとして定義します。

#### 値
- `INFO` - 情報（処理は続行可能）
- `WARNING` - 警告（処理は続行可能だが注意が必要）
- `ERROR` - エラー（処理は失敗したが、リトライ可能な場合がある）
- `CRITICAL` - 致命的（処理は失敗し、リトライ不可能）

#### 不変性
- 作成後は変更不可
- 等価性は値で判定

#### メソッド
- `isRecoverable(): boolean`
  - エラーが回復可能かどうかを判定
  - `INFO`、`WARNING`、`ERROR`は回復可能、`CRITICAL`は回復不可能

---

### ErrorMessage

ユーザーフレンドリーなエラーメッセージを表すValue Objectです。

#### 属性
- `message: string` - ユーザー向けメッセージ（日本語）
- `technicalDetails?: string` - 技術的な詳細（デバッグ用、オプション）

#### 不変性
- 作成後は変更不可
- 等価性は`message`で判定

#### バリデーション
- `message`は空文字列であってはならない
- `message`はユーザーフレンドリーな日本語である必要がある

#### ファクトリメソッド
- `create(message: string, technicalDetails?: string): ErrorMessage`
  - エラーメッセージを作成
  - バリデーション: メッセージが有効であることを確認

#### メソッド
- `toUserFriendlyString(): string`
  - ユーザー向けの文字列表現を返す
  - 技術的な詳細は含めない

---

### RetryPolicy

リトライポリシーを表すValue Objectです。どのエラーがリトライ可能か、どのような戦略でリトライするかを定義します。

#### 属性
- `maxRetries: number` - 最大リトライ回数（デフォルト: 3）
- `baseDelayMs: number` - ベース遅延時間（ミリ秒、デフォルト: 1000）
- `backoffStrategy: BackoffStrategy` - バックオフ戦略（LINEAR, EXPONENTIAL, FIXED）
- `retryableErrorCodes: ErrorCode[]` - リトライ可能なエラーコードのリスト

#### 不変性
- 作成後は変更不可
- 等価性はすべての属性で判定

#### バリデーション
- `maxRetries`は0以上の整数である必要がある
- `baseDelayMs`は0以上の整数である必要がある

#### ファクトリメソッド
- `create(maxRetries: number, baseDelayMs: number, backoffStrategy: BackoffStrategy, retryableErrorCodes: ErrorCode[]): RetryPolicy`
  - リトライポリシーを作成
  - バリデーション: すべての値が有効であることを確認

- `createDefault(): RetryPolicy`
  - デフォルトのリトライポリシーを作成
  - 最大リトライ回数: 3、ベース遅延: 1000ms、指数バックオフ、ネットワークエラーとAPIエラーをリトライ可能

#### メソッド
- `isRetryable(errorCode: ErrorCode): boolean`
  - 指定されたエラーコードがリトライ可能かどうかを判定
  - `retryableErrorCodes`に含まれているかどうかを確認

- `calculateDelay(attempt: number): number`
  - 指定された試行回数での遅延時間を計算
  - バックオフ戦略に基づいて計算

---

### BackoffStrategy

バックオフ戦略を表すValue Objectです。

#### 値
- `LINEAR` - 線形バックオフ（固定間隔）
- `EXPONENTIAL` - 指数バックオフ（2のべき乗）
- `FIXED` - 固定間隔

#### 不変性
- 作成後は変更不可
- 等価性は値で判定

---

### AriaLabel

ARIAラベルを表すValue Objectです。アクセシビリティ要件をドメイン層で定義します。

#### 属性
- `label: string` - ARIAラベル（日本語）
- `description?: string` - 追加の説明（オプション）

#### 不変性
- 作成後は変更不可
- 等価性は`label`で判定

#### バリデーション
- `label`は空文字列であってはならない

#### ファクトリメソッド
- `create(label: string, description?: string): AriaLabel`
  - ARIAラベルを作成
  - バリデーション: ラベルが有効であることを確認

---

### KeyboardShortcut

キーボードショートカットを表すValue Objectです。

#### 属性
- `key: string` - キー（例: "Enter", "Escape", "Ctrl+S"）
- `action: string` - アクション名（例: "保存", "キャンセル"）
- `description?: string` - 説明（オプション）

#### 不変性
- 作成後は変更不可
- 等価性は`key`と`action`で判定

#### バリデーション
- `key`は空文字列であってはならない
- `action`は空文字列であってはならない

#### ファクトリメソッド
- `create(key: string, action: string, description?: string): KeyboardShortcut`
  - キーボードショートカットを作成
  - バリデーション: キーとアクションが有効であることを確認

---

## Domain Events

### ErrorOccurred

エラーが発生したことを表すDomain Eventです。

#### 属性
- `eventId: string` - イベントID（一意の識別子）
- `errorCode: ErrorCode` - エラーコード
- `errorMessage: ErrorMessage` - エラーメッセージ
- `severity: ErrorSeverity` - エラーの重要度
- `context?: Record<string, unknown>` - エラーコンテキスト（オプション）
- `occurredAt: Date` - 発生日時

#### 不変性
- 作成後は変更不可
- イベントは過去の事実を表すため、変更不可

#### ファクトリメソッド
- `create(errorCode: ErrorCode, errorMessage: ErrorMessage, severity: ErrorSeverity, context?: Record<string, unknown>): ErrorOccurred`
  - エラー発生イベントを作成
  - バリデーション: すべての必須フィールドが有効であることを確認

---

### RetryRequested

リトライが要求されたことを表すDomain Eventです。

#### 属性
- `eventId: string` - イベントID（一意の識別子）
- `originalError: ErrorOccurred` - 元のエラー
- `retryPolicy: RetryPolicy` - リトライポリシー
- `attempt: number` - 試行回数（1から開始）
- `requestedAt: Date` - 要求日時

#### 不変性
- 作成後は変更不可
- イベントは過去の事実を表すため、変更不可

#### ファクトリメソッド
- `create(originalError: ErrorOccurred, retryPolicy: RetryPolicy, attempt: number): RetryRequested`
  - リトライ要求イベントを作成
  - バリデーション: 試行回数が1以上であることを確認

---

### RetrySucceeded

リトライが成功したことを表すDomain Eventです。

#### 属性
- `eventId: string` - イベントID（一意の識別子）
- `originalError: ErrorOccurred` - 元のエラー
- `retryRequested: RetryRequested` - リトライ要求イベント
- `attempt: number` - 成功した試行回数
- `succeededAt: Date` - 成功日時

#### 不変性
- 作成後は変更不可
- イベントは過去の事実を表すため、変更不可

#### ファクトリメソッド
- `create(originalError: ErrorOccurred, retryRequested: RetryRequested, attempt: number): RetrySucceeded`
  - リトライ成功イベントを作成
  - バリデーション: 試行回数が1以上であることを確認

---

### RetryFailed

リトライが失敗したことを表すDomain Eventです。

#### 属性
- `eventId: string` - イベントID（一意の識別子）
- `originalError: ErrorOccurred` - 元のエラー
- `retryRequested: RetryRequested` - リトライ要求イベント
- `attempt: number` - 失敗した試行回数
- `finalError: ErrorOccurred` - 最終的なエラー
- `failedAt: Date` - 失敗日時

#### 不変性
- 作成後は変更不可
- イベントは過去の事実を表すため、変更不可

#### ファクトリメソッド
- `create(originalError: ErrorOccurred, retryRequested: RetryRequested, attempt: number, finalError: ErrorOccurred): RetryFailed`
  - リトライ失敗イベントを作成
  - バリデーション: 試行回数が1以上であることを確認

---

## Domain Services

### ErrorHandlingService

エラーハンドリングを担当するDomain Serviceです。エラーの分類、メッセージ生成、リトライ可能性の判定を行います。

#### 責務
1. **エラーの分類**: エラーコードからエラーのカテゴリと重要度を判定
2. **メッセージ生成**: エラーコードからユーザーフレンドリーなメッセージを生成
3. **リトライ可能性の判定**: エラーコードとリトライポリシーからリトライ可能かどうかを判定

#### メソッド
- `classifyError(errorCode: ErrorCode): { category: ErrorCategory, severity: ErrorSeverity }`
  - エラーを分類し、カテゴリと重要度を返す
  - ビジネスルール: エラーコードに基づいて分類

- `generateUserMessage(errorCode: ErrorCode, context?: Record<string, unknown>): ErrorMessage`
  - エラーコードからユーザーフレンドリーなメッセージを生成
  - ビジネスルール: エラーコードとコンテキストに基づいてメッセージを生成

- `isRetryable(errorCode: ErrorCode, retryPolicy: RetryPolicy): boolean`
  - エラーがリトライ可能かどうかを判定
  - ビジネスルール: リトライポリシーに基づいて判定

---

## 既存ドメインモデルとの統合

### Unit 1（認証）への拡張

既存の`AuthenticationFailed` Domain Eventに、Unit 5のエラーハンドリング概念を統合：

- `AuthenticationFailed`イベントに`ErrorCode`、`ErrorMessage`、`ErrorSeverity`を追加
- 認証エラーのリトライ可能性を判定

### Unit 2（タブキャプチャ）への拡張

タブキャプチャエラーに、Unit 5のエラーハンドリング概念を統合：

- タブ取得エラーに`ErrorCode`、`ErrorMessage`を追加
- ネットワークエラーのリトライ可能性を判定

### Unit 3（カレンダーAPI）への拡張

既存の`ValidationError` Value Objectと統合：

- `ValidationError`は既に`ErrorSeverity`を含んでいる
- `ValidationError`に`ErrorCode`を追加（オプション）
- カレンダーAPIエラーのリトライ可能性を判定

---

## ビジネスルール

### エラー分類ルール

1. **認証エラー**: `AUTH_FAILED`、`TOKEN_EXPIRED`などは`AUTHENTICATION`カテゴリ、`ERROR`重要度
2. **ネットワークエラー**: `NETWORK_ERROR`、`TIMEOUT`、`OFFLINE`は`NETWORK`カテゴリ、`ERROR`重要度（リトライ可能）
3. **APIエラー**: `RATE_LIMIT_EXCEEDED`は`API`カテゴリ、`WARNING`重要度（リトライ可能）
4. **バリデーションエラー**: `VALIDATION_ERROR`、`INVALID_INPUT`は`VALIDATION`カテゴリ、`WARNING`重要度（リトライ不可能）
5. **データエラー**: `DATA_CORRUPTED`は`DATA`カテゴリ、`CRITICAL`重要度（リトライ不可能）

### リトライルール

1. **リトライ可能なエラー**: ネットワークエラー、APIエラー（レート制限を除く）
2. **リトライ不可能なエラー**: 認証エラー（再認証が必要）、バリデーションエラー、データエラー
3. **レート制限エラー**: リトライ可能だが、`Retry-After`ヘッダーに基づいて待機時間を調整

### メッセージ生成ルール

1. **ユーザーフレンドリー**: 技術的な詳細は含めず、ユーザーが理解できる日本語で記述
2. **コンテキストに応じたメッセージ**: エラーコードとコンテキストに基づいて適切なメッセージを生成
3. **アクショナブル**: 可能な限り、ユーザーが取るべきアクションを提示

### アクセシビリティルール

1. **すべてのUI要素にARIAラベル**: ボタン、入力欄、エラーメッセージなど、すべてのUI要素に適切なARIAラベルを設定
2. **キーボード操作のサポート**: すべての操作をキーボードで実行可能にする
3. **フォーカス管理**: エラー発生時、適切な要素にフォーカスを移動

---

## 実装上の注意事項

### ドメイン層とインフラストラクチャ層の分離

- **ドメイン層**: エラーの分類、メッセージ生成、リトライ可能性の判定（ビジネスルール）
- **インフラストラクチャ層**: 実際のリトライ処理、エラーログの記録、HTTPエラーの解析

### 既存コードとの統合

- 既存の`ValidationError`はそのまま使用し、必要に応じて`ErrorCode`を追加
- 既存の`RetryHandler`（インフラストラクチャ層）は、ドメイン層の`RetryPolicy`を使用するように拡張

### アクセシビリティの実装

- ARIAラベルとキーボードショートカットはドメイン層で定義し、プレゼンテーション層で実装
- アクセシビリティ要件はドメイン層で定義することで、一貫性を保つ

---

**作成日**: 2026-02-03  
**最終更新**: 2026-02-03  
**ステータス**: 承認待ち
