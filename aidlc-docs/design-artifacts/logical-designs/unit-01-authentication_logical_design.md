# Logical Design: Unit 1 - Chrome拡張基盤と認証

## 概要
本ドキュメントは、Unit 1（Chrome拡張基盤と認証）のLogical Designを定義します。Domain Modelを拡張し、NFRsを満たすためのアーキテクチャパターンを適用した実装可能な設計です。

## アーキテクチャパターン

### 採用したパターン

1. **レイヤードアーキテクチャ**: ドメイン層、アプリケーション層、インフラストラクチャ層の分離
2. **Repository パターン**: 永続化の抽象化
3. **Factory パターン**: 複雑なオブジェクト作成
4. **Domain Events パターン**: イベント駆動アーキテクチャ
5. **Service Layer パターン**: アプリケーションロジックの集約
6. **Retry パターン**: ネットワークエラー時のリトライ

---

## レイヤー構造

### 1. ドメイン層 (Domain Layer)

**責任**: ビジネスロジックとドメインモデル

**コンポーネント**:
- `Authentication` (Aggregate Root)
- `AuthState` (Entity)
- `AccessToken`, `RefreshToken`, `TokenExpiry`, `CalendarId` (Value Objects)
- `AuthRepository` (Interface)
- `AuthStateFactory`
- Domain Events (`UserAuthenticated`, `TokenRefreshed`, `AuthenticationFailed`, `UserLoggedOut`, `CalendarInitialized`)

**特徴**:
- インフラストラクチャに依存しない
- 純粋なビジネスロジック
- テスト容易性が高い

---

### 2. アプリケーション層 (Application Layer)

**責任**: ユースケースの実装、ドメイン層とインフラストラクチャ層の調整

**コンポーネント**:

#### AuthenticationService
- `authenticate()`: 認証フローの実行
- `refreshToken()`: トークン更新の実行
- `isAuthenticated()`: 認証状態の確認
- `logout()`: ログアウトの実行

**依存関係**:
- Domain Layer (Authentication Aggregate, AuthRepository)
- Infrastructure Layer (ChromeIdentityAdapter, AuthRepositoryImpl)

#### CalendarInitializationService
- `ensureCalendarExists()`: カレンダーの存在確認と作成
- `getCalendarId()`: カレンダーIDの取得

**依存関係**:
- Domain Layer (Authentication Aggregate)
- Infrastructure Layer (GoogleCalendarAdapter)

#### TokenRefreshService
- `refreshTokenIfNeeded()`: トークンが期限切れの場合、自動更新

**依存関係**:
- Domain Layer (Authentication Aggregate)
- Infrastructure Layer (ChromeIdentityAdapter)

#### EventHandler
- Domain Eventsの処理
- UI更新のトリガー
- ログ記録

**依存関係**:
- Domain Layer (Domain Events)
- Infrastructure Layer (UIMessenger, Logger)

---

### 3. インフラストラクチャ層 (Infrastructure Layer)

**責任**: 外部APIとの通信、永続化、UIとの通信

**コンポーネント**:

#### ChromeIdentityAdapter
- Chrome Identity APIのラッパー
- OAuth 2.0フローの実装
- トークンの取得

**実装**:
```typescript
class ChromeIdentityAdapter {
  async getAuthToken(): Promise<string>
  async removeCachedAuthToken(): Promise<void>
}
```

#### AuthRepositoryImpl
- `AuthRepository`インターフェースの実装
- Chrome Storage APIを使用した永続化

**実装**:
```typescript
class AuthRepositoryImpl implements AuthRepository {
  async findByUserId(userId: string): Promise<AuthState | null>
  async save(authState: AuthState): Promise<void>
  async delete(userId: string): Promise<void>
  async getCurrent(): Promise<AuthState | null>
}
```

#### GoogleCalendarAdapter
- Google Calendar APIとの通信
- カレンダーの作成・取得
- Retry パターンの実装

**実装**:
```typescript
class GoogleCalendarAdapter {
  async createCalendar(name: string, accessToken: string): Promise<CalendarId>
  async getCalendar(calendarId: string, accessToken: string): Promise<Calendar>
  async listCalendars(accessToken: string): Promise<Calendar[]>
}
```

#### RetryHandler
- ネットワークエラー時のリトライ
- 指数バックオフの実装
- レート制限エラー（429）の処理

**実装**:
```typescript
class RetryHandler {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T>
}
```

#### UIMessenger
- Service WorkerとUI間のメッセージパッシング
- 認証状態の通知

**実装**:
```typescript
class UIMessenger {
  async sendMessage(message: Message): Promise<void>
  onMessage(callback: (message: Message) => void): void
}
```

#### Logger
- エラーログの記録
- パフォーマンスログの記録

**実装**:
```typescript
class Logger {
  error(message: string, error?: Error): void
  warn(message: string): void
  info(message: string): void
  performance(operation: string, duration: number): void
}
```

---

## コンポーネント図

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer                              │
│  (Side Panel, Popup)                                    │
└────────────────────┬────────────────────────────────────┘
                     │ Message Passing
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Application Layer                          │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │ Authentication   │  │ CalendarInit      │           │
│  │ Service          │  │ Service          │           │
│  └────────┬─────────┘  └────────┬─────────┘           │
│           │                      │                      │
│  ┌────────▼─────────┐  ┌────────▼─────────┐           │
│  │ TokenRefresh     │  │ EventHandler      │           │
│  │ Service          │  │                   │           │
│  └─────────────────┘  └──────────────────┘           │
└───────────┬──────────────────────┬─────────────────────┘
            │                      │
            │ uses                 │ uses
            ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│                 Domain Layer                            │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │ Authentication   │  │ AuthRepository   │           │
│  │ (Aggregate)      │  │ (Interface)      │           │
│  └──────────────────┘  └──────────────────┘           │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │ AuthState       │  │ AuthStateFactory │           │
│  │ (Entity)        │  │                  │           │
│  └──────────────────┘  └──────────────────┘           │
│  ┌──────────────────┐                                  │
│  │ Domain Events    │                                  │
│  └──────────────────┘                                  │
└───────────┬─────────────────────────────────────────────┘
            │
            │ implements
            ▼
┌─────────────────────────────────────────────────────────┐
│            Infrastructure Layer                          │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │ ChromeIdentity   │  │ AuthRepository   │           │
│  │ Adapter          │  │ Impl             │           │
│  └──────────────────┘  └──────────────────┘           │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │ GoogleCalendar   │  │ RetryHandler     │           │
│  │ Adapter          │  │                  │           │
│  └──────────────────┘  └──────────────────┘           │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │ UIMessenger      │  │ Logger            │           │
│  └──────────────────┘  └──────────────────┘           │
└───────────┬─────────────────────────────────────────────┘
            │
            │ uses
            ▼
┌─────────────────────────────────────────────────────────┐
│              External APIs                               │
│  Chrome Identity API │ Chrome Storage API                │
│  Google Calendar API                                     │
└─────────────────────────────────────────────────────────┘
```

---

## データフロー

### 認証フロー

```
1. User → UI Layer
   ↓
2. UI Layer → AuthenticationService.authenticate()
   ↓
3. AuthenticationService → ChromeIdentityAdapter.getAuthToken()
   ↓
4. ChromeIdentityAdapter → Chrome Identity API
   ↓
5. Chrome Identity API → OAuth 2.0 Token
   ↓
6. ChromeIdentityAdapter → AuthenticationService
   ↓
7. AuthenticationService → AuthStateFactory.createAuthenticated()
   ↓
8. AuthStateFactory → Authentication.authenticate()
   ↓
9. Authentication → Domain Event: UserAuthenticated
   ↓
10. AuthenticationService → AuthRepository.save()
   ↓
11. AuthRepositoryImpl → Chrome Storage API
   ↓
12. EventHandler → UIMessenger.sendMessage()
   ↓
13. UIMessenger → UI Layer (認証状態の更新)
```

### トークン更新フロー

```
1. TokenRefreshService → Authentication.isTokenExpired()
   ↓
2. Authentication → true (期限切れ)
   ↓
3. TokenRefreshService → ChromeIdentityAdapter.getAuthToken()
   ↓
4. ChromeIdentityAdapter → Chrome Identity API
   ↓
5. Chrome Identity API → New OAuth 2.0 Token
   ↓
6. ChromeIdentityAdapter → TokenRefreshService
   ↓
7. TokenRefreshService → Authentication.refreshToken()
   ↓
8. Authentication → Domain Event: TokenRefreshed
   ↓
9. TokenRefreshService → AuthRepository.save()
   ↓
10. EventHandler → UIMessenger.sendMessage()
```

### カレンダー初期化フロー

```
1. CalendarInitializationService → AuthRepository.getCurrent()
   ↓
2. AuthRepositoryImpl → Chrome Storage API
   ↓
3. AuthRepositoryImpl → AuthState (認証済み)
   ↓
4. CalendarInitializationService → GoogleCalendarAdapter.listCalendars()
   ↓
5. GoogleCalendarAdapter → Google Calendar API (with RetryHandler)
   ↓
6. Google Calendar API → Calendar List
   ↓
7. CalendarInitializationService → カレンダー存在チェック
   ↓
8. 存在しない場合 → GoogleCalendarAdapter.createCalendar()
   ↓
9. GoogleCalendarAdapter → Google Calendar API (with RetryHandler)
   ↓
10. Google Calendar API → New Calendar
   ↓
11. CalendarInitializationService → Authentication.initializeCalendar()
   ↓
12. Authentication → Domain Event: CalendarInitialized
   ↓
13. CalendarInitializationService → AuthRepository.save()
   ↓
14. EventHandler → UIMessenger.sendMessage()
```

---

## 統合ポイント

### 1. Chrome Identity API
- **目的**: OAuth 2.0認証
- **実装**: `ChromeIdentityAdapter`
- **エラーハンドリング**: 認証エラー時は`AuthenticationFailed`イベントを発行

### 2. Chrome Storage API
- **目的**: 認証状態の永続化
- **実装**: `AuthRepositoryImpl`
- **エラーハンドリング**: ストレージエラー時はログに記録し、再試行

### 3. Google Calendar API
- **目的**: カレンダーの作成・取得
- **実装**: `GoogleCalendarAdapter`
- **エラーハンドリング**: 
  - Retry パターン（最大3回、指数バックオフ）
  - レート制限エラー（429）の処理
  - ネットワークエラーの処理

### 4. Service Worker ↔ UI通信
- **目的**: 認証状態の通知
- **実装**: `UIMessenger`
- **プロトコル**: Chrome Extension Message Passing API

---

## エラーハンドリング戦略

### 1. 認証エラー
- **処理**: `AuthenticationFailed`イベントを発行
- **UI対応**: ユーザーにエラーメッセージを表示
- **リトライ**: ユーザーが手動で再試行

### 2. トークン更新エラー
- **処理**: 再認証フローを開始
- **UI対応**: 認証画面を表示
- **リトライ**: 自動的に再認証を試みる

### 3. ネットワークエラー
- **処理**: Retry パターン（最大3回、指数バックオフ）
- **UI対応**: リトライ中の表示
- **リトライ**: 自動的にリトライ

### 4. レート制限エラー（429）
- **処理**: `Retry-After`ヘッダーを確認し、待機
- **UI対応**: ユーザーに待機時間を通知
- **リトライ**: 待機後に自動的にリトライ

### 5. APIエラー
- **処理**: エラーレスポンスを解析し、適切な処理
- **UI対応**: ユーザーフレンドリーなエラーメッセージを表示
- **ログ**: エラーログを記録

---

## セキュリティ境界

### 1. 認証境界
- **境界**: Chrome Identity API ↔ Application Layer
- **保護**: OAuth 2.0による認証
- **検証**: トークンの有効性を確認

### 2. データ境界
- **境界**: Chrome Storage API ↔ Application Layer
- **保護**: Chrome Storage APIの暗号化機能
- **検証**: データの整合性チェック

### 3. 通信境界
- **境界**: Google Calendar API ↔ Application Layer
- **保護**: HTTPS通信
- **検証**: トークンの有効性を確認

---

## 技術スタック

### 言語・フレームワーク
- **TypeScript**: 型安全性の確保
- **ESLint + Prettier**: コード品質の維持

### Chrome Extension APIs
- **chrome.identity**: OAuth 2.0認証
- **chrome.storage.local**: 認証状態の永続化
- **chrome.runtime**: メッセージパッシング

### 外部API
- **Google Calendar API v3**: カレンダー操作

### テスト
- **Jest**: ユニットテスト
- **Chrome Extension Test Utils**: 統合テスト

---

## デプロイメントモデル

### Chrome拡張機能
- **配布**: Chrome Web Store
- **インストール**: ユーザーがChrome Web Storeからインストール
- **更新**: Chrome Web Store経由で自動更新

### ビルド
- **TypeScript**: JavaScriptへのコンパイル
- **バンドル**: WebpackまたはVite
- **最適化**: コード分割、Tree Shaking

---

## パフォーマンス最適化

### 1. メモリ使用量
- **戦略**: 最小限のデータのみを保持
- **実装**: 不要なデータの即座に解放

### 2. ネットワークリクエスト
- **戦略**: キャッシュの活用
- **実装**: 認証状態をローカルにキャッシュ

### 3. レスポンス時間
- **戦略**: 非同期処理の最適化
- **実装**: Promiseの並列処理（可能な場合）

---

## 保守性

### 1. モジュール化
- **戦略**: レイヤーごとに独立したモジュール
- **実装**: 明確なインターフェース定義

### 2. テスト容易性
- **戦略**: 依存性の注入
- **実装**: インターフェースベースの設計

### 3. ドキュメント
- **戦略**: JSDocコメント
- **実装**: すべての公開APIにコメント

---

**作成日**: 2026-01-21  
**最終更新**: 2026-01-21  
**ステータス**: 完了
