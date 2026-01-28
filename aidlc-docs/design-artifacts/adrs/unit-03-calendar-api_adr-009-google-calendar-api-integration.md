# ADR-009: Google Calendar API連携パターン

## ステータス
承認済み

## コンテキスト
Unit 3（Google Calendar API連携）では、Google Calendar APIを使用してカレンダーイベントのCRUD操作を実装する必要があります。

Unit 1で既に以下のパターンが実装されています：
- Repository パターン（ADR-002）
- Retry パターン（ADR-006）
- Adapter パターン（GoogleCalendarAdapter）

Unit 3では、これらのパターンを拡張して、カレンダーイベントのCRUD操作を実装する必要があります。

## 決定
Google Calendar API連携パターンを採用します：

1. **Repository パターンの拡張**: `CalendarEventRepository`インターフェースを定義
   - ドメイン層でインターフェースを定義
   - インフラストラクチャ層で`CalendarEventRepositoryImpl`を実装
   - Google Calendar APIを使用した永続化

2. **Adapter パターンの拡張**: `GoogleCalendarAdapter`を拡張
   - Unit 1で実装済みの機能（カレンダーの作成・取得）を継承
   - Unit 3でカレンダーイベントのCRUD操作を追加
   - Retry パターンを活用（Unit 1で実装済み）

3. **Service Layer パターン**: `CalendarEventService`を実装
   - カレンダーイベントのCRUD操作を集約
   - ドメイン層とインフラストラクチャ層の調整

4. **Retry パターンの再利用**: Unit 1で実装済みの`RetryHandler`を再利用
   - Google Calendar API呼び出し時のリトライ処理
   - レート制限エラー（429）の処理

5. **認証の統合**: Unit 1の認証トークンを使用
   - `AuthenticationService`から認証状態を取得
   - `CalendarId`と`AccessToken`を使用してAPI呼び出し

## 結果

### ポジティブ
- **一貫性**: Unit 1のパターンと一貫性を保つ
- **再利用性**: Unit 1で実装済みのコンポーネント（RetryHandler、GoogleCalendarAdapter）を再利用
- **テスト容易性**: Repository パターンにより、ドメイン層をテスト可能
- **保守性**: 各層の責任が明確
- **拡張性**: 将来の機能追加に対応できる

### ネガティブ
- **コード量の増加**: インターフェースと実装の分離により、コード量が増加
- **複雑性**: 複数の層を経由する必要がある

### 検討した代替案

#### 代替案1: 直接的なAPI呼び出し
- **説明**: アプリケーション層から直接Google Calendar APIを呼び出す
- **却下理由**: テスト困難、ドメイン層がインフラストラクチャに依存、Unit 1のパターンと一貫性がない

#### 代替案2: Active Record パターン
- **説明**: WorkStateが自身の永続化を担当
- **却下理由**: ドメイン層がインフラストラクチャに依存、単一責任の原則に違反

#### 代替案3: 別のAdapter実装
- **説明**: Unit 1とは別のAdapterを実装
- **却下理由**: コードの重複、保守性の低下、一貫性の欠如

## 日付
2026-01-21

---

**作成者**: アーキテクト  
**レビュー**: 承認済み
