# Domain Model作成計画: Unit 3 - Calendar API連携

## 概要
Unit 3（Calendar API連携）のDomain Modelを作成します。Google Calendar APIを使用して、仕事状態の保存、読み取り、更新を行う機能のドメインモデルを定義します。

## 対象Unit
- **Unit名**: Unit 3: Google Calendar API連携
- **Unit定義**: `aidlc-docs/design-artifacts/units/unit-03-calendar-api.md`

## 実行ステップ

### ステップ1: Unit定義の読み込み
- [x] Unit定義ファイルを読み込む
- [x] User Storiesと受け入れ基準を分析
- [x] ビジネスロジックの要件を抽出
- [x] 既存のUnit 1のドメインモデルを参照

### ステップ2: ドメインエンティティの特定
- [x] 主要なビジネス概念を抽出
- [x] 各エンティティの以下を定義：
  - 識別子
  - 属性
  - ビジネスルール
  - ライフサイクル
- [x] 定義されたエンティティ：
  - `WorkState`: 仕事状態（TaskBookmark Aggregateの一部）

### ステップ3: Value Objectsの定義
- [x] 値を持つが識別子を持たない概念を特定
- [x] 不変性を確保
- [x] 定義されたValue Objects：
  - `EventId`: イベントID
  - `EventTitle`: イベントタイトル
  - `EventDescription`: イベント説明（JSON形式）
  - `TabInfo`: タブ情報（Unit 2とのインターフェース、参照のみ）
  - `WorkStateMetadata`: 仕事状態のメタデータ

### ステップ4: Aggregatesの定義
- [x] エンティティとValue ObjectsをAggregatesにグループ化
- [x] Aggregate Rootを特定（`TaskBookmark`）
- [x] 境界を定義
- [x] 不変条件を定義

### ステップ5: Domain Eventsの定義
- [x] ビジネス上重要なイベントを特定
- [x] 各イベントの以下を定義：
  - イベント名
  - ペイロード
  - 発生タイミング
- [x] 定義されたDomain Events：
  - `TaskBookmarkCreated`: タスクブックマークが作成された
  - `TaskBookmarkUpdated`: タスクブックマークが更新された
  - `TaskBookmarkDeleted`: タスクブックマークが削除された
  - `RestoreRelationRecorded`: 復元関係が記録された

### ステップ6: Repositoriesの定義
- [x] 各AggregateのRepositoryインターフェースを定義
- [x] 永続化の抽象化を提供
- [x] クエリメソッドを定義
- [x] 定義されたRepository：
  - `CalendarEventRepository`: カレンダーイベントの永続化（save, findById, findByDateRange, update, delete）

### ステップ7: Factoriesの定義
- [x] 複雑なオブジェクト作成を担当するFactoryを定義
- [x] 不変条件の検証を含める
- [x] 定義されたFactory：
  - `WorkStateFactory`: WorkStateの作成（createFromTabs, createFromCalendarEvent, createWithRestoreRelation）

### ステップ8: ドメインモデルドキュメントの作成
- [x] `aidlc-docs/design-artifacts/domain-models/unit-03-calendar-api_domain_model.md` を作成
- [x] 以下を含める：
  - ドメインモデルの概要
  - Aggregatesの説明
  - Value Objectsの説明
  - Domain Eventsの説明
  - Repositoriesの説明
  - Factoriesの説明
  - ビジネスルール
  - 他のUnitsとのインターフェース
  - データ構造（JSONスキーマ）

## 依存関係
- **Unit 1**: 認証機能、カレンダーID（既に実装済み）
- **Unit 2**: TabInfo型の参照（Bolt 3で実装予定、現時点ではインターフェース定義のみ）

## 注意事項
- インフラストラクチャの詳細は含めない（純粋なビジネスロジックに焦点）
- DDDの戦略的設計と戦術的設計の両方を適用
- 実装コードは生成しない（設計のみ）
- Unit 2のTabInfoはインターフェースとして定義（実装はBolt 3で）

---

**作成日**: 2026-01-21  
**最終更新**: 2026-01-21  
**ステータス**: ✅ 完了
