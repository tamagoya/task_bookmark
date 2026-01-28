# Bolt 2 実行計画: カレンダー初期化とAPI連携基盤

## Bolt 2の概要
- **スコープ**: カレンダーイベントの作成機能、Google Calendar APIとの連携強化
- **期間**: 1週間（5営業日）
- **成果物**: カレンダーイベント作成サービス、イベントデータモデル、基本的なイベント作成機能

## 前提条件
- ✅ Bolt 1完了（認証機能、カレンダー初期化機能は実装済み）
- ✅ Google Calendar API接続確認済み

## AI-DLCコマンド実行順序

### Phase 1: 設計とアーキテクチャ（1-2日目）

#### ステップ1: ドメインモデル定義（必須）
**コマンド**: `/aidlc-domain-model "Unit 3: Calendar API連携"`

**目的**: 
- カレンダーイベントのドメインモデル定義
- タスクブックマークデータの構造定義
- Domain-Driven Design原則に基づいた設計

**成果物**:
- `aidlc-docs/design-artifacts/domain-models/unit-03-calendar-api_domain_model.md`
- ドメインエンティティ、Value Objects、Aggregates、Domain Eventsの定義

**定義すべきドメイン概念**:
- **Aggregate Root**: `TaskBookmark`（将来の拡張用）
- **Entities**: `CalendarEvent`, `WorkState`
- **Value Objects**: `EventId`, `EventTitle`, `EventDescription`, `TabInfo`
- **Domain Events**: `TaskBookmarkCreated`, `TaskBookmarkSaved`
- **Repositories**: `CalendarEventRepository`（インターフェース）

**次のステップへの入力**:
- ドメインモデル設計書

---

#### ステップ2: アーキテクチャ設計（必須）
**コマンド**: `/aidlc-architecture "Unit 3: Calendar API連携"`

**目的**: 
- Domain ModelをLogical Designに変換
- Google Calendar APIとの連携アーキテクチャを設計
- イベント作成フローの設計
- NFRsを満たすためのアーキテクチャパターンを適用

**成果物**:
- `aidlc-docs/design-artifacts/logical-designs/unit-03-calendar-api_logical_design.md`
- ADR（Architecture Decision Records）
- コンポーネント間の依存関係

**次のステップへの入力**:
- アーキテクチャ設計書（Domain Modelを参照）

---

### Phase 2: 実装（3-4日目）

#### ステップ3: コード生成
**コマンド**: `/aidlc-code-generation "Unit 3: Calendar API連携"`

**目的**: 
- カレンダーイベント作成サービスの実装
- イベントデータモデルの実装
- Google Calendar APIとの連携強化

**成果物**:
- `FRONTEND/src/application/services/calendar-event-service.ts`
- `FRONTEND/src/domain/entities/calendar-event.ts`
- `FRONTEND/src/domain/value-objects/event-id.ts`
- `FRONTEND/src/domain/value-objects/event-title.ts`
- `FRONTEND/src/infrastructure/adapters/google-calendar-adapter.ts`（拡張）

**実装する機能**:
1. Calendar Event Service
   - `createEvent()`: カレンダーイベントを作成
   - `updateEvent()`: カレンダーイベントを更新
   - `deleteEvent()`: カレンダーイベントを削除

2. イベントデータモデル
   - タブ情報のJSON形式での保存
   - メタデータ（仕事名、メモ）の保存

3. Google Calendar Adapter拡張
   - イベント作成API呼び出し
   - イベント更新API呼び出し
   - イベント削除API呼び出し

**次のステップへの入力**:
- 実装されたコード

---

### Phase 3: テスト（5日目）

#### ステップ4: テスト実行とカバレッジ確認
**手動実行**: テストの実行とカバレッジ確認

**目的**: 
- ユニットテストの実行
- テストカバレッジ80%以上を達成
- 統合テストの実行（オプション）

**成果物**:
- テストスイート
- カバレッジレポート

**テスト対象**:
- カレンダーイベント作成の正常系・異常系
- エラーハンドリング
- Google Calendar APIのモックテスト

---

### Phase 4: 品質保証（必要に応じて）

#### ステップ5: コードレビュー
**手動実行**: コードレビュー

**目的**: 
- コード品質の確認
- コーディングスタイルの確認
- ベストプラクティスの遵守確認

**レビュー項目**:
- イミュータビリティの遵守
- エラーハンドリングの適切性
- コードの可読性
- 型安全性（TypeScript）

---

## 実行順序のサマリー

```
1. /aidlc-domain-model "Unit 3: Calendar API連携"     → ドメインモデル設計（必須）
2. /aidlc-architecture "Unit 3: Calendar API連携"   → アーキテクチャ設計（必須）
3. /aidlc-code-generation "Unit 3: Calendar API連携" → コード実装（必須）
4. テスト実行とカバレッジ確認                        → テスト（必須）
5. コードレビュー                                    → 品質保証（推奨）
```

## 注意事項

### 既存実装との統合
- Bolt 1で実装済みの`CalendarInitializationService`と統合
- Bolt 1で実装済みの`GoogleCalendarAdapter`を拡張

### 依存関係
- **Unit 1**: 認証機能、カレンダー初期化機能（既に実装済み）
- **Unit 2**: タブ情報取得（Bolt 3で実装予定、現時点ではモックデータを使用可能）

### リスク管理
- **RISK-001**: Google Calendar APIのレート制限
  - 軽減策: Bolt 1で実装済みのRetryHandlerを活用
  - 軽減策: エラーハンドリングの適切な実装

---

## 成功基準

Bolt 2が完了したとみなす条件：
- [ ] カレンダーイベントを作成できる
- [ ] イベントにタブ情報（JSON形式）を保存できる
- [ ] エラーハンドリングが適切に実装されている
- [ ] ユニットテストのカバレッジが80%以上
- [ ] コードレビューで指摘された問題が修正済み

---

**作成日**: 2026-01-21  
**最終更新**: 2026-01-21  
**ステータス**: 準備完了
