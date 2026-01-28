# Domain Model作成計画: Unit 2 - タブ状態キャプチャ

## 概要
Unit 2（タブ状態キャプチャ）のDomain Modelを作成します。Domain-Driven Design原則に基づいて、タブ情報取得ドメインのビジネスロジックをインフラストラクチャから独立してモデル化します。

## 対象Unit
- **Unit名**: Unit 2: タブ状態キャプチャ
- **Unit定義ファイル**: `aidlc-docs/design-artifacts/units/unit-02-tab-capture.md`
- **関連User Story**: US-2（現在のタブ状態の取得と表示）

## 実行ステップ

### ステップ1: Unit定義の読み込み
- [x] Unit定義ファイルを読み込む
- [x] User Storiesと受け入れ基準を分析
- [x] ビジネスロジックの要件を抽出

### ステップ2: ドメインエンティティの特定
- [x] 主要なビジネス概念を抽出
- [x] 各エンティティの識別子、属性、ビジネスルール、ライフサイクルを定義

**結果**:
- Unit 2は比較的シンプルで、エンティティは不要（Value ObjectsとDomain Eventsで十分）

### ステップ3: Value Objectsの定義
- [x] 値を持つが識別子を持たない概念を特定
- [x] 不変性を確保

**定義されたValue Objects**:
- `TabInfo`: タブ情報を表すValue Object
  - `url`: タブのURL（必須、文字列）
  - `title`: タブのタイトル（必須、文字列）
  - `faviconUrl`: ファビコンURL（任意、文字列）
  - `index`: タブの順序（必須、数値、0から始まる連番）
  - `extensions`: 拡張フィールド（任意、Unit 3の拡張性パターンに合わせる）

### ステップ4: Aggregatesの定義
- [x] エンティティとValue ObjectsをAggregatesにグループ化
- [x] Aggregate Rootを特定
- [x] 境界を定義
- [x] 不変条件を定義

**結果**:
- Unit 2は比較的シンプルで、Aggregateは不要
- タブ情報の取得は、主にValue ObjectsとDomain Eventsで表現可能

### ステップ5: Domain Eventsの定義
- [x] ビジネス上重要なイベントを特定
- [x] 各イベントの名前、ペイロード、発生タイミングを定義

**定義されたDomain Events**:
- `TabsCaptured`: タブ情報が取得された時
  - ペイロード: タブ情報の配列（TabInfo[]）、取得日時、ウィンドウID、タブ数
  - 発生タイミング: タブ情報の取得が正常に完了した時

### ステップ6: Repositoriesの定義
- [x] 各AggregateのRepositoryインターフェースを定義
- [x] 永続化の抽象化を提供
- [x] クエリメソッドを定義

**結果**:
- Unit 2はタブ情報の取得のみで、永続化は不要
- Repositoryは定義しない

### ステップ7: Factoriesの定義
- [x] 複雑なオブジェクト作成を担当するFactoryを定義
- [x] 不変条件の検証を含める

**定義されたFactory**:
- `TabInfoFactory`: TabInfoの作成を担当
  - `createFromChromeTab(chromeTab: chrome.tabs.Tab): TabInfo` - Chrome Tabs APIのデータからTabInfoを作成
  - `createFromRawData(data: {...}): TabInfo` - 生のデータからTabInfoを作成
  - バリデーション（URLの形式チェック、タイトルの空文字チェック、インデックスの検証など）

### ステップ8: ドメインモデルドキュメントの作成
- [x] `aidlc-docs/design-artifacts/domain-models/unit-02-tab-capture_domain_model.md` を作成
- [x] ドメインモデルの概要、エンティティ図、Aggregates、Value Objects、Domain Events、Repositories、Factories、ビジネスルールを含める
- [x] 計画ファイルのチェックボックスを更新

## ビジネスルール（抽出予定）

### タブ情報に関するルール
- タブ情報は必ずURLとタイトルを持つ
- タブの順序（index）は0から始まる連番である
- ファビコンURLは任意（取得できない場合もある）
- URLは有効な形式である必要がある（簡易チェック）

### タブ取得に関するルール
- 現在のウィンドウのタブのみを取得する
- タブの順序は保持される
- タブ情報の取得に失敗した場合、エラーを記録する
- パフォーマンス要件: 最大20タブの取得を500ms以内で完了

### エラーハンドリングに関するルール
- タブ取得エラー時、エラーメッセージを表示する
- ファビコン取得エラー時、デフォルトアイコンを使用する
- 権限エラー時、ユーザーに権限の許可を促す

## 既存実装との統合

### Unit 3との関係
- `TabInfo`は既にUnit 3で参照されている（`FRONTEND/src/domain/value-objects/tab-info.ts`）
- Unit 2では、`TabInfo`の完全な実装（Value Objectとして）を定義する必要がある
- Unit 3の`WorkStateMetadata`は`TabInfo[]`を使用している

### Unit 1との関係
- 認証は不要（タブ情報の取得は認証不要）
- ただし、将来的に認証状態に応じてタブ情報の表示を制御する可能性がある

## 注意事項
- インフラストラクチャの詳細（Chrome Tabs API、Chrome Windows API）は含めない
- 純粋なビジネスロジックに焦点を当てる
- DDDの戦略的設計と戦術的設計の両方を適用
- 実装コードは生成しない（設計のみ）
- Unit 3で既に参照されている`TabInfo`の完全な定義を提供する

## 参考資料
- Unit定義: `aidlc-docs/design-artifacts/units/unit-02-tab-capture.md`
- User Story: `aidlc-docs/story-artifacts/user_stories.md` (US-2)
- 既存のTabInfo参照: `FRONTEND/src/domain/value-objects/tab-info.ts`
- Unit 3のDomain Model: `aidlc-docs/design-artifacts/domain-models/unit-03-calendar-api_domain_model.md`

---
**作成日**: 2026-01-22  
**最終更新**: 2026-01-22  
**ステータス**: 完了 ✅

## 完了サマリー

Unit 2のドメインモデルを作成しました。以下の要素を定義しました：

### 定義された要素
- **Value Objects**: `TabInfo`（完全な定義）
- **Domain Events**: `TabsCaptured`
- **Factories**: `TabInfoFactory`（2つのファクトリメソッド）

### 設計の特徴
- **シンプルな設計**: AggregateやRepositoryは不要（タブ情報の取得のみ）
- **既存実装との統合**: Unit 3で既に参照されている`TabInfo`の完全な定義を提供
- **拡張性**: Unit 3の拡張性パターン（`extensions`フィールド）に合わせる

### 成果物
- `aidlc-docs/design-artifacts/domain-models/unit-02-tab-capture_domain_model.md` ✅
