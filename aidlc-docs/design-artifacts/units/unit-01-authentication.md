# Unit 1: Chrome拡張基盤と認証

## 概要
Chrome拡張機能の基盤となるManifest V3の設定、OAuth 2.0認証、Google Calendar APIとの接続、専用カレンダーの初期化を担当するUnitです。

## 責任範囲
- Chrome拡張機能のManifest V3設定
- GoogleアカウントのOAuth 2.0認証（Chrome Identity API使用）
- 認証トークンの管理（保存、更新、有効期限監視）
- 専用カレンダーの作成・取得
- 認証状態の管理（Chrome Storage API）

## 関連User Stories
- **US-1**: Googleアカウント認証とカレンダー初期化

## 入力
- ユーザーの認証リクエスト
- トークン更新リクエスト

## 出力
- 認証状態（認証済み/未認証）
- アクセストークン
- カレンダーID

## 主要コンポーネント

### 1. Authentication Service
**責任**: OAuth 2.0認証フローの管理

**主要メソッド**:
- `authenticate()`: 初回認証を実行
- `refreshToken()`: トークンを更新
- `isAuthenticated()`: 認証状態を確認
- `logout()`: 認証を解除

**依存関係**:
- Chrome Identity API (`chrome.identity`)
- Chrome Storage API (`chrome.storage.local`)

### 2. Calendar Service
**責任**: Google Calendar APIとの通信

**主要メソッド**:
- `ensureCalendarExists()`: 専用カレンダーの存在確認と作成
- `getCalendarId()`: カレンダーIDを取得
- `createCalendar()`: 新しいカレンダーを作成

**依存関係**:
- Google Calendar API v3
- Authentication Service（トークン取得）

### 3. Token Manager
**責任**: 認証トークンのライフサイクル管理

**主要メソッド**:
- `getAccessToken()`: アクセストークンを取得（必要に応じて更新）
- `saveToken()`: トークンをChrome Storageに保存
- `isTokenExpired()`: トークンの有効期限を確認

**依存関係**:
- Chrome Storage API
- Authentication Service

## 技術スタック
- **言語**: TypeScript
- **API**: 
  - Chrome Extension API (Manifest V3)
  - Chrome Identity API
  - Google Calendar API v3
- **認証**: OAuth 2.0

## データ構造

### 認証状態（Chrome Storage）
```typescript
interface AuthState {
  isAuthenticated: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
  calendarId?: string;
}
```

## エラーハンドリング
- **認証エラー**: ユーザーフレンドリーなエラーメッセージを表示
- **トークン更新エラー**: 再認証フローを開始
- **カレンダー作成エラー**: エラーメッセージを表示し、リトライを促す

## テスト戦略
- **ユニットテスト**: 
  - 認証フローのモックテスト
  - トークン管理のテスト
- **統合テスト**: 
  - Google Calendar APIとの実際の通信テスト（テストアカウント使用）
  - エラーケースのテスト

## 依存関係
- **外部依存**: 
  - Google Calendar API
  - Chrome Extension API
- **内部依存**: なし（基盤Unitのため）

## 他のUnitsとのインターフェース
- **Unit 3 (Calendar API連携)**: 認証トークンとカレンダーIDを提供
- **Unit 5 (UI/UX)**: 認証状態を提供（認証済み/未認証の表示制御）

## 実装の優先順位
**優先度**: 最高（他のすべてのUnitの前提条件）

## リスク
- **RISK-002**: OAuth認証フローの複雑性（軽減策: Chrome Identity APIの活用、段階的実装）
- **RISK-007**: OAuthトークンの漏洩（軽減策: Chrome Storage APIの使用、最小限のスコープ）

## 成功基準
- [ ] 初回起動時に正常に認証できる
- [ ] トークンが自動的に更新される
- [ ] 専用カレンダーが自動作成される
- [ ] 認証エラーが適切に処理される
- [ ] ユニットテストのカバレッジが80%以上

---

**作成日**: 2026-01-21  
**最終更新**: 2026-01-21  
**ステータス**: 設計完了
