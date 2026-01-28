# Domain Model作成計画: Unit 1 - Chrome拡張基盤と認証

## 概要
Unit 1（Chrome拡張基盤と認証）のDomain Modelを作成します。Domain-Driven Design原則に基づいて、認証ドメインのビジネスロジックをインフラストラクチャから独立してモデル化します。

## 対象Unit
- **Unit名**: Unit 1: Chrome拡張基盤と認証
- **Unit定義ファイル**: `aidlc-docs/design-artifacts/units/unit-01-authentication.md`
- **関連User Story**: US-1（Googleアカウント認証とカレンダー初期化）

## 実行ステップ

### ステップ1: Unit定義の読み込み
- [x] Unit定義ファイルを読み込む
- [x] User Storiesと受け入れ基準を分析
- [x] ビジネスロジックの要件を抽出

### ステップ2: ドメインエンティティの特定
- [x] 主要なビジネス概念を抽出
- [x] 各エンティティの識別子、属性、ビジネスルール、ライフサイクルを定義

**定義されたエンティティ**:
- `AuthState`: 認証状態を表すエンティティ（Aggregate Root: Authenticationの一部）

### ステップ3: Value Objectsの定義
- [x] 値を持つが識別子を持たない概念を特定
- [x] 不変性を確保

**定義されたValue Objects**:
- `AccessToken`: アクセストークン（不変）
- `RefreshToken`: リフレッシュトークン（不変）
- `TokenExpiry`: トークンの有効期限（不変）
- `CalendarId`: カレンダーID（不変）

### ステップ4: Aggregatesの定義
- [x] エンティティとValue ObjectsをAggregatesにグループ化
- [x] Aggregate Rootを特定
- [x] 境界を定義
- [x] 不変条件を定義

**定義されたAggregate**:
- `Authentication` (Aggregate Root)
  - `AuthState` (Entity)
  - `AccessToken` (Value Object)
  - `RefreshToken` (Value Object)
  - `TokenExpiry` (Value Object)
  - `CalendarId` (Value Object)

### ステップ5: Domain Eventsの定義
- [x] ビジネス上重要なイベントを特定
- [x] 各イベントの名前、ペイロード、発生タイミングを定義

**定義されたDomain Events**:
- `UserAuthenticated`: ユーザーが認証された時
- `TokenRefreshed`: トークンが更新された時
- `AuthenticationFailed`: 認証に失敗した時
- `UserLoggedOut`: ユーザーがログアウトした時
- `CalendarInitialized`: カレンダーが初期化された時

### ステップ6: Repositoriesの定義
- [x] 各AggregateのRepositoryインターフェースを定義
- [x] 永続化の抽象化を提供
- [x] クエリメソッドを定義

**定義されたRepository**:
- `AuthRepository`: 認証状態の永続化インターフェース

### ステップ7: Factoriesの定義
- [x] 複雑なオブジェクト作成を担当するFactoryを定義
- [x] 不変条件の検証を含める

**定義されたFactory**:
- `AuthStateFactory`: AuthStateの作成を担当（3つのファクトリメソッド）

### ステップ8: ドメインモデルドキュメントの作成
- [x] `aidlc-docs/design-artifacts/domain-models/unit-01-authentication_domain_model.md` を作成
- [x] ドメインモデルの概要、エンティティ図、Aggregates、Value Objects、Domain Events、Repositories、Factories、ビジネスルールを含める
- [x] 計画ファイルのチェックボックスを更新

## ビジネスルール（抽出予定）

### 認証に関するルール
- ユーザーは一度に1つの認証状態のみを持つことができる
- トークンは有効期限を持つ
- トークンが期限切れの場合、自動的に更新を試みる
- 認証に失敗した場合、ユーザーに適切なエラーメッセージを表示する

### カレンダーに関するルール
- 認証後、専用カレンダーが存在しない場合は自動作成する
- 既存のカレンダーが存在する場合は、それを使用する
- カレンダーIDは認証状態の一部として管理される

## 注意事項
- インフラストラクチャの詳細（Chrome APIs、Google Calendar API）は含めない
- 純粋なビジネスロジックに焦点を当てる
- DDDの戦略的設計と戦術的設計の両方を適用
- 実装コードは生成しない（設計のみ）

---
**作成日**: 2026-01-21  
**ステータス**: レビュー待ち
