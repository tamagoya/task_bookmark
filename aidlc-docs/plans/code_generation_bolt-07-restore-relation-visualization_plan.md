# Code Generation Plan: Bolt 7 - 復元メタデータと前後関係の可視化

## 概要
Bolt 7では、復元メタデータ（`restoredFrom`、`restoredTo`）の可視化UIを実装します。これにより、ユーザーは仕事の前後関係（どの仕事から復元されたか、どの仕事に続いたか）を視覚的に理解できるようになります。

## 実装範囲

### ドメイン層
- [ ] `RestoreRelation` Value Object（復元関係を表す）
- [ ] `RestoreChain` Value Object（復元チェーンを表す、オプション）

### アプリケーション層
- [ ] `RestoreRelationService`（前後関係取得サービス）
- [ ] `CalendarEventService`の拡張（必要に応じて）

### インフラストラクチャ層
- [ ] Service Workerのメッセージハンドラー拡張（`GET_RESTORE_RELATIONS`）

### プレゼンテーション層
- [ ] 一覧表示への前後関係インジケーター追加
- [ ] 詳細表示への前後関係セクション追加
- [ ] スタイルの追加

### テスト
- [ ] `RestoreRelation` Value Objectのテスト
- [ ] `RestoreRelationService`のテスト
- [ ] UIコンポーネントのテスト（可能な範囲）

## 実装ステップ

### ステップ1: Domain ModelとLogical Designの読み込み
- [x] `aidlc-docs/design-artifacts/domain-models/unit-03-calendar-api_domain_model.md` を確認
- [x] `aidlc-docs/design-artifacts/logical-designs/unit-05-ui-ux_logical_design.md` を確認
- [x] `aidlc-docs/design-artifacts/adrs/unit-05-ui-ux_adr-016-restore-relation-visualization.md` を確認
- [x] `aidlc-docs/design-artifacts/adrs/unit-05-ui-ux_adr-017-restore-chain-display.md` を確認
- [x] 実装要件を抽出

### ステップ2: コード構造の設計
- [ ] レイヤードアーキテクチャに基づいて構造を設計
- [ ] プロジェクト構造を定義

### ステップ3: ドメイン層の実装（TDD）
- [ ] `RestoreRelation` Value Objectのテストを先に記述（RED）
- [ ] `RestoreRelation` Value Objectを実装（GREEN）
- [ ] テストを実行して成功を確認
- [ ] リファクタリング（IMPROVE）

### ステップ4: アプリケーション層の実装（TDD）
- [ ] `RestoreRelationService`のテストを先に記述（RED）
- [ ] `RestoreRelationService`を実装（GREEN）
- [ ] テストを実行して成功を確認
- [ ] リファクタリング（IMPROVE）

### ステップ5: インフラストラクチャ層の実装
- [ ] Service Workerのメッセージハンドラー拡張（`GET_RESTORE_RELATIONS`）

### ステップ6: プレゼンテーション層の実装
- [ ] 一覧表示への前後関係インジケーター追加
- [ ] 詳細表示への前後関係セクション追加
- [ ] スタイルの追加

### ステップ7: ユニットテストの生成と実行（TDD）
- [ ] すべてのテストを実行
- [ ] テストカバレッジを確認（80%以上を目標）
- [ ] 不足しているテストケースを追加

### ステップ8: ビルドエラーの確認と修正
- [ ] TypeScriptのコンパイルエラーチェック
- [ ] ビルドの実行
- [ ] エラーがあれば修正

### ステップ9: コードレビュー
- [ ] コード品質の確認
- [ ] イミュータビリティの確認
- [ ] エラーハンドリングの確認
- [ ] 命名規則の確認

### ステップ10: セキュリティレビュー
- [ ] XSS対策の確認
- [ ] 入力検証の確認
- [ ] エラーメッセージの確認

### ステップ11: 結果の分析と修正提案
- [ ] テスト結果を分析
- [ ] コードレビュー結果を分析
- [ ] セキュリティレビュー結果を分析
- [ ] 修正提案を生成
- [ ] 結果を記録

## 実装詳細

### RestoreRelation Value Object

**ファイル**: `FRONTEND/src/domain/value-objects/restore-relation.ts`

**属性**:
- `eventId: string` - イベントID
- `title: string` - 仕事名
- `savedAt: string` - 保存日時（ISO 8601形式）
- `restoredAt?: string` - 復元日時（ISO 8601形式、復元先の場合のみ）

**メソッド**:
- `static create(data: RestoreRelationData): RestoreRelation`
- `equals(other: RestoreRelation): boolean`

### RestoreRelationService

**ファイル**: `FRONTEND/src/application/services/restore-relation-service.ts`

**主要メソッド**:
- `getRestoreRelations(eventId: EventId, calendarId: CalendarId, accessToken: AccessToken): Promise<RestoreRelations>`
  - 指定されたイベントIDの前後関係を取得
  - `restoredFrom`から復元元のWorkStateを取得
  - `restoredTo`から復元先のWorkStateリストを取得

**依存関係**:
- `CalendarEventRepository`（既存）
- `Logger`（既存）

### UI実装

**一覧表示の拡張**:
- `renderWorkStateList()`関数で前後関係インジケーターを表示
- `WorkStateMetadata.restoredFrom`または`restoredTo`が存在する場合、🔗アイコンを表示

**詳細表示の拡張**:
- `loadRestoreRelations(eventId: string)`関数で前後関係データを取得
- `renderRestoreRelations(relations: RestoreRelations)`関数で前後関係を表示

## テスト要件

### RestoreRelation Value Object
- [ ] 正常なデータでの作成
- [ ] バリデーション（必須フィールドのチェック）
- [ ] 等価性チェック
- [ ] 不変性の確認

### RestoreRelationService
- [ ] 復元元の取得（正常系）
- [ ] 復元先の取得（正常系）
- [ ] 復元元がない場合（最初の保存）
- [ ] 復元先がない場合
- [ ] 存在しないイベントIDの処理
- [ ] エラーハンドリング

### UIコンポーネント
- [ ] 前後関係インジケーターの表示
- [ ] 前後関係がない場合の表示
- [ ] 詳細表示の前後関係セクション

## 期待される成果物

- `FRONTEND/src/domain/value-objects/restore-relation.ts`
- `FRONTEND/src/application/services/restore-relation-service.ts`
- `FRONTEND/tests/domain/value-objects/restore-relation.test.ts`
- `FRONTEND/tests/application/services/restore-relation-service.test.ts`
- `FRONTEND/background/service-worker.ts`（拡張）
- `FRONTEND/sidepanel/sidepanel.ts`（拡張）
- `FRONTEND/sidepanel/sidepanel.html`（拡張）
- `FRONTEND/sidepanel/sidepanel.css`（拡張）

## 注意事項

- **TDDワークフロー**: テストを先に書く（RED-GREEN-REFACTOR）
- **テストカバレッジ**: 80%以上のカバレッジを達成
- **イミュータビリティ**: すべてのValue Objectは不変であること
- **エラーハンドリング**: 存在しないイベントIDの場合は適切に処理
- **パフォーマンス**: 遅延読み込みを活用してパフォーマンスを維持

## 実装完了

実装が完了しました。詳細は `code_generation_bolt-07-restore-relation-visualization_test_results.md` を参照してください。

---

**作成日**: 2026-01-22  
**ステータス**: 実装完了
