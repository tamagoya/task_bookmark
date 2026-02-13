# タスクブックマーク Chrome拡張機能

## 概要
ブラウザの作業状態をGoogle Calendarに保存・復元するChrome拡張機能です。

## 開発環境のセットアップ

### 必要な環境
- Node.js 18以上
- npm または yarn

### インストール
```bash
npm install
```

### ビルド
```bash
npm run build
```

### 開発モード
```bash
npm run dev
```

### テスト
```bash
npm test
npm run test:coverage
```

### リント
```bash
npm run lint
```

### フォーマット
```bash
npm run format
```

## 自動検証（CI/CD）

このプロジェクトでは、GitHub Actionsを使用してビルド、テスト、コード品質チェックを自動化しています。

### 自動実行されるチェック項目

プルリクエスト作成時、またはmainブランチへのプッシュ時に、以下のチェックが自動的に実行されます：

| チェック項目 | 内容 | コマンド |
|------------|------|---------|
| ビルド | TypeScriptのコンパイルとViteビルド | `npm run build` |
| 型チェック | TypeScriptの型エラーチェック | `npm run type-check` |
| ユニットテスト | Jestによる全テストの実行 | `npm test` |
| カバレッジ | テストカバレッジの確認（閾値: 80%） | `npm run test:coverage` |
| Lint | ESLintによるコード品質チェック | `npm run lint` |
| Format | Prettierによるフォーマットチェック | `npm run format:check` |
| マニフェスト検証 | Chrome拡張機能manifest.jsonの検証 | `.github/scripts/validate-manifest.sh` |
| セキュリティスキャン | npm auditによる脆弱性チェック | `npm audit` |
| パッケージング | 配布用ZIPファイルの生成 | `npm run package` |

### CI/CDバッジ

[![Chrome Extension Verification](https://github.com/YOUR_USERNAME/task_bookmark/actions/workflows/verification.yml/badge.svg)](https://github.com/YOUR_USERNAME/task_bookmark/actions/workflows/verification.yml)

### ローカルで同じチェックを実行

GitHub Actionsと同じチェックをローカル環境で事前に実行できます：

```bash
# FRONTENDディレクトリに移動
cd FRONTEND

# すべてのチェックを一括実行
npm run build && \
npm run type-check && \
npm test && \
npm run test:coverage && \
npm run lint && \
npm run format:check

# または、個別に実行
npm run build          # ビルド
npm run type-check     # 型チェック
npm test              # テスト
npm run test:coverage # カバレッジ付きテスト
npm run lint          # Lint
npm run format:check  # フォーマットチェック
```

**推奨**: プルリクエストを作成する前に、ローカルで全チェックを実行してください。

### 詳細なCI/CDガイド

CI/CDの詳細な使い方については、以下のドキュメントを参照してください：

- [CI/CDガイド](../CI_CD_GUIDE.md) - エンドユーザー向けの包括的なガイド
- [ワークフロー技術ドキュメント](../.github/workflows/README.md) - 実装者向けの技術詳細
- [検証ガイド](VERIFICATION_GUIDE.md) - 手動検証が必要な項目

## プロジェクト構造

```
FRONTEND/
├── manifest.json          # Manifest V3設定
├── background/           # Service Worker
├── sidepanel/           # サイドパネルUI
├── src/                 # ソースコード
│   ├── domain/         # ドメイン層
│   ├── application/    # アプリケーション層
│   └── infrastructure/ # インフラストラクチャ層
└── tests/              # テスト
```

## Chrome拡張機能の読み込み

1. Chromeで `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `FRONTEND/dist` ディレクトリを選択

## OAuth2認証の設定（認証機能を使用する場合）

現在、`manifest.json`の`oauth2.client_id`はプレースホルダー（`YOUR_CLIENT_ID.apps.googleusercontent.com`）になっています。実際に認証機能を使用するには、以下の手順でOAuth2クライアントIDを取得して設定してください。

### 前提条件

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)のアカウント（$5の登録料が必要）
- [Google Cloud Console](https://console.cloud.google.com/)のアカウント

### ステップ1: 拡張機能をパッケージ化（Chrome Web Store 用ZIP作成）

1. 次のコマンドでビルドとZIP作成を一度に実行します（ZIPは `FRONTEND/task-bookmark-extension.zip` に出力されます）：
   ```bash
   npm run package
   ```
   - ビルド後、`dist/` の内容がZIPにまとめられ、`.DS_Store` などは除外されます。
   - **重要**: ZIPのルートに `manifest.json`・`background/`・`sidepanel/` が含まれる形式で作成されます（Chrome Web Store の要件を満たします）。

### ステップ2: Chrome Web Store Developer Dashboardにアップロード

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)にアクセス
2. 「新しいアイテム」をクリック
3. 作成したZIPファイルをアップロード
4. 必要事項を入力（名前、説明など）
5. **公開する必要はありません**。「下書きとして保存」をクリック
6. アップロード後、拡張機能の詳細ページで**拡張機能ID**を確認（例: `abcdefghijklmnopqrstuvwxyz123456`）

### ステップ3: Google Cloud ConsoleでOAuth2クライアントIDを作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「ライブラリ」に移動
4. 「Google Calendar API」を検索して有効化
5. 「APIとサービス」→「認証情報」に移動
6. 「認証情報を作成」→「OAuth 2.0 クライアント ID」を選択
7. アプリケーションの種類で「Chrome アプリ」を選択
8. **アプリケーションID**に、ステップ2で取得した拡張機能IDを入力
9. 「作成」をクリックしてクライアントIDを取得

### ステップ4: manifest.jsonに設定

取得したクライアントIDを`FRONTEND/manifest.json`の`oauth2.client_id`に設定：

```json
"oauth2": {
  "client_id": "取得したクライアントID.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/calendar"
  ]
}
```

### ステップ5: 再ビルドと再読み込み

```bash
npm run build
```

その後、Chrome拡張機能を再読み込みしてください。

### 注意事項

- Chrome Web Storeに公開する必要はありません。下書きとして保存するだけで拡張機能IDを取得できます
- 開発用の拡張機能IDは、Chrome拡張機能を「パッケージ化されていない拡張機能」として読み込んだ場合とは異なります
- OAuth2クライアントIDを設定した後は、Chrome Web Storeからダウンロードした拡張機能（または同じ拡張機能IDでパッケージ化したもの）でないと認証が動作しません

---

**注意**: 開発・テスト目的でOAuth2認証を使用しない場合は、このエラーは無視して構いません。UIの動作確認は可能です。

**最終更新**: 2026-01-21
