# アーキテクチャ設計計画: Unit 4 - 状態復元機能

## 概要
Unit 4（状態復元機能）のアーキテクチャ設計を実行します。Unit定義を基にLogical Designを作成し、非機能要件（NFRs）を満たすためのアーキテクチャパターンを適用します。

## 対象Unit
- **Unit名**: Unit 4: 状態復元機能
- **Unit定義**: `aidlc-docs/design-artifacts/units/unit-04-restore.md`
- **関連User Stories**: US-5（仕事状態の復元）、US-7（仕事の前後関係の可視化）
- **依存関係**: Unit 3（Calendar API連携）のドメインモデルを再利用

## 実行ステップ

### ステップ1: Unit定義とNFRsの読み込み
- [x] Unit定義を読み込む
- [x] NFRsを読み込む（特にパフォーマンス要件: 10タブを5秒以内で復元）
- [x] User Story 5を読み込む
- [x] Unit 3のDomain Modelを確認（WorkState、WorkStateMetadataの復元メタデータ部分）
- [x] 既存のアーキテクチャ（Unit 1, 2, 3）を確認して一貫性を保つ
- [x] 要件を分析

**分析結果**:
- Unit 3のドメインモデルに復元メタデータ（`restoredFrom`、`restoredTo`）が既に実装済み
- `WorkState.recordRestoredFrom()`メソッドが既に実装済み
- `WorkStateMetadata`に`restoredTo`フィールドが既に実装済み（配列形式）
- パフォーマンス要件: 10タブを5秒以内で復元（NFR-001）
- 大量タブ（20個以上）は段階的に読み込む必要がある

### ステップ2: 現状分析（既存アーキテクチャのレビュー）
- [x] Unit 1, 2, 3のLogical Designを確認
- [x] Unit 1, 2, 3のADRsを確認
- [x] 既存のパターンと規則を特定
  - レイヤードアーキテクチャ（Domain、Application、Infrastructure）
  - Adapter Pattern（ChromeTabsAdapter、ChromeWindowsAdapter）
  - Service Layer Pattern
  - Repository Pattern（Unit 3のCalendarEventRepository）
- [x] 技術スタックの一貫性を確認
- [x] 統合ポイントを特定（Unit 3との統合）

**分析結果**:
- **既存パターン**: レイヤードアーキテクチャ、Adapter Pattern、Service Layer Pattern、Repository Pattern、Factory Pattern、Domain Events Pattern
- **ChromeTabsAdapter**: 既に`getCurrentWindowTabs()`、`getTab()`、`getFaviconUrl()`が実装済み。`createTab()`、`createTabs()`を追加する必要がある
- **ChromeWindowsAdapter**: 既に`getCurrentWindowId()`、`getWindow()`が実装済み。`createWindow()`を追加する必要がある
- **Unit 3との統合**: `CalendarEventService`を拡張して`recordRestore()`メソッドを追加。`WorkState`の`recordRestoredFrom()`メソッドは既に実装済み
- **復元メタデータ**: `WorkStateMetadata`の`restoredTo`フィールド（配列形式）に復元日時を追加する必要がある

### ステップ3: アーキテクチャパターンの選択
- [x] NFRsに基づいて適切なパターンを選択
- [x] 既存パターンとの統合
- [x] 各パターンの適用理由を文書化
- [x] トレードオフを分析（Pros、Cons、Alternatives、Decision）

**選択したパターン**:

1. **Adapter Pattern**（既存、拡張）: Chrome Windows API、Chrome Tabs APIのラッパーを拡張
   - **適用理由**: Unit 2のパターンと一貫性を保つ。テスト容易性の向上。外部APIの詳細を抽象化。
   - **拡張内容**: 
     - `ChromeTabsAdapter`: `createTab()`, `createTabs()`メソッドを追加
     - `ChromeWindowsAdapter`: `createWindow()`メソッドを追加

2. **Service Layer Pattern**（既存、拡張）: RestoreService、TabRestoreManagerの実装
   - **適用理由**: Unit 1, 2, 3のパターンと一貫性を保つ。アプリケーションロジックの集約。
   - **新規サービス**:
     - `RestoreService`: 仕事状態の復元処理
     - `TabRestoreManager`: タブの復元処理と順序管理

3. **Repository Pattern**（既存、再利用）: Unit 3のCalendarEventRepositoryを再利用
   - **適用理由**: WorkStateの取得と復元メタデータの記録に使用。既存の実装を活用。

4. **Factory Pattern**（既存、再利用）: Unit 3のWorkStateFactoryを再利用
   - **適用理由**: WorkStateの作成に使用。既存の実装を活用。

5. **Strategy Pattern**（新規採用）: 段階的なタブ読み込み戦略
   - **適用理由**: パフォーマンス要件（10タブを5秒以内）と大量タブ（20個以上）の処理を両立。
   - **実装**: `RestoreService.restoreTabsBatch()`でバッチサイズと待機時間を戦略として定義。

6. **Observer Pattern**（簡易実装）: プログレス通知
   - **適用理由**: 復元中の進捗をUIに通知する必要がある。
   - **実装**: コールバック関数を使用（`onProgress?: (completed: number, total: number) => void`）

**却下したパターン**:
- **Command Pattern**: 復元操作のundo/redoは不要（将来の拡張で検討可能）
- **Chain of Responsibility Pattern**: エラーハンドリングは既存のパターンで十分

### ステップ4: Logical Designの作成
- [x] Unit定義を拡張してLogical Designを作成
- [x] レイヤー構造を定義（Domain、Application、Infrastructure）
- [x] コンポーネント図を作成
- [x] データフローを定義
- [x] 統合ポイントを定義（Unit 3との統合）
- [x] 技術スタックを定義
- [x] パフォーマンス最適化戦略を定義
- [x] `aidlc-docs/design-artifacts/logical-designs/unit-04-restore_logical_design.md` に保存

**主要コンポーネント**:
- **Application Layer**:
  - `RestoreService`: 仕事状態の復元処理
  - `TabRestoreManager`: タブの復元処理と順序管理
- **Infrastructure Layer**:
  - `ChromeTabsAdapter`（拡張）: タブ作成機能の追加
  - `ChromeWindowsAdapter`（拡張）: ウィンドウ作成機能の追加
- **Domain Layer**:
  - Unit 3のドメインモデルを再利用（WorkState、WorkStateMetadataなど）

### ステップ5: ADRsの作成
- [x] 重要なアーキテクチャ決定についてADRを作成
- [x] 各ADRに以下を含める：
  - タイトル
  - ステータス（提案、承認、非推奨）
  - コンテキスト
  - 決定
  - 結果（Positive、Negative、Alternatives Considered）
  - トレードオフ
- [x] `aidlc-docs/design-artifacts/adrs/` に保存

**作成したADRs**:
- **ADR-013**: Chrome Windows APIとChrome Tabs APIの統合パターン ✅
  - 新しいウィンドウの作成方法
  - タブの順序保証方法
  - エラーハンドリング戦略
- **ADR-014**: タブ復元のパフォーマンス最適化戦略 ✅
  - 段階的なタブ読み込み（バッチ処理）
  - 順序保証とパフォーマンスのトレードオフ
  - 大量タブ（20個以上）の処理方法
- **ADR-015**: 復元メタデータの記録戦略 ✅
  - 復元関係の記録方法（`restoredTo`フィールドへの追加）
  - Unit 3のCalendarEventRepositoryとの統合
  - メタデータ更新のタイミング

### ステップ6: トレードオフの分析
- [x] 選択したパターンのトレードオフを詳細に分析
- [x] 各設計決定について以下を文書化：
  - **Pros**: 利点とメリット
  - **Cons**: 欠点と制限
  - **Alternatives**: 検討した他のオプション
  - **Decision**: 最終的な選択と根拠
- [x] `ARCHITECTURE/unit-04-restore/trade-off-analysis.md` に保存

**分析結果**:
- 5つの主要なトレードオフを分析
- 各トレードオフについて、Pros、Cons、Alternatives、Decisionを文書化
- 設計原則を明確化（ユーザー要件の優先、パフォーマンス要件の達成、一貫性の維持、ユーザー体験の向上）

**主要なトレードオフ**:
- **順序保証 vs パフォーマンス**: 順番通りにタブを作成するか、並列処理で高速化するか
- **段階的読み込み vs 一括読み込み**: 大量タブの処理方法
- **エラー処理**: 部分的な復元の許容範囲

## 依存関係
- **Unit 3**: Calendar API連携（WorkStateの取得、復元メタデータの記録）
- **Unit 2**: TabInfo型の参照（既に実装済み）
- **Unit 1**: 認証機能、Logger（既に実装済み）

## 既存パターンの活用

### 再利用可能なコンポーネント
- **Domain Layer**:
  - `WorkState` (Entity): Unit 3から再利用
  - `WorkStateMetadata` (Value Object): Unit 3から再利用、`restoredTo`フィールドが既に実装済み
  - `EventId` (Value Object): Unit 3から再利用
  - `TabInfo` (Value Object): Unit 2から再利用
- **Application Layer**:
  - `CalendarEventService`: Unit 3から再利用、復元メタデータ記録用に拡張可能
  - `EventHandler`: Unit 1から継承、復元関連のDomain Eventsを処理
- **Infrastructure Layer**:
  - `ChromeTabsAdapter`: Unit 2から再利用、タブ作成機能を追加
  - `ChromeWindowsAdapter`: Unit 2から再利用、ウィンドウ作成機能を追加
  - `Logger`: Unit 1から再利用
  - `UIMessenger`: Unit 1から再利用、プログレス通知用に拡張可能

### 拡張が必要なコンポーネント
- **ChromeTabsAdapter**: `createTab()`, `createTabs()`メソッドの追加
- **ChromeWindowsAdapter**: `createWindow()`メソッドの追加
- **CalendarEventService**: `recordRestore()`メソッドの追加

## 技術スタック
- **言語**: TypeScript（既存と一貫性を保つ）
- **API**: 
  - Chrome Windows API (`chrome.windows.create`)
  - Chrome Tabs API (`chrome.tabs.create`)
- **アーキテクチャパターン**: 
  - レイヤードアーキテクチャ（既存と一貫性を保つ）
  - Adapter Pattern（既存パターンを拡張）
  - Service Layer Pattern（既存パターンを拡張）

## パフォーマンス要件
- **復元時間**: 10個のタブを5秒以内で復元（NFR-001）
- **大量タブ**: 20個以上のタブは段階的に読み込む（5個ずつ、100ms待機）
- **順序保証**: タブの順序が保持される必要がある

## エラーハンドリング要件
- **タブ復元エラー**: 無効なURL、ネットワークエラーなど
- **ウィンドウ作成エラー**: 権限エラー、リソース不足など
- **部分的な復元**: 成功したタブは開いたまま、失敗したタブのリストを表示

## リスク分析

### 技術的リスク
- **RISK-004**: 大量のタブ復元時のパフォーマンス問題
  - **軽減策**: 段階的なタブ読み込み、最大タブ数の制限（30個）
- **RISK-005**: タブの順序が保証されない
  - **軽減策**: 順番通りにタブを作成（並列処理を避ける）
- **RISK-006**: 無効なURLによる復元エラー
  - **軽減策**: エラーハンドリングを実装し、他のタブは開き続ける

### 統合リスク
- **Unit 3との統合**: 復元メタデータの記録が正しく動作するか
  - **軽減策**: Unit 3のCalendarEventServiceを拡張して`recordRestore()`メソッドを追加

## 成功基準
- [x] Logical Designが作成され、既存のアーキテクチャと一貫性がある
- [x] ADRsが作成され、重要なアーキテクチャ決定が文書化されている
- [x] トレードオフ分析が完了し、設計決定の根拠が明確である
- [x] パフォーマンス要件（10タブを5秒以内）を満たす設計になっている
- [x] エラーハンドリング戦略が明確に定義されている
- [x] Unit 3との統合ポイントが明確に定義されている

---

**作成日**: 2026-01-22  
**最終更新**: 2026-01-22  
**ステータス**: 設計完了

## 完了サマリー

すべてのステップが完了しました：

1. ✅ **ステップ1**: Unit定義とNFRsの読み込み
2. ✅ **ステップ2**: 現状分析（既存アーキテクチャのレビュー）
3. ✅ **ステップ3**: アーキテクチャパターンの選択
4. ✅ **ステップ4**: Logical Designの作成
5. ✅ **ステップ5**: ADRsの作成（ADR-013, ADR-014, ADR-015）
6. ✅ **ステップ6**: トレードオフの分析

**作成されたドキュメント**:
- `aidlc-docs/design-artifacts/logical-designs/unit-04-restore_logical_design.md`
- `aidlc-docs/design-artifacts/adrs/unit-04-restore_adr-013-chrome-windows-tabs-api-integration.md`
- `aidlc-docs/design-artifacts/adrs/unit-04-restore_adr-014-tab-restore-performance-optimization.md`
- `aidlc-docs/design-artifacts/adrs/unit-04-restore_adr-015-restore-metadata-recording.md`
- `ARCHITECTURE/unit-04-restore/trade-off-analysis.md`

**次のステップ**: Bolt 6のコード生成に進むことができます。
