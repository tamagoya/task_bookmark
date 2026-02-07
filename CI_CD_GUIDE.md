# CI/CD ガイド - task_bookmark Chrome拡張機能

**最終更新**: 2026-02-08
**対象読者**: 開発者、レビュアー

---

## 📋 目次

1. [概要](#概要)
2. [CI/CDパイプラインの構成](#cicdパイプラインの構成)
3. [自動実行されるチェック](#自動実行されるチェック)
4. [GitHub Actionsの使い方](#github-actionsの使い方)
5. [トラブルシューティング](#トラブルシューティング)
6. [ベストプラクティス](#ベストプラクティス)
7. [参考資料](#参考資料)

---

## 概要

task_bookmarkプロジェクトでは、GitHub Actionsを使用してCI/CD（継続的インテグレーション/継続的デリバリー）パイプラインを構築しています。

### CI/CDの目的

- **品質保証**: コードの品質を自動的にチェック
- **早期発見**: バグや問題を早期に発見
- **効率化**: 手動テストの時間を削減
- **一貫性**: すべてのプルリクエストで同じチェックを実行

### 自動化の範囲

| カテゴリ | 自動化 | 手動確認 |
|---------|-------|---------|
| ビルド・テスト | ✅ 完全自動 | ❌ 不要 |
| コード品質 | ✅ 完全自動 | ❌ 不要 |
| UI・機能テスト | ❌ 手動 | ✅ 必要 |
| OAuth2認証 | ❌ 手動 | ✅ 必要 |

---

## CI/CDパイプラインの構成

### ワークフローファイル

CI/CDパイプラインは、以下のGitHub Actionsワークフローファイルで定義されています：

```
.github/
└── workflows/
    ├── ci.yml                      # メインのCI/CDパイプライン
    ├── claude.yml                  # Claude統合（@claudeメンション対応）
    └── claude-code-review.yml      # Claudeコードレビュー（PR時）
```

### パイプラインのフロー

```
┌─────────────────────────────────────────────────────────────┐
│                  GitHub Actions CI/CD Pipeline              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 1: チェックアウト                                        │
│ - ソースコードを取得                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Node.js セットアップ                                 │
│ - Node.js 23.x をインストール                                 │
│ - npmキャッシュを有効化                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: 依存関係のインストール                                │
│ - npm ci を実行                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: ビルド                                                │
│ - npm run build を実行                                        │
│ - dist/ ディレクトリに成果物を生成                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: 型チェック                                            │
│ - npm run type-check を実行                                   │
│ - TypeScriptの型エラーをチェック                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 6: ユニットテスト                                        │
│ - npm test を実行                                             │
│ - npm run test:coverage でカバレッジ計測                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 7: Lint                                                 │
│ - npm run lint を実行                                         │
│ - ESLintでコード品質をチェック                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 8: パッケージング                                        │
│ - npm run package を実行                                      │
│ - ZIPファイルを生成                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 9: 成果物のアップロード                                  │
│ - ZIPファイルをGitHub Artifactsに保存                         │
│ - 30日間保持                                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 10: 最終サマリー                                         │
│ - Job Summaryを生成                                           │
│ - 実行結果を日本語で表示                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 自動実行されるチェック

### 1. ビルド（Build）

**目的**: TypeScriptのコンパイルとViteビルドが成功することを確認

**実行コマンド**:
```bash
npm run build
```

**確認内容**:
- ✅ TypeScriptがJavaScriptにコンパイルされる
- ✅ Viteがファイルをバンドルする
- ✅ `dist/`ディレクトリに成果物が生成される

**生成されるファイル**:
```
dist/
├── manifest.json
├── background/
│   └── service-worker.js
└── sidepanel/
    ├── sidepanel.html
    ├── sidepanel.css
    └── sidepanel.js
```

**失敗する場合**:
- 構文エラーがある
- インポートパスが間違っている
- 依存関係が不足している

### 2. 型チェック（Type Check）

**目的**: TypeScriptの型エラーがないことを確認

**実行コマンド**:
```bash
npm run type-check
```

**確認内容**:
- ✅ 型の不一致がない
- ✅ 未定義の変数がない
- ✅ nullチェックが適切

**失敗する場合**:
- 型が一致していない（例: `string`型に`number`を代入）
- オプショナルプロパティをnullチェックせずに使用
- 存在しないプロパティにアクセス

### 3. ユニットテスト（Unit Tests）

**目的**: すべてのユニットテストが成功することを確認

**実行コマンド**:
```bash
npm test
npm run test:coverage
```

**確認内容**:
- ✅ すべてのテストケースが成功する
- ✅ テストカバレッジが閾値を満たす
  - Statements: 80%以上
  - Branches: 65%以上
  - Functions: 80%以上
  - Lines: 80%以上

**テスト対象**:
- ドメイン層のビジネスロジック
- アプリケーション層のサービス
- インフラストラクチャ層のアダプター
- エラーハンドリング
- エッジケース

**失敗する場合**:
- テストケースの期待値と実際の値が異なる
- モックが正しく設定されていない
- 非同期処理の待機が不足
- カバレッジが閾値を下回る

### 4. Lint（静的解析）

**目的**: コード品質とスタイルの一貫性を確認

**実行コマンド**:
```bash
npm run lint
```

**確認内容**:
- ✅ ESLintルールに違反していない
- ✅ 未使用の変数がない
- ✅ `console.log`が残っていない（本番コード）
- ✅ `any`型の使用が最小限

**失敗する場合**:
- ESLintルールに違反している
- 未使用の変数やインポートがある
- 禁止されている構文を使用している

### 5. パッケージング（Packaging）

**目的**: 配布用ZIPファイルが正常に生成されることを確認

**実行コマンド**:
```bash
npm run package
```

**確認内容**:
- ✅ ZIPファイルが生成される
- ✅ 必要なファイルがすべて含まれる
- ✅ ファイルサイズが適切

**生成されるファイル**:
```
task-bookmark-extension.zip
```

**失敗する場合**:
- ビルド成果物が不足している
- ZIPコマンドがインストールされていない
- ディスク容量が不足している

---

## GitHub Actionsの使い方

### プルリクエストでの確認

#### 1. プルリクエストを作成

```bash
# ブランチを作成
git checkout -b feature/new-feature

# 変更をコミット
git add .
git commit -m "Add new feature"

# プッシュ
git push origin feature/new-feature
```

#### 2. GitHub上でプルリクエストを作成

- GitHubリポジトリページで「Pull requests」タブを開く
- 「New pull request」をクリック
- ブランチを選択して「Create pull request」をクリック

#### 3. CI/CDの実行を確認

プルリクエストを作成すると、自動的にGitHub Actionsが実行されます。

**実行中**:
- 🟡 黄色の丸（回転）が表示される
- 「Some checks haven't completed yet」と表示される

**成功時**:
- ✅ 緑色のチェックマークが表示される
- 「All checks have passed」と表示される

**失敗時**:
- ❌ 赤色のバツマークが表示される
- 「Some checks were not successful」と表示される

#### 4. 詳細を確認

「Details」をクリックすると、以下の情報が表示されます：

- **Job Summary**: 実行結果のサマリー（日本語）
- **Annotations**: エラーが発生したファイルと行番号
- **Logs**: 詳細な実行ログ

### Actionsタブでの確認

#### 1. Actionsタブを開く

GitHubリポジトリページで「Actions」タブをクリック

#### 2. ワークフロー実行を選択

- 最新の実行をクリック
- または、特定のブランチやコミットの実行を選択

#### 3. ジョブを選択

「build-and-test」などのジョブ名をクリック

#### 4. ステップを確認

各ステップをクリックして、詳細なログを確認

### Job Summaryの見方

Job Summaryには、実行結果のサマリーが日本語で表示されます。

**成功時の例**:

```markdown
## ✅ ビルド・検証が正常に完了しました

### 📊 実行結果サマリー

| 検証項目 | 結果 | 詳細 | 実行時間 |
|---------|------|------|---------|
| 🏗️ ビルド | ✅ 成功 | すべてのファイルが正常に生成されました | 45秒 |
| 🔍 型チェック | ✅ 成功 | TypeScriptエラー: 0件 | 12秒 |
| 🧪 ユニットテスト | ✅ 成功 | 127 passed, 0 failed | 2分15秒 |
| 📈 カバレッジ | ✅ 85.4% | 閾値 80% を満たしています | - |
| 🔍 Lint | ✅ 成功 | エラー: 0件, 警告: 0件 | 8秒 |
| 📦 パッケージング | ✅ 成功 | ZIPファイル作成完了 | 5秒 |
```

**失敗時の例**:

```markdown
## ❌ 検証に失敗しました: ユニットテスト

### 🚨 失敗したテスト

#### 1. `TabCaptureService.captureCurrentTabs` - タブ情報取得のテスト

**エラー内容**:
Expected 5 tabs, but got 3

**ファイル**: `tests/domain/services/tab-capture-service.test.ts:45`

**原因の可能性**:
- テストデータのモックが不十分
- Chrome Tabs APIのモックが正しく設定されていない

### 🔧 推奨される対処手順

1. ローカル環境でテストを実行
2. テストログを詳細に確認
3. コードをレビュー
4. 修正とコミット
```

### Annotationsの見方

Annotationsは、エラーが発生したファイルと行番号を示します。

**表示例**:

```
❌ tests/domain/services/tab-capture-service.test.ts:45
テスト失敗
Expected 5 tabs, but got 3
```

GitHubのファイルビューで、該当行に直接ジャンプできます。

---

## トラブルシューティング

### 問題1: ビルドが失敗する

#### 症状
- ❌ ビルドステップで失敗
- エラーメッセージ: `Error: Cannot find module ...`

#### 原因
- モジュールのインポートパスが間違っている
- 依存関係が不足している
- TypeScriptの設定が正しくない

#### 解決方法

1. **ローカルでビルドを実行**
   ```bash
   cd FRONTEND
   npm run build
   ```

2. **エラーメッセージを確認**
   - どのファイルでエラーが発生しているか
   - どのモジュールが見つからないか

3. **インポートパスを確認**
   ```typescript
   // 正しい例
   import { TabCaptureService } from '@domain/services/tab-capture-service';

   // 間違った例
   import { TabCaptureService } from '@domain/services/tabCaptureService';
   ```

4. **依存関係を再インストール**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

5. **tsconfig.jsonを確認**
   - パスマッピングが正しく設定されているか確認

### 問題2: テストが失敗する

#### 症状
- ❌ ユニットテストステップで失敗
- エラーメッセージ: `Expected X, received Y`

#### 原因
- テストケースの期待値が間違っている
- 実装コードのロジックが変更された
- モックが正しく設定されていない

#### 解決方法

1. **ローカルでテストを実行**
   ```bash
   cd FRONTEND
   npm test
   ```

2. **失敗したテストを特定**
   ```bash
   npm test -- tests/domain/services/tab-capture-service.test.ts
   ```

3. **テストコードを確認**
   - 期待値が正しいか
   - モックが適切に設定されているか

4. **実装コードを確認**
   - ビジネスロジックが正しいか
   - 変更が意図的か

5. **修正してコミット**
   ```bash
   git add .
   git commit -m "Fix failing tests"
   git push
   ```

### 問題3: カバレッジが閾値を下回る

#### 症状
- ⚠️ カバレッジ警告が表示される
- エラーメッセージ: `Coverage threshold for branches (65%) not met: 62.5%`

#### 原因
- 新しいコードにテストが追加されていない
- エラーハンドリングのパスがテストされていない
- エッジケースのテストが不足している

#### 解決方法

1. **カバレッジレポートを確認**
   ```bash
   cd FRONTEND
   npm run test:coverage
   open coverage/lcov-report/index.html
   ```

2. **カバレッジが不足しているファイルを特定**
   - レポート内で赤色やオレンジ色でハイライトされている箇所

3. **不足しているテストを追加**
   ```typescript
   // 正常系のテスト
   it('should capture current tabs', async () => {
     // ... 既存のテスト
   });

   // 異常系のテスト（追加）
   it('should handle error when Chrome API fails', async () => {
     chromeTabsAdapter.getCurrentTabs.mockRejectedValue(
       new Error('Chrome API error')
     );

     await expect(service.captureCurrentTabs())
       .rejects
       .toThrow('Chrome API error');
   });

   // エッジケース（追加）
   it('should handle empty tabs array', async () => {
     chromeTabsAdapter.getCurrentTabs.mockResolvedValue([]);

     const result = await service.captureCurrentTabs();
     expect(result).toEqual([]);
   });
   ```

4. **カバレッジを再確認**
   ```bash
   npm run test:coverage
   ```

### 問題4: Lintエラーが多数発生する

#### 症状
- ❌ Lintステップで失敗
- エラーメッセージ: `Variable is defined but never used`など

#### 原因
- 未使用の変数やインポートがある
- ESLintルールに違反している
- コードフォーマットが統一されていない

#### 解決方法

1. **自動修正を試す**
   ```bash
   cd FRONTEND
   npm run lint -- --fix
   npm run format
   ```

2. **手動で修正が必要なエラーを確認**
   ```bash
   npm run lint
   ```

3. **未使用の変数を削除**
   ```typescript
   // 修正前
   const unusedVariable = 'test'; // ❌ 未使用
   const usedVariable = 'hello';
   console.log(usedVariable);

   // 修正後
   const usedVariable = 'hello'; // ✅
   console.log(usedVariable);
   ```

4. **コミット**
   ```bash
   git add .
   git commit -m "Fix lint errors"
   git push
   ```

### 問題5: CI/CDは成功するが、ローカルでは失敗する

#### 症状
- ✅ GitHub Actionsは成功
- ❌ ローカル環境では失敗

#### 原因
- ローカル環境の依存関係が古い
- ローカル環境のNode.jsバージョンが異なる
- キャッシュの問題

#### 解決方法

1. **Node.jsバージョンを確認**
   ```bash
   node --version  # CI/CDではv23.x
   ```

2. **依存関係を再インストール**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **キャッシュをクリア**
   ```bash
   rm -rf dist/ coverage/ .cache/
   ```

4. **再度テスト**
   ```bash
   npm run build && npm test
   ```

---

## ベストプラクティス

### 1. コミット前にローカルチェックを実行

プッシュ前にローカルで全チェックを実行することで、CI/CD失敗を防げます。

```bash
cd FRONTEND

# 全チェックを実行
npm run build && \
npm run type-check && \
npm test && \
npm run lint

# 問題なければコミット＆プッシュ
git add .
git commit -m "Your commit message"
git push
```

### 2. テスト駆動開発（TDD）を実践

新しい機能を実装する前にテストを書くことで、カバレッジを維持できます。

```bash
# テストをウォッチモードで実行
npm test -- --watch
```

### 3. 小さいコミットを心がける

大きな変更を一度にコミットすると、CI/CD失敗時の原因特定が困難になります。

```bash
# 良い例
git commit -m "Add tab capture service"
git commit -m "Add tests for tab capture service"

# 悪い例
git commit -m "Implement all features"
```

### 4. Job SummaryとAnnotationsを活用

CI/CD失敗時は、Job SummaryとAnnotationsを確認することで、迅速に問題を特定できます。

### 5. カバレッジを意識する

新しいコードを追加する際は、テストも追加してカバレッジを維持しましょう。

```bash
# カバレッジレポートを確認
npm run test:coverage
open coverage/lcov-report/index.html
```

### 6. Lintルールに従う

Lintルールに従うことで、コードの品質とスタイルの一貫性を保てます。

```bash
# Lintエラーを自動修正
npm run lint -- --fix
npm run format
```

### 7. 定期的に依存関係を更新

セキュリティ脆弱性を防ぐため、定期的に依存関係を更新しましょう。

```bash
# 脆弱性をチェック
npm audit

# 脆弱性を修正
npm audit fix
```

---

## 参考資料

### プロジェクト内ドキュメント

- [README.md](FRONTEND/README.md) - 開発環境セットアップガイド
- [VERIFICATION_GUIDE.md](FRONTEND/VERIFICATION_GUIDE.md) - 検証ガイド
- [ワークフロー技術ドキュメント](.github/workflows/README.md) - GitHub Actionsの技術詳細（実装者向け）
- [UX_IMPROVEMENT_ANALYSIS.md](UX_IMPROVEMENT_ANALYSIS.md) - UX改善分析
- [WORKFLOW_UX_DESIGN.md](WORKFLOW_UX_DESIGN.md) - ワークフローUX設計

### 外部リソース

#### GitHub Actions

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow syntax for GitHub Actions](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Workflow commands for GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands)

#### CI/CDベストプラクティス

- [Supercharging GitHub Actions with Job Summaries](https://github.blog/news-insights/product-news/supercharging-github-actions-with-job-summaries/)
- [GitHub Actions for Test Automation](https://mastersoftwaretesting.com/automation-academy/ci-cd-integration/github-actions-test-automation)
- [Chrome extension publishing w/ GitHub Actions](https://jam.dev/blog/automating-chrome-extension-publishing/)

#### テストとカバレッジ

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Jest Coverage](https://jestjs.io/docs/configuration#collectcoverage-boolean)
- [Test Reporter Action](https://github.com/marketplace/actions/test-reporter)

---

## よくある質問（FAQ）

### Q1: CI/CDのチェックをスキップできますか？

**A**: 推奨しませんが、コミットメッセージに`[skip ci]`を含めることでスキップできます。

```bash
git commit -m "Update documentation [skip ci]"
```

ただし、これはドキュメントのみの変更など、コードに影響しない場合のみ使用してください。

### Q2: CI/CDの実行時間を短縮できますか？

**A**: 以下の方法で短縮できます：

1. **キャッシュの活用**: 依存関係のキャッシュを有効化（既に実装済み）
2. **並列実行**: 独立したジョブを並列で実行
3. **テストの最適化**: 不要なテストを削除、重複を避ける

### Q3: 手動でワークフローを実行できますか？

**A**: `workflow_dispatch`を設定することで、手動実行が可能になります。

現在の設定では、プッシュとプルリクエスト時に自動実行されます。

### Q4: 特定のブランチでのみCI/CDを実行したい場合は？

**A**: ワークフローファイルの`on`セクションを編集します：

```yaml
on:
  push:
    branches: [main, develop]  # mainとdevelopブランチのみ
  pull_request:
    branches: [main]           # mainへのPRのみ
```

### Q5: 成果物（Artifacts）はどこにありますか？

**A**: GitHub Actionsの実行ページの「Artifacts」セクションからダウンロードできます。

成果物は30日間保持されます。

---

## まとめ

- ✅ CI/CDパイプラインは、コードの品質を自動的にチェックします
- ✅ プルリクエスト作成時に自動実行されます
- ✅ Job Summaryで実行結果が日本語で確認できます
- ✅ Annotationsでエラー箇所が特定できます
- ✅ ローカル環境で事前チェックすることで、CI/CD失敗を防げます

---

**質問やフィードバックがある場合は、GitHubのIssueを作成してください。**

---

**更新履歴**:
- 2026-02-08: 初版作成（UX Specialist）
