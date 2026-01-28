# Domain Model: Unit 1 - Chrome拡張基盤と認証

## 概要
本ドキュメントは、Unit 1（Chrome拡張基盤と認証）のDomain Modelを定義します。Domain-Driven Design原則に基づいて、認証ドメインのビジネスロジックをインフラストラクチャから独立してモデル化しています。

## ドメインの境界
認証ドメインは、ユーザーの認証状態とトークン管理、カレンダーの初期化を担当します。Chrome Extension APIやGoogle Calendar APIなどのインフラストラクチャの詳細は含みません。

---

## Aggregates

### Authentication Aggregate

**Aggregate Root**: `Authentication`

認証ドメインの集約ルートです。認証状態、トークン、カレンダー情報を一貫性のある単位として管理します。

#### 構成要素
- **Entity**: `AuthState`
- **Value Objects**: `AccessToken`, `RefreshToken`, `TokenExpiry`, `CalendarId`

#### 不変条件
- ユーザーは一度に1つの認証状態のみを持つことができる
- 認証済みの場合、アクセストークンと有効期限が必須
- カレンダーIDは認証済みの場合のみ存在可能

#### 境界
- 認証状態の変更は、Aggregate Rootを通じてのみ行う
- 外部からの直接的な状態変更は禁止

---

## Entities

### AuthState

認証状態を表すエンティティです。

#### 識別子
- `userId: string` - ユーザーID（Googleアカウントの識別子）

#### 属性
- `isAuthenticated: boolean` - 認証済みかどうか
- `accessToken: AccessToken | null` - アクセストークン（認証済みの場合のみ）
- `refreshToken: RefreshToken | null` - リフレッシュトークン（認証済みの場合のみ）
- `tokenExpiry: TokenExpiry | null` - トークンの有効期限（認証済みの場合のみ）
- `calendarId: CalendarId | null` - カレンダーID（認証済みの場合のみ）

#### ビジネスルール
1. **認証状態の一貫性**: `isAuthenticated`が`true`の場合、`accessToken`と`tokenExpiry`は必須
2. **トークンの有効性**: `tokenExpiry`が現在時刻を過ぎている場合、トークンは無効とみなす
3. **カレンダーの存在**: 認証済みの場合、`calendarId`は存在するか、初期化待ちの状態

#### ライフサイクル
1. **作成**: 未認証状態で作成される
2. **認証**: ユーザーが認証されると、トークンと有効期限が設定される
3. **トークン更新**: トークンが期限切れの場合、リフレッシュトークンを使用して更新
4. **ログアウト**: 認証状態がクリアされる
5. **カレンダー初期化**: 認証後、カレンダーIDが設定される

#### メソッド（ドメインロジック）
- `authenticate(accessToken: AccessToken, refreshToken: RefreshToken, expiry: TokenExpiry): void`
  - 認証状態を設定
  - 不変条件: `isAuthenticated`を`true`に設定し、トークンを設定
  
- `refreshToken(newAccessToken: AccessToken, newExpiry: TokenExpiry): void`
  - トークンを更新
  - 不変条件: 既に認証済みである必要がある
  
- `logout(): void`
  - 認証状態をクリア
  - 不変条件: すべてのトークンとカレンダーIDをクリア
  
- `initializeCalendar(calendarId: CalendarId): void`
  - カレンダーIDを設定
  - 不変条件: 認証済みである必要がある
  
- `isTokenExpired(): boolean`
  - トークンが期限切れかどうかを判定
  - ビジネスルール: `tokenExpiry`が現在時刻を過ぎている場合、`true`を返す

---

## Value Objects

### AccessToken

アクセストークンを表すValue Objectです。不変性を保証します。

#### 属性
- `value: string` - トークンの値

#### 不変性
- 作成後は変更不可
- 等価性は値で判定

#### バリデーション
- 空文字列は許可しない
- 最小長: 10文字（実装依存）

### RefreshToken

リフレッシュトークンを表すValue Objectです。不変性を保証します。

#### 属性
- `value: string` - トークンの値

#### 不変性
- 作成後は変更不可
- 等価性は値で判定

#### バリデーション
- 空文字列は許可しない
- 最小長: 10文字（実装依存）

### TokenExpiry

トークンの有効期限を表すValue Objectです。不変性を保証します。

#### 属性
- `expiresAt: Date` - 有効期限の日時

#### 不変性
- 作成後は変更不可
- 等価性は日時で判定

#### バリデーション
- 過去の日時は許可しない
- 有効期限は未来の日時である必要がある

#### メソッド
- `isExpired(): boolean` - 現在時刻と比較して期限切れかどうかを判定
- `secondsUntilExpiry(): number` - 有効期限までの秒数を返す

### CalendarId

カレンダーIDを表すValue Objectです。不変性を保証します。

#### 属性
- `value: string` - カレンダーIDの値

#### 不変性
- 作成後は変更不可
- 等価性は値で判定

#### バリデーション
- 空文字列は許可しない
- 有効なカレンダーID形式である必要がある（実装依存）

---

## Domain Events

### UserAuthenticated

ユーザーが認証された時に発行されるイベントです。

#### ペイロード
```typescript
{
  userId: string;
  authenticatedAt: Date;
}
```

#### 発生タイミング
- `AuthState.authenticate()`が正常に完了した時

#### ビジネス意味
- ユーザーが正常に認証されたことを示す
- 他のUnit（UI/UX）が認証状態の変更を検知できる

---

### TokenRefreshed

トークンが更新された時に発行されるイベントです。

#### ペイロード
```typescript
{
  userId: string;
  refreshedAt: Date;
  newExpiry: Date;
}
```

#### 発生タイミング
- `AuthState.refreshToken()`が正常に完了した時

#### ビジネス意味
- トークンが正常に更新されたことを示す
- 監視やログ記録に使用可能

---

### AuthenticationFailed

認証に失敗した時に発行されるイベントです。

#### ペイロード
```typescript
{
  userId?: string;
  errorCode: string;
  errorMessage: string;
  failedAt: Date;
}
```

#### 発生タイミング
- 認証プロセスが失敗した時（OAuthエラー、ネットワークエラーなど）

#### ビジネス意味
- 認証失敗の理由を記録
- ユーザーに適切なエラーメッセージを表示するために使用

---

### UserLoggedOut

ユーザーがログアウトした時に発行されるイベントです。

#### ペイロード
```typescript
{
  userId: string;
  loggedOutAt: Date;
}
```

#### 発生タイミング
- `AuthState.logout()`が正常に完了した時

#### ビジネス意味
- ユーザーがログアウトしたことを示す
- UIの状態を更新するために使用

---

### CalendarInitialized

カレンダーが初期化された時に発行されるイベントです。

#### ペイロード
```typescript
{
  userId: string;
  calendarId: string;
  initializedAt: Date;
}
```

#### 発生タイミング
- `AuthState.initializeCalendar()`が正常に完了した時

#### ビジネス意味
- 専用カレンダーが準備完了したことを示す
- 他のUnit（Calendar API連携）がカレンダーIDを取得できる

---

## Repositories

### AuthRepository

認証状態の永続化を担当するRepositoryインターフェースです。

#### インターフェース
```typescript
interface AuthRepository {
  // 認証状態を取得
  findByUserId(userId: string): Promise<AuthState | null>;
  
  // 認証状態を保存
  save(authState: AuthState): Promise<void>;
  
  // 認証状態を削除
  delete(userId: string): Promise<void>;
  
  // 現在の認証状態を取得（シングルトン的な動作）
  getCurrent(): Promise<AuthState | null>;
}
```

#### 責任
- 認証状態の永続化（Chrome Storage APIを使用）
- 認証状態の取得
- 認証状態の削除

#### 実装の注意事項
- インフラストラクチャ層で実装される
- ドメイン層からはインターフェースのみを参照
- 永続化の詳細（Chrome Storage API）は実装に隠蔽

---

## Factories

### AuthStateFactory

`AuthState`の作成を担当するFactoryです。

#### メソッド

##### `createUnauthenticated(userId: string): AuthState`
未認証状態の`AuthState`を作成します。

**パラメータ**:
- `userId: string` - ユーザーID

**戻り値**: `AuthState`（未認証状態）

**不変条件の検証**:
- `userId`が空文字列でないことを確認

---

##### `createAuthenticated(
  userId: string,
  accessToken: AccessToken,
  refreshToken: RefreshToken,
  tokenExpiry: TokenExpiry
): AuthState`
認証済み状態の`AuthState`を作成します。

**パラメータ**:
- `userId: string` - ユーザーID
- `accessToken: AccessToken` - アクセストークン
- `refreshToken: RefreshToken` - リフレッシュトークン
- `tokenExpiry: TokenExpiry` - トークンの有効期限

**戻り値**: `AuthState`（認証済み状態）

**不変条件の検証**:
- `userId`が空文字列でないことを確認
- `accessToken`が有効であることを確認
- `refreshToken`が有効であることを確認
- `tokenExpiry`が未来の日時であることを確認

---

##### `createWithCalendar(
  userId: string,
  accessToken: AccessToken,
  refreshToken: RefreshToken,
  tokenExpiry: TokenExpiry,
  calendarId: CalendarId
): AuthState`
認証済みかつカレンダー初期化済みの`AuthState`を作成します。

**パラメータ**:
- `userId: string` - ユーザーID
- `accessToken: AccessToken` - アクセストークン
- `refreshToken: RefreshToken` - リフレッシュトークン
- `tokenExpiry: TokenExpiry` - トークンの有効期限
- `calendarId: CalendarId` - カレンダーID

**戻り値**: `AuthState`（認証済みかつカレンダー初期化済み状態）

**不変条件の検証**:
- `createAuthenticated`の検証に加えて
- `calendarId`が有効であることを確認

---

## ビジネスルール

### 認証に関するルール

#### BR-001: 単一認証状態
**ルール**: ユーザーは一度に1つの認証状態のみを持つことができる。

**実装**: `AuthRepository.getCurrent()`は、常に1つの`AuthState`のみを返す。

---

#### BR-002: トークンの有効期限
**ルール**: トークンは有効期限を持つ。有効期限が過ぎたトークンは無効とみなす。

**実装**: `TokenExpiry.isExpired()`で判定。`AuthState.isTokenExpired()`で確認可能。

---

#### BR-003: トークンの自動更新
**ルール**: トークンが期限切れの場合、リフレッシュトークンを使用して自動的に更新を試みる。

**実装**: アプリケーション層で実装（ドメイン層の外）。

---

#### BR-004: 認証失敗時の処理
**ルール**: 認証に失敗した場合、`AuthenticationFailed`イベントを発行し、ユーザーに適切なエラーメッセージを表示する。

**実装**: アプリケーション層で実装。ドメイン層はイベントを発行するのみ。

---

### カレンダーに関するルール

#### BR-005: カレンダーの自動作成
**ルール**: 認証後、専用カレンダーが存在しない場合は自動作成する。

**実装**: アプリケーション層で実装（ドメイン層の外）。`CalendarInitialized`イベントを発行。

---

#### BR-006: 既存カレンダーの使用
**ルール**: 既存のカレンダーが存在する場合は、それを使用する。

**実装**: アプリケーション層で実装。`CalendarInitialized`イベントを発行。

---

#### BR-007: カレンダーIDの必須性
**ルール**: 認証済みの場合、カレンダーIDは存在するか、初期化待ちの状態である。

**実装**: `AuthState.initializeCalendar()`で設定。不変条件として検証。

---

## エンティティ図

```
┌─────────────────────────────────────────┐
│         Authentication Aggregate        │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │      AuthState (Entity)          │  │
│  │  - userId: string                │  │
│  │  - isAuthenticated: boolean      │  │
│  │  - accessToken: AccessToken?     │  │
│  │  - refreshToken: RefreshToken?   │  │
│  │  - tokenExpiry: TokenExpiry?     │  │
│  │  - calendarId: CalendarId?       │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────┐  ┌──────────────┐  │
│  │ AccessToken  │  │ RefreshToken  │  │
│  │ (Value Obj)  │  │ (Value Obj)   │  │
│  └──────────────┘  └──────────────┘  │
│                                         │
│  ┌──────────────┐  ┌──────────────┐  │
│  │ TokenExpiry  │  │ CalendarId    │  │
│  │ (Value Obj)  │  │ (Value Obj)   │  │
│  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────┘
         │
         │ uses
         ▼
┌─────────────────────────────────────────┐
│         AuthRepository                   │
│         (Interface)                     │
└─────────────────────────────────────────┘
```

---

## Domain Events フロー

```
認証フロー:
  User → authenticate() → UserAuthenticated
                          ↓
                    CalendarInitialized

トークン更新フロー:
  User → refreshToken() → TokenRefreshed

ログアウトフロー:
  User → logout() → UserLoggedOut

エラーフロー:
  authenticate() fails → AuthenticationFailed
```

---

## ドメインモデルの特徴

### 1. インフラストラクチャからの独立性
- Chrome Extension API、Google Calendar APIの詳細は含まない
- Repositoryインターフェースを通じて永続化を抽象化
- 純粋なビジネスロジックに焦点

### 2. 不変性の保証
- Value Objectsは不変
- Entityの状態変更は、Aggregate Rootを通じてのみ

### 3. ビジネスルールの明確化
- 不変条件として定義
- Factoryで検証
- Entityのメソッドで強制

### 4. イベント駆動
- 重要なビジネスイベントをDomain Eventsとして定義
- 他のUnitとの疎結合を実現

---

## 実装時の注意事項

### ドメイン層の実装
- インフラストラクチャの詳細を含めない
- 純粋なTypeScriptクラスとして実装
- テスト容易性を重視

### アプリケーション層との連携
- Domain Eventsを発行し、アプリケーション層で処理
- Repositoryインターフェースを実装
- Factoryを使用してEntityを作成

### インフラストラクチャ層の実装
- Repositoryインターフェースの実装
- Chrome Storage APIを使用した永続化
- Domain Eventsの永続化（必要に応じて）

---

**作成日**: 2026-01-21  
**最終更新**: 2026-01-21  
**ステータス**: 完了
