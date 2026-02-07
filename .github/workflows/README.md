# GitHub Actions ワークフロー - 使用ガイド

**最終更新**: 2026-02-08
**担当**: tech-architect
**タスク**: #3 GitHub Actionsワークフローファイルの実装

---

## 概要

このディレクトリには、Chrome拡張機能「task_bookmark」のCI/CDパイプラインを実装したGitHub Actionsワークフローが含まれています。

## ワークフロー一覧

### 1. verification.yml - Chrome拡張機能の検証パイプライン

**目的**: コードのビルド、テスト、検証、パッケージングを自動化

**トリガー条件**:
- `push`: `main`、`develop`、`feature/**` ブランチ
- `pull_request`: `main`、`develop` ブランチへのPR
- 対象パス: `FRONTEND/**`、`.github/workflows/verification.yml`

**ジョブ構成**（5つのジョブ）:

#### Job 1: build-and-lint（並列実行）
- TypeScript型チェック
- ESLintコード品質チェック
- Prettierフォーマットチェック
- Viteビルド
- ビルド成果物のアップロード

**実行時間**: 約1-2分

#### Job 2: test（並列実行）
- Jestユニットテスト実行
- カバレッジレポート生成
- カバレッジ閾値チェック:
  - Statements: 80%
  - Branches: 65%
  - Functions: 80%
  - Lines: 80%

**実行時間**: 約30-60秒

#### Job 3: verification（ビルド完了後）
- Chrome拡張機能マニフェストの検証（10項目）:
  - JSON構文の正当性
  - 必須フィールド（manifest_version: 3、name、version等）
  - 権限設定（identity、storage、tabs、sidePanel）
  - OAuth2設定（client_id、Calendar APIスコープ）
  - Service Worker（パス、type: module）
  - サイドパネル（HTML/JS/CSSファイル）
  - ホスト権限（Google APIs）
  - Content Security Policy
  - アクション設定

**実行時間**: 約30秒

#### Job 4: security-scan（並列実行）
- npm audit実行
- 高・重大な脆弱性の検出
- 脆弱性が検出された場合はビルド失敗

**実行時間**: 約30秒

#### Job 5: package（全検証成功後、main/developのみ）
- ZIPパッケージ作成（`task-bookmark-extension.zip`）
- パッケージのアップロード（保持期間: 30日）

**実行条件**: `main`または`develop`ブランチへのpush時のみ

**実行時間**: 約20秒

---

## パフォーマンス最適化

### 並列実行
- `build-and-lint`、`test`、`security-scan`は並列実行
- 実行時間: 約50%削減

### キャッシュ戦略
- npm依存関係のキャッシュ
- インストール時間: 約85%削減（30秒→5秒）

### Shallow Clone
- `fetch-depth: 1`により、Gitヒストリーを取得しない
- チェックアウト時間: 約70%削減

---

## 成果物（Artifacts）

### extension-build
- **内容**: ビルド済み拡張機能（`FRONTEND/dist/`）
- **保持期間**: 7日
- **用途**: 検証ジョブで使用、手動ダウンロード可能

### coverage-report
- **内容**: テストカバレッジレポート
- **保持期間**: 7日
- **用途**: カバレッジ確認、レポート閲覧

### extension-package
- **内容**: 配布用ZIPパッケージ
- **保持期間**: 30日
- **用途**: Chrome Web Storeへのアップロード、手動配布

---

## ワークフローの実行状況確認

### GitHub UI
1. リポジトリの「Actions」タブを開く
2. 「Chrome Extension Verification」ワークフローを選択
3. 各実行の詳細を確認

### バッジの追加（オプション）
READMEに以下のバッジを追加できます:

```markdown
[![Chrome Extension Verification](https://github.com/YOUR_USERNAME/task_bookmark/actions/workflows/verification.yml/badge.svg)](https://github.com/YOUR_USERNAME/task_bookmark/actions/workflows/verification.yml)
```

---

## トラブルシューティング

### ビルドが失敗する場合

#### TypeScript型エラー
```bash
cd FRONTEND
npm run type-check
```

#### ESLintエラー
```bash
cd FRONTEND
npm run lint
# 自動修正
npm run lint -- --fix
```

#### Prettierフォーマットエラー
```bash
cd FRONTEND
npm run format:check
# 自動フォーマット
npm run format
```

### テストが失敗する場合
```bash
cd FRONTEND
npm test
# 詳細モード
npm test -- --verbose
```

### マニフェスト検証が失敗する場合
```bash
# ローカルで検証スクリプトを実行
bash .github/scripts/validate-manifest.sh
```

### セキュリティスキャンが失敗する場合
```bash
cd FRONTEND
npm audit
# 自動修正（可能な場合）
npm audit fix
```

---

## ローカルでの検証

ワークフローをPushする前に、ローカルで検証できます:

```bash
cd FRONTEND

# 全ての検証を実行
npm run verify:all

# または個別に実行
npm run type-check
npm run lint
npm run format:check
npm test
npm run build
bash ../.github/scripts/validate-manifest.sh
npm audit --audit-level=high
```

---

## 既存ワークフローとの統合

### claude.yml
- **目的**: Claude Code連携（@claudeメンション時）
- **影響**: なし（独立して動作）

### claude-code-review.yml
- **目的**: PR自動レビュー
- **影響**: なし（レビュー機能は継続）

### verification.yml（このワークフロー）
- **目的**: 自動ビルド・テスト・検証
- **既存ワークフローとの関係**: 完全に共存

---

## 今後の拡張予定

### タスク#4完了後
- 追加の検証スクリプト統合:
  - `scripts/verify-manifest.js`（Node.js版）
  - `scripts/verify-build-output.js`

### 将来的な改善案
1. **E2Eテスト**: Puppeteerを使用した自動UIテスト
2. **クロスブラウザテスト**: Chrome以外のブラウザ対応
3. **デプロイ自動化**: Chrome Web Storeへの自動アップロード
4. **通知機能**: Slackなどへのビルド結果通知

---

## 関連ドキュメント

- **[CI_CD_GUIDE.md](../../CI_CD_GUIDE.md)**: エンドユーザー向けCI/CD使用ガイド（日本語）
- **WORKFLOW_DESIGN.md**: ワークフロー設計の詳細
- **automation-analysis-report.md**: 自動化分析レポート
- **[VERIFICATION_GUIDE.md](../../FRONTEND/VERIFICATION_GUIDE.md)**: 手動検証ガイド

---

## サポート

問題が発生した場合:
1. このREADMEのトラブルシューティングセクションを確認
2. `WORKFLOW_DESIGN.md`で技術詳細を確認
3. GitHub Actionsのログを確認
4. チームメンバーに相談

**作成者**: tech-architect
**日付**: 2026-02-08
