# 検証スクリプト

このディレクトリには、Chrome拡張機能のビルドとデプロイ前に実行する検証スクリプトが含まれています。

## スクリプト一覧

### 1. verify-manifest.cjs

manifest.jsonファイルの検証を行います。

**検証項目:**
- JSON構文の正当性
- 必須フィールドの存在確認（manifest_version, name, version等）
- バージョン番号の形式チェック（セマンティックバージョニング）
- パーミッションの妥当性確認
- OAuth2設定の検証
- background, side_panel, action設定の確認

**実行方法:**
```bash
npm run verify:manifest
```

**終了コード:**
- 0: 検証成功
- 1: 検証失敗

---

### 2. verify-build-output.cjs

ビルド成果物（dist/ディレクトリ）の検証を行います。

**検証項目:**
- dist/ディレクトリの存在確認
- 必須ファイルの存在確認
  - manifest.json
  - background/service-worker.js
  - sidepanel/sidepanel.html
  - sidepanel/sidepanel.css
  - sidepanel/sidepanel.js
- ファイルサイズの妥当性チェック
- ディレクトリ構造の確認
- manifest.jsonの内容確認
- service-worker.jsの基本チェック
- 合計ファイルサイズの計算

**実行方法:**
```bash
npm run verify:build
```

**前提条件:**
- ビルドが完了していること（`npm run build`を実行済み）

**終了コード:**
- 0: 検証成功
- 1: 検証失敗

---

### 3. run-all-checks.cjs

全ての検証を統合的に実行します。

**検証項目:**
1. TypeScript型チェック（`npm run type-check`）
2. ESLint（`npm run lint`）
3. マニフェスト検証（`verify-manifest.cjs`）
4. ビルド成果物検証（`verify-build-output.cjs`）（オプション）
5. ユニットテスト（`npm test`）（`--with-tests`オプション指定時のみ）

**実行方法:**
```bash
# 基本実行（ユニットテストをスキップ）
npm run verify:all

# ユニットテストも含めて実行
npm run verify:all:with-tests
```

**出力例:**
```
============================================================
全検証スクリプト実行開始
============================================================

▶ TypeScript型チェック
✓ TypeScript型チェック: 成功

▶ ESLint
✓ ESLint: 成功

▶ マニフェスト検証
✓ マニフェスト検証: 成功

▶ ビルド成果物検証
✓ ビルド成果物検証: 成功

============================================================
検証結果サマリー
============================================================
1. ✓ TypeScript型チェック
2. ✓ ESLint
3. ✓ マニフェスト検証
4. ✓ ビルド成果物検証 (オプション)
============================================================
合計: 4 件 | 成功: 4 | 失敗: 0
============================================================

✓ すべての検証に合格しました！
```

**終了コード:**
- 0: すべての必須検証が成功
- 1: 1つ以上の必須検証が失敗

---

## CI/CDでの使用

GitHub Actionsでこれらのスクリプトを使用する例:

```yaml
name: CI

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd FRONTEND
          npm ci

      - name: Run all checks
        run: |
          cd FRONTEND
          npm run verify:all:with-tests

      - name: Build extension
        run: |
          cd FRONTEND
          npm run build
```

---

## トラブルシューティング

### ESLintエラーが発生する場合

ESLintエラーは既存コードの品質問題を示しています。以下のコマンドで自動修正を試みることができます:

```bash
npm run lint -- --fix
```

### ビルド成果物検証が失敗する場合

ビルドが完了していない可能性があります。以下を実行してください:

```bash
npm run build
npm run verify:build
```

### TypeScript型エラーが発生する場合

型定義の問題があります。以下で詳細を確認してください:

```bash
npm run type-check
```

---

## 開発ガイドライン

### プルリクエスト前のチェックリスト

1. コードを変更したら必ず型チェックとLintを実行
   ```bash
   npm run type-check
   npm run lint
   ```

2. ビルドが成功することを確認
   ```bash
   npm run build
   ```

3. 全ての検証を実行
   ```bash
   npm run verify:all:with-tests
   ```

4. テストカバレッジを確認
   ```bash
   npm run test:coverage
   ```

### 新しい検証項目の追加

新しい検証スクリプトを追加する場合:

1. `scripts/`ディレクトリに`.cjs`拡張子でスクリプトを作成
2. `package.json`の`scripts`セクションにエントリを追加
3. `run-all-checks.cjs`に検証項目を追加
4. このREADME.mdを更新

---

## ライセンス

このプロジェクトのライセンスに従います。
