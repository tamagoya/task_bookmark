# Bolt 3 実行計画: タブ状態キャプチャ

## Bolt 3の概要
- **スコープ**: 現在のウィンドウのタブ情報取得、タブ情報の構造化、タブ一覧のUI表示
- **期間**: 1週間（5営業日）
- **成果物**: タブキャプチャサービス、タブデータモデル、タブ一覧UIコンポーネント

## 前提条件
- ✅ Bolt 1完了（認証機能は実装済み、ただしタブキャプチャは認証不要）
- ✅ Chrome拡張機能の基本構造が構築済み

## AI-DLCコマンド実行順序

### Phase 1: 設計とアーキテクチャ（1-2日目）

#### ステップ1: ドメインモデル定義（必須）
**コマンド**: `/aidlc-domain-model "Unit 2: タブ状態キャプチャ"`

**目的**: 
- タブ情報のドメインモデル定義
- TabInfo Value Objectの定義
- Domain-Driven Design原則に基づいた設計

**成果物**:
- `aidlc-docs/design-artifacts/domain-models/unit-02-tab-capture_domain_model.md`
- ドメインエンティティ、Value Objects、Domain Eventsの定義

**定義すべきドメイン概念**:
- **Value Objects**: `TabInfo`（URL、タイトル、ファビコン、インデックス）
- **Domain Events**: `TabsCaptured`（タブ情報取得完了時）
- **Services**: `TabCaptureService`（アプリケーション層）

**次のステップへの入力**:
- ドメインモデル設計書

---

#### ステップ2: アーキテクチャ設計（必須）
**コマンド**: `/aidlc-architecture "Unit 2: タブ状態キャプチャ"`

**目的**: 
- Domain ModelをLogical Designに変換
- Chrome Tabs APIとの連携アーキテクチャを設計
- タブ情報取得フローの設計
- UIコンポーネントの設計
- NFRsを満たすためのアーキテクチャパターンを適用

**成果物**:
- `aidlc-docs/design-artifacts/logical-designs/unit-02-tab-capture_logical_design.md`
- ADR（Architecture Decision Records）
- コンポーネント間の依存関係

**次のステップへの入力**:
- アーキテクチャ設計書（Domain Modelを参照）

---

### Phase 2: 実装（2-3日目）

#### ステップ3: コード生成
**コマンド**: `/aidlc-code-generation "Unit 2: タブ状態キャプチャ"`

**目的**: 
- タブキャプチャサービスの実装
- タブデータモデルの実装
- Chrome Tabs APIとの連携
- UIコンポーネントの実装

**成果物**:
- `FRONTEND/src/application/services/tab-capture-service.ts`
- `FRONTEND/src/domain/value-objects/tab-info.ts`（完全実装）
- `FRONTEND/src/infrastructure/adapters/chrome-tabs-adapter.ts`
- `FRONTEND/sidepanel/tab-list-component.ts`（UIコンポーネント）

**実装する機能**:
1. Tab Capture Service
   - `getCurrentWindowTabs()`: 現在のウィンドウのタブ情報を取得
   - `getTabInfo(tabId)`: 特定のタブの情報を取得
   - `getFaviconUrl(tabId)`: タブのファビコンURLを取得

2. Chrome Tabs Adapter
   - Chrome Tabs APIのラッパー
   - エラーハンドリング
   - パフォーマンス最適化（並列取得）

3. UIコンポーネント
   - タブ一覧の表示（タイトル、URL、ファビコン）
   - タブの順序表示
   - スクロール可能なリスト

**次のステップへの入力**:
- 実装されたコード

---

### Phase 3: テスト（4日目）

#### ステップ4: テスト実行とカバレッジ確認
**手動実行**: テストの実行とカバレッジ確認

**目的**: 
- ユニットテストの実行
- テストカバレッジ80%以上を達成
- パフォーマンステストの実行（20タブの取得が500ms以内）

**成果物**:
- テストスイート
- カバレッジレポート

**テスト対象**:
- タブ情報取得の正常系・異常系
- エラーハンドリング
- Chrome Tabs APIのモックテスト
- パフォーマンステスト（20タブの取得時間）

---

### Phase 4: 品質保証（5日目）

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
- パフォーマンス要件の達成

---

## 実行順序のサマリー

```
1. /aidlc-domain-model "Unit 2: タブ状態キャプチャ"     → ドメインモデル設計（必須）
2. /aidlc-architecture "Unit 2: タブ状態キャプチャ"   → アーキテクチャ設計（必須）
3. /aidlc-code-generation "Unit 2: タブ状態キャプチャ" → コード実装（必須）
4. テスト実行とカバレッジ確認                        → テスト（必須）
5. コードレビュー                                    → 品質保証（推奨）
```

## 注意事項

### 既存実装との統合
- Unit 3で使用する`TabInfo`型の完全実装
- Unit 5（UI/UX）の共通コンポーネントとの統合

### 依存関係
- **Unit 1**: 認証機能（オプション、タブキャプチャは認証不要）
- **Unit 3**: タブ情報を提供（保存時に使用）
- **Unit 5**: UIコンポーネント（サイドパネル）

### リスク管理
- **RISK-004**: 大量のタブ取得時のパフォーマンス問題
  - 軽減策: 並列取得の実装
  - 軽減策: パフォーマンステストの実施
  - 軽減策: 段階的な取得（必要に応じて）

---

## 成功基準

Bolt 3が完了したとみなす条件：
- [ ] 現在のウィンドウの全タブ情報を取得できる
- [ ] タブの順序が保持される
- [ ] ファビコンが適切に表示される
- [ ] サイドパネルにタブ一覧が表示される
- [ ] 20タブの取得が500ms以内で完了する
- [ ] ユニットテストのカバレッジが80%以上
- [ ] コードレビューで指摘された問題が修正済み

---

**作成日**: 2026-01-21  
**最終更新**: 2026-01-21  
**ステータス**: 準備完了
