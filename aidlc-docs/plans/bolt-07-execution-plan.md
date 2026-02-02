# Bolt 7: 復元メタデータと前後関係の可視化 - 実行計画

## 概要

Bolt 7では、復元メタデータ（`restoredFrom`、`restoredTo`）の可視化UIを実装します。これにより、ユーザーは仕事の前後関係（どの仕事から復元されたか、どの仕事に続いたか）を視覚的に理解できるようになります。

## スコープ

- 復元メタデータの取得と表示
- 前後関係の可視化UIコンポーネント
- 復元チェーンの表示
- 詳細表示画面の拡張

## 含まれるUser Stories

- **US-5**: 仕事状態の復元（メタデータ部分の可視化）
- **US-7**: 仕事の前後関係の可視化

## 成果物

- 前後関係可視化UIコンポーネント（`RestoreRelationView`）
- 詳細表示画面の拡張（`WorkStateDetailView`）
- メタデータ取得サービス（既存の`CalendarEventService`を拡張）

## 推定期間

**1週間（5営業日）**

---

## ステップ1: 既存設計の確認

### 目的
Bolt 7の実装に必要な既存の設計ドキュメントを確認し、実装方針を決定します。

### 確認項目
- [ ] Unit 4の設計（復元メタデータの記録方法）
- [ ] Unit 5の設計（UI/UX要件）
- [ ] ADR-015（復元メタデータの記録戦略）
- [ ] `WorkStateMetadata`の`restoredFrom`と`restoredTo`フィールドの構造
- [ ] 既存のUI実装（`sidepanel.ts`）の構造

### 確認すべきドキュメント
- `aidlc-docs/design-artifacts/units/unit-04-restore.md`
- `aidlc-docs/design-artifacts/units/unit-05-ui-ux.md`
- `aidlc-docs/design-artifacts/adrs/unit-04-restore_adr-015-restore-metadata-recording.md`
- `aidlc-docs/design-artifacts/domain-models/unit-03-calendar-api_domain_model.md`
- `FRONTEND/src/domain/value-objects/work-state-metadata.ts`

### 期待される成果物
- 実装方針の決定
- UIデザインの概要

### 所要時間
**0.5日**

---

## ステップ2: 前後関係取得ロジックの実装

### 目的
復元メタデータ（`restoredFrom`、`restoredTo`）を取得し、前後関係を構築するロジックを実装します。

### 実装内容

#### 2.1 前後関係取得サービスの作成
- **ファイル**: `FRONTEND/src/application/services/restore-relation-service.ts`
- **責任**: 
  - 指定されたイベントIDから復元元（`restoredFrom`）を取得
  - 指定されたイベントIDから復元先（`restoredTo`）のリストを取得
  - 復元チェーン（連鎖した復元関係）を構築

#### 2.2 型定義の追加
- **ファイル**: `FRONTEND/src/domain/value-objects/restore-relation.ts`（新規）
- **内容**:
  - `RestoreRelation` Value Object（復元関係を表す）
  - `RestoreChain` Value Object（復元チェーンを表す）

#### 2.3 CalendarEventServiceの拡張
- **ファイル**: `FRONTEND/src/application/services/calendar-event-service.ts`
- **追加メソッド**:
  - `getRestoreRelations(eventId: EventId, calendarId: CalendarId, accessToken: AccessToken): Promise<RestoreRelations>`
    - 復元元と復元先の情報を取得

### 期待される成果物
- `RestoreRelationService`の実装
- `RestoreRelation` Value Objectの実装
- `CalendarEventService`の拡張

### テスト要件
- 復元元の取得テスト
- 復元先の取得テスト
- 復元チェーンの構築テスト
- エラーハンドリングテスト（存在しないイベントIDなど）

### 所要時間
**1日**

---

## ステップ3: 前後関係可視化UIコンポーネントの実装

### 目的
前後関係を視覚的に表示するUIコンポーネントを実装します。

### 実装内容

#### 3.1 詳細表示画面の拡張
- **ファイル**: `FRONTEND/sidepanel/sidepanel.html`
- **追加要素**:
  - 前後関係セクション（`restore-relations-section`）
  - 復元元表示（`restored-from-section`）
  - 復元先表示（`restored-to-section`）

#### 3.2 UIロジックの実装
- **ファイル**: `FRONTEND/sidepanel/sidepanel.ts`
- **追加関数**:
  - `loadRestoreRelations(eventId: string): Promise<void>`
    - 前後関係データを取得
  - `renderRestoreRelations(relations: RestoreRelations): void`
    - 前後関係を表示
  - `renderRestoreChain(chain: RestoreChain): void`
    - 復元チェーンを表示（オプション）

#### 3.3 スタイルの追加
- **ファイル**: `FRONTEND/sidepanel/sidepanel.css`
- **追加スタイル**:
  - `.restore-relations-section`
  - `.restored-from-item`
  - `.restored-to-item`
  - `.restore-chain`（オプション）

### UIデザイン案

#### 基本表示
```
┌─────────────────────────────────┐
│ 仕事名: プロジェクトAの調査      │
│ 保存日時: 2026-01-22 10:00      │
│ タブ数: 5                        │
│                                  │
│ 【前後関係】                     │
│                                  │
│ ← 復元元: プロジェクトBの調査     │
│    (2026-01-21 15:00)            │
│                                  │
│ → 復元先:                        │
│    - プロジェクトAの続き          │
│      (2026-01-22 14:00)          │
│    - プロジェクトAの再開          │
│      (2026-01-23 09:00)          │
└─────────────────────────────────┘
```

#### 復元チェーン表示（オプション）
```
プロジェクトB → プロジェクトA → プロジェクトAの続き → プロジェクトAの再開
```

### 期待される成果物
- 前後関係表示UIの実装
- スタイルの追加

### テスト要件
- UIコンポーネントの表示テスト
- 前後関係がない場合の表示テスト
- 復元先が複数ある場合の表示テスト

### 所要時間
**1.5日**

---

## ステップ4: 一覧表示への前後関係インジケーター追加

### 目的
保存済み仕事一覧に、前後関係があることを示すインジケーターを追加します。

### 実装内容

#### 4.1 一覧表示の拡張
- **ファイル**: `FRONTEND/sidepanel/sidepanel.ts`
- **変更内容**:
  - `WorkStateListItem`インターフェースに`hasRestoreRelations`フィールドを追加
  - `renderWorkStateList()`関数で前後関係インジケーターを表示

#### 4.2 インジケーターのデザイン
- **ファイル**: `FRONTEND/sidepanel/sidepanel.css`
- **追加スタイル**:
  - `.restore-relation-indicator`（アイコンまたはバッジ）

### UIデザイン案
```
┌─────────────────────────────────┐
│ プロジェクトAの調査        [🔗]  │ ← 前後関係があることを示すアイコン
│ 5タブ | 2026-01-22 10:00        │
│ [復元]                          │
└─────────────────────────────────┘
```

### 期待される成果物
- 一覧表示への前後関係インジケーター追加

### 所要時間
**0.5日**

---

## ステップ5: メッセージハンドラーの拡張

### 目的
Service Workerに前後関係取得のメッセージハンドラーを追加します。

### 実装内容

#### 5.1 Service Workerの拡張
- **ファイル**: `FRONTEND/background/service-worker.ts`
- **追加メッセージハンドラー**:
  - `GET_RESTORE_RELATIONS`: 前後関係データの取得

#### 5.2 メッセージ型の定義
- **ファイル**: `FRONTEND/src/infrastructure/adapters/ui-messenger.ts`（必要に応じて）
- **追加メッセージ型**:
  - `RESTORE_RELATIONS_RESPONSE`

### 期待される成果物
- Service Workerのメッセージハンドラー拡張

### 所要時間
**0.5日**

---

## ステップ6: テスト実装

### 目的
実装した機能に対するユニットテストと統合テストを実装します。

### テスト内容

#### 6.1 RestoreRelationServiceのテスト
- **ファイル**: `FRONTEND/tests/application/services/restore-relation-service.test.ts`
- **テストケース**:
  - 復元元の取得
  - 復元先の取得
  - 復元チェーンの構築
  - エラーハンドリング

#### 6.2 RestoreRelation Value Objectのテスト
- **ファイル**: `FRONTEND/tests/domain/value-objects/restore-relation.test.ts`
- **テストケース**:
  - Value Objectの作成
  - バリデーション
  - 等価性チェック

#### 6.3 CalendarEventServiceの拡張メソッドのテスト
- **ファイル**: `FRONTEND/tests/application/services/calendar-event-service.test.ts`
- **追加テストケース**:
  - `getRestoreRelations()`のテスト

### 期待される成果物
- ユニットテストの実装
- テストカバレッジ80%以上

### 所要時間
**1日**

---

## ステップ7: ビルドとエラーチェック

### 目的
実装したコードをビルドし、エラーがないことを確認します。

### 実行内容
1. TypeScriptのコンパイルエラーチェック
2. ビルドの実行
3. リンターエラーの確認

### 期待される成果物
- エラーのないビルド

### 所要時間
**0.5日**

---

## ステップ8: コードレビューとセキュリティレビュー

### 目的
実装したコードの品質とセキュリティを確認します。

### レビュー項目

#### コードレビュー
- [ ] イミュータビリティの維持
- [ ] エラーハンドリングの適切性
- [ ] コードの可読性
- [ ] 命名規則の遵守
- [ ] コメントの適切性

#### セキュリティレビュー
- [ ] XSS対策（ユーザー入力のサニタイズ）
- [ ] データの検証
- [ ] エラーメッセージに機密情報が含まれていない

### 期待される成果物
- コードレビューレポート
- セキュリティレビューレポート

### 所要時間
**0.5日**

---

## ステップ9: Chromeでの動作確認

### 目的
実装した機能をChromeで実際に動作確認します。

### 確認項目
- [ ] 前後関係が正しく表示される
- [ ] 復元元がない場合（最初の保存）の表示
- [ ] 復元先がない場合の表示
- [ ] 復元先が複数ある場合の表示
- [ ] 一覧表示の前後関係インジケーター
- [ ] 詳細表示の前後関係セクション
- [ ] エラーハンドリング（存在しないイベントIDなど）

### 期待される成果物
- 動作確認レポート
- `VERIFICATION_GUIDE.md`の更新

### 所要時間
**1日**

---

## 実行順序のサマリー

```
1. 既存設計の確認                           → 準備（0.5日）
2. 前後関係取得ロジックの実装                → 実装（1日）
3. 前後関係可視化UIコンポーネントの実装      → UI実装（1.5日）
4. 一覧表示への前後関係インジケーター追加    → UI拡張（0.5日）
5. メッセージハンドラーの拡張                → 統合（0.5日）
6. テスト実装                                → テスト（1日）
7. ビルドとエラーチェック                    → 検証（0.5日）
8. コードレビューとセキュリティレビュー      → レビュー（0.5日）
9. Chromeでの動作確認                        → 統合（1日）
```

**合計**: 約7営業日（推定期間1週間の範囲内）

---

## 受け入れ基準

- [x] 復元時にメタデータが記録される（Bolt 6で実装済み）
- [x] 前後関係が可視化される
- [ ] 復元チェーンが表示される（オプション、将来実装予定）
- [x] 一覧表示に前後関係インジケーターが表示される
- [ ] 詳細表示に前後関係セクションが表示される（詳細表示画面は未実装のため将来実装予定）
- [x] ユニットテストのカバレッジが80%以上（89.31%達成）
- [x] Chromeでの動作確認が完了している

**実装完了日**: 2026-01-22  
**動作確認完了日**: 2026-01-22

**修正内容**:
- ツールチップ表示の問題を修正（CSSでカスタムツールチップを実装）
- 復元後に保存する際に`restoredFrom`が自動的に設定されるように修正

---

## リスクと軽減策

### リスク1: パフォーマンス問題
- **説明**: 前後関係を取得する際に、複数のカレンダーイベントを取得する必要がある
- **軽減策**: 
  - キャッシュの活用
  - 必要に応じて遅延読み込み

### リスク2: UIの複雑化
- **説明**: 前後関係の表示により、UIが複雑になる可能性
- **軽減策**: 
  - シンプルなデザインを採用
  - 詳細表示はオプションとして実装

### リスク3: データの不整合
- **説明**: カレンダーイベントが削除された場合、前後関係が不整合になる
- **軽減策**: 
  - エラーハンドリングの実装
  - 存在しないイベントIDの場合は「削除済み」と表示

---

## 依存関係

- **Bolt 6**: 復元メタデータの記録機能（完了済み）
- **Unit 3**: Calendar API連携（完了済み）
- **Unit 4**: 状態復元機能（完了済み）
- **Unit 5**: UI/UX実装（部分完了）

---

## 技術的注記

### 前後関係のデータ構造
```typescript
interface RestoreRelations {
  restoredFrom: {
    eventId: string;
    title: string;
    savedAt: string;
  } | null;
  restoredTo: Array<{
    eventId: string;
    title: string;
    restoredAt: string; // ISO 8601形式
  }>;
}
```

### 復元チェーンの構築
- 復元チェーンは、`restoredFrom`を辿って構築
- 最大深度を制限（例: 10レベル）して無限ループを防止

---

**作成日**: 2026-01-22  
**最終更新**: 2026-01-22  
**ステータス**: 実装完了・動作確認完了
