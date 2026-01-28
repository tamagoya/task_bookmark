# OAuth2認証設定ガイド

Unit 1の認証機能を動作確認するための、OAuth2クライアントID取得手順です。

## 概要

Chrome拡張機能でOAuth2認証を使用するには、以下の手順が必要です：

1. 拡張機能をZIP形式でパッケージ化
2. Chrome Web Store Developer Dashboardにアップロード（公開不要）
3. 拡張機能IDを取得
4. Google Cloud ConsoleでOAuth2クライアントIDを作成
5. `manifest.json`に設定

## 前提条件

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)のアカウント（$5の登録料が必要）
- [Google Cloud Console](https://console.cloud.google.com/)のアカウント

## ステップ1: 拡張機能をパッケージ化

### 方法1: npmスクリプトを使用（推奨）

```bash
npm run package
```

これで、プロジェクトルートに`task-bookmark-extension.zip`が作成されます。

### 方法2: 手動でZIPを作成

1. 拡張機能をビルド：
   ```bash
   npm run build
   ```

2. `FRONTEND/dist`ディレクトリに移動：
   ```bash
   cd dist
   ```

3. すべてのファイルをZIP形式で圧縮：
   ```bash
   # macOS/Linux
   zip -r ../task-bookmark-extension.zip .
   
   # Windows (PowerShell)
   Compress-Archive -Path * -DestinationPath ../task-bookmark-extension.zip
   ```

**重要**: `dist`フォルダ自体ではなく、`dist`フォルダ内のファイルをZIPに含めてください。
- ✅ 正しい: `manifest.json`, `background/`, `sidepanel/` がZIPのルートにある
- ❌ 間違い: `dist/`フォルダがZIPのルートにある

ZIPファイルの構造例：
```
task-bookmark-extension.zip
├── manifest.json
├── background/
│   └── service-worker.js
└── sidepanel/
    ├── sidepanel.html
    ├── sidepanel.css
    └── sidepanel.js
```

## ステップ2: Chrome Web Store Developer Dashboardにアップロード

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)にアクセス
2. 初回の場合は、$5の登録料を支払ってアカウントを作成
3. 「新しいアイテム」をクリック
4. 作成したZIPファイル（`task-bookmark-extension.zip`）をアップロード
5. 必要事項を入力：
   - **名前**: タスクブックマーク（または任意の名前）
   - **説明**: ブラウザの作業状態をGoogle Calendarに保存・復元するChrome拡張機能
   - **カテゴリ**: その他（または適切なカテゴリ）
   - **言語**: 日本語
6. **公開する必要はありません**。「下書きとして保存」をクリック
7. アップロード後、拡張機能の詳細ページで**拡張機能ID**を確認
   - 例: `abcdefghijklmnopqrstuvwxyz123456`
   - 拡張機能IDは、拡張機能の詳細ページのURLや「拡張機能ID」セクションに表示されます

## ステップ3: Google Cloud ConsoleでOAuth2クライアントIDを作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成または選択
   - 新規プロジェクトを作成する場合：「プロジェクトを作成」をクリック
   - 既存プロジェクトを使用する場合：プロジェクトを選択
3. **Google Calendar APIを有効化**：
   - 「APIとサービス」→「ライブラリ」に移動
   - 「Google Calendar API」を検索
   - 「有効にする」をクリック
4. **OAuth同意画面を設定**（初回のみ）：
   - 「APIとサービス」→「OAuth同意画面」に移動
   - ユーザータイプを選択（外部または内部）
   - アプリ情報を入力：
     - アプリ名: タスクブックマーク
     - ユーザーサポートメール: あなたのメールアドレス
     - デベロッパーの連絡先情報: あなたのメールアドレス
   - スコープを追加：
     - `https://www.googleapis.com/auth/calendar` を追加
   - 「保存して次へ」をクリック
   - テストユーザーを追加（開発中の場合）
   - 「保存して次へ」をクリック
5. **OAuth2クライアントIDを作成**：
   - 「APIとサービス」→「認証情報」に移動
   - 「認証情報を作成」→「OAuth 2.0 クライアント ID」を選択
   - アプリケーションの種類で「Chrome アプリ」を選択
   - **アプリケーションID**に、ステップ2で取得した拡張機能IDを入力
   - 「作成」をクリック
6. **クライアントIDをコピー**：
   - 作成されたOAuth2クライアントIDをコピー
   - 形式: `123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com`

## ステップ4: manifest.jsonに設定

1. `FRONTEND/manifest.json`を開く
2. `oauth2.client_id`を取得したクライアントIDに置き換え：

```json
"oauth2": {
  "client_id": "123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/calendar"
  ]
}
```

## ステップ5: 再ビルドと再読み込み

1. 拡張機能を再ビルド：
   ```bash
   npm run build
   ```

2. Chrome拡張機能を再読み込み：
   - `chrome://extensions/` を開く
   - 拡張機能の「再読み込み」ボタンをクリック

3. 認証機能をテスト：
   - 拡張機能アイコンをクリックしてサイドパネルを開く
   - 「認証する」ボタンをクリック
   - Googleアカウントの認証画面が表示されることを確認

## 注意事項

### 開発用と本番用の違い

- **開発用（パッケージ化されていない拡張機能）**: `chrome://extensions/`で「パッケージ化されていない拡張機能を読み込む」で読み込んだ拡張機能は、Chrome Web Storeから取得した拡張機能IDとは異なります
- **本番用（パッケージ化された拡張機能）**: Chrome Web Store Developer Dashboardにアップロードした拡張機能は、固定の拡張機能IDを持ちます

### OAuth2クライアントIDの制約

- OAuth2クライアントIDは、特定の拡張機能IDに紐づいています
- 異なる拡張機能IDで読み込んだ拡張機能では、同じOAuth2クライアントIDは使用できません
- 開発中は、Chrome Web Storeからダウンロードした拡張機能（または同じ拡張機能IDでパッケージ化したもの）を使用する必要があります

### テストユーザーの追加

OAuth同意画面で「テスト」モードにしている場合、認証可能なユーザーを「テストユーザー」として追加する必要があります：
- 「APIとサービス」→「OAuth同意画面」→「テストユーザー」→「ユーザーを追加」

## トラブルシューティング

### エラー: "bad client id"

- `manifest.json`の`oauth2.client_id`が正しく設定されているか確認
- 拡張機能IDとOAuth2クライアントIDのアプリケーションIDが一致しているか確認

### エラー: "Access blocked: This app's request is invalid"

- OAuth同意画面でスコープ（`https://www.googleapis.com/auth/calendar`）が追加されているか確認
- テストユーザーが追加されているか確認（テストモードの場合）

### 認証画面が表示されない

- Google Calendar APIが有効になっているか確認
- OAuth2クライアントIDが正しく作成されているか確認

---

**最終更新**: 2026-01-21
