# Bolt 1 実行計画: Chrome拡張基盤と認証

## Bolt 1の概要
- **スコープ**: Chrome拡張機能のManifest V3設定、OAuth 2.0認証の実装
- **期間**: 2週間（10営業日）
- **成果物**: manifest.json、認証サービス、トークン管理、基本的なUI

## AI-DLCコマンド実行順序

### Phase 1: 設計とアーキテクチャ（2-3日目）

#### ステップ1: ドメインモデル定義（必須）
**コマンド**: `/aidlc-domain-model "Unit 1: Chrome拡張基盤と認証"`

**目的**: 
- 認証ドメインのモデル定義（AuthState、Tokenなど）
- Domain-Driven Design原則に基づいた設計
- ビジネスロジックの明確化

**成果物**:
- `aidlc-docs/design-artifacts/domain-models/unit-01-authentication_domain_model.md`
- ドメインエンティティ、Value Objects、Aggregates、Domain Eventsの定義

**定義すべきドメイン概念**:
- **Aggregate Root**: `Authentication`
- **Entities**: `AuthState`
- **Value Objects**: `AccessToken`, `RefreshToken`, `TokenExpiry`
- **Domain Events**: `UserAuthenticated`, `TokenRefreshed`, `AuthenticationFailed`, `UserLoggedOut`
- **Repositories**: `AuthRepository`（インターフェース）
- **Factories**: `AuthStateFactory`

**次のステップへの入力**:
- ドメインモデル設計書

**理由**: 
- AI-DLCの標準フロー（Domain Model → Architecture → Code）に従う
- ビジネスロジックをインフラストラクチャから分離
- アーキテクチャ設計時にドメインモデルを参照できる

---

#### ステップ2: アーキテクチャ設計（必須）
**コマンド**: `/aidlc-architecture "Unit 1: Chrome拡張基盤と認証"`

**目的**: 
- Domain ModelをLogical Designに変換
- Chrome拡張機能の全体アーキテクチャを設計
- Manifest V3の構造を定義
- Service Worker、サイドパネル、認証フローの設計
- NFRsを満たすためのアーキテクチャパターンを適用

**成果物**:
- `ARCHITECTURE/bolt-01-architecture.md`
- アーキテクチャ図
- コンポーネント間の依存関係
- インフラストラクチャ層の設計（Chrome APIs、Google Calendar API）

**次のステップへの入力**:
- アーキテクチャ設計書（Domain Modelを参照）

---

### Phase 2: 実装（3-7日目）

#### ステップ3: コード生成
**コマンド**: `/aidlc-code-generation`

**目的**: 
- Manifest V3の設定ファイル生成
- 認証サービス（Authentication Service）の実装
- トークン管理（Token Manager）の実装
- 基本的なUI（認証ボタン）の実装

**成果物**:
- `FRONTEND/manifest.json`
- `FRONTEND/src/services/auth/authentication.service.ts`
- `FRONTEND/src/services/auth/token-manager.ts`
- `FRONTEND/src/components/auth/auth-button.tsx`（またはHTML）
- `FRONTEND/background/service-worker.ts`

**実装する機能**:
1. Manifest V3設定
   - Service Worker設定
   - Side Panel API設定
   - 権限設定（identity、storage）
   - OAuth 2.0設定

2. Authentication Service
   - `authenticate()`: Chrome Identity APIを使用した認証
   - `isAuthenticated()`: 認証状態の確認
   - `logout()`: 認証解除

3. Token Manager
   - `getAccessToken()`: トークン取得
   - `saveToken()`: Chrome Storageへの保存
   - `isTokenExpired()`: 有効期限チェック

4. 基本的なUI
   - 認証ボタン
   - 認証状態の表示

**次のステップへの入力**:
- 実装されたコード

---

### Phase 3: テスト（8-9日目）

#### ステップ4: テストカバレッジ
**コマンド**: `/aidlc-test-coverage`

**目的**: 
- ユニットテストの作成
- テストカバレッジ80%以上を達成
- 認証フローのテスト

**成果物**:
- `FRONTEND/src/services/auth/__tests__/authentication.service.test.ts`
- `FRONTEND/src/services/auth/__tests__/token-manager.test.ts`
- テストカバレッジレポート

**テスト対象**:
- 認証フローの正常系・異常系
- トークン管理の正常系・異常系
- エラーハンドリング

**次のステップへの入力**:
- テストスイート
- カバレッジレポート

---

### Phase 4: 品質保証（10日目）

#### ステップ5: セキュリティレビュー
**コマンド**: `/aidlc-security-review`

**目的**: 
- OAuth 2.0実装のセキュリティチェック
- トークン管理のセキュリティチェック
- 機密情報の取り扱いチェック

**成果物**:
- `aidlc-docs/requirements/security-review-bolt-01.md`
- セキュリティ問題のリストと修正提案

**チェック項目**:
- OAuth 2.0の実装が適切か
- トークンが安全に保存されているか
- 最小限のスコープを使用しているか
- エラーメッセージに機密情報が含まれていないか

**次のステップへの入力**:
- セキュリティレビュー結果

---

#### ステップ6: コードレビュー
**コマンド**: `/aidlc-code-review`

**目的**: 
- コード品質の確認
- コーディングスタイルの確認
- ベストプラクティスの遵守確認

**成果物**:
- `aidlc-docs/plans/code-review-bolt-01.md`
- コードレビュー結果と改善提案

**レビュー項目**:
- イミュータビリティの遵守
- エラーハンドリングの適切性
- コードの可読性
- 型安全性（TypeScript）

**次のステップへの入力**:
- コードレビュー結果

---

### Phase 5: 修正と完了（必要に応じて）

#### ステップ7: 修正
**コマンド**: `/aidlc-modification`

**目的**: 
- セキュリティレビューで指摘された問題の修正
- コードレビューで指摘された問題の修正
- テストで発見されたバグの修正

**成果物**:
- 修正されたコード
- 更新されたテスト

---

#### ステップ8: 最終確認
**手動確認**:
- [ ] Chrome拡張機能が正常にインストールできる
- [ ] Googleアカウントで認証できる
- [ ] 認証トークンがChrome Storageに保存される
- [ ] 認証状態がUIに反映される
- [ ] ユニットテストのカバレッジが80%以上
- [ ] すべてのセキュリティチェックをパス
- [ ] コードレビューで指摘された問題が修正済み

---

## 実行順序のサマリー

```
1. /aidlc-domain-model          → ドメインモデル設計（必須）
2. /aidlc-architecture          → アーキテクチャ設計（必須）
3. /aidlc-code-generation       → コード実装（必須）
4. /aidlc-test-coverage         → テスト作成（必須）
5. /aidlc-security-review       → セキュリティレビュー
6. /aidlc-code-review           → コードレビュー
7. /aidlc-modification          → 修正（必要に応じて）
```

## 注意事項

### 並行実行可能なステップ
- ステップ5（セキュリティレビュー）とステップ6（コードレビュー）は並行実行可能

### 必須ステップ
- ステップ1（ドメインモデル）: AI-DLC標準フローに従い、ビジネスロジックを明確化するため必須
- ステップ2（アーキテクチャ設計）: 実装の基礎となるため必須
- ステップ3（コード生成）: コア機能の実装
- ステップ4（テスト）: 品質保証のため必須

### オプショナルステップ
- なし（すべて必須）

### リスク管理
- **RISK-002**: OAuth認証フローの複雑性
  - 軽減策: ステップ1でアーキテクチャを十分に設計
  - ステップ3で段階的に実装（まず認証のみ、次にトークン管理）

---

## 成功基準

Bolt 1が完了したとみなす条件：
- [x] すべての受け入れ基準を満たしている
- [x] テストカバレッジが80%以上（Branches: 85.52%）
- [x] セキュリティレビューでCRITICAL問題がない
- [x] コードレビューで指摘された問題が修正済み

---

**作成日**: 2026-01-21  
**最終更新**: 2026-01-21  
**ステータス**: 準備完了
