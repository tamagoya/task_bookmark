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

### ステップ1: 拡張機能をパッケージ化

1. 拡張機能をビルド：
   ```bash
   npm run build
   ```

2. `FRONTEND/dist`ディレクトリの内容をZIP形式で圧縮：
   ```bash
   cd FRONTEND/dist
   zip -r ../../task-bookmark-extension.zip .
   ```
   
   または、GUIで`FRONTEND/dist`フォルダ内のすべてのファイルを選択してZIP形式で圧縮してください。

   **重要**: `dist`フォルダ自体ではなく、`dist`フォルダ内のファイルをZIPに含めてください。
   - ✅ 正しい: `manifest.json`, `background/`, `sidepanel/` がZIPのルートにある
   - ❌ 間違い: `dist/`フォルダがZIPのルートにある

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
