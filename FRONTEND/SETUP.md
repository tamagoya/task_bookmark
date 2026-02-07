# セットアップガイド

## OAuth2認証情報の設定

Chrome拡張機能を開発・使用するには、Google Cloud PlatformでOAuth2認証情報を設定する必要があります。

### 前提条件

- Googleアカウント
- Google Cloud Platformプロジェクト

---

## 1. Google Cloud Platformでの設定

### 1-1. プロジェクトの作成（初回のみ）

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 画面上部の「プロジェクトを選択」をクリック
3. 「新しいプロジェクト」をクリック
4. プロジェクト名を入力（例: "task-bookmark"）
5. 「作成」をクリック

### 1-2. Google Calendar APIの有効化

1. [APIライブラリ](https://console.cloud.google.com/apis/library) にアクセス
2. 「Google Calendar API」を検索
3. 「有効にする」をクリック

### 1-3. OAuth同意画面の設定（初回のみ）

1. [OAuth同意画面](https://console.cloud.google.com/apis/credentials/consent) にアクセス
2. **User Type**: 「外部」を選択
3. 「作成」をクリック
4. 以下の必須項目を入力:
   - **アプリ名**: タスクブックマーク
   - **ユーザーサポートメール**: あなたのメールアドレス
   - **デベロッパーの連絡先情報**: あなたのメールアドレス
5. 「保存して次へ」をクリック
6. **スコープ**ページ: 「保存して次へ」をクリック
7. **テストユーザー**ページ:
   - 「＋ADD USERS」をクリック
   - あなたのメールアドレスを追加
   - 「保存して次へ」をクリック
8. 「ダッシュボードに戻る」をクリック

### 1-4. OAuth2クライアントIDの作成

1. [認証情報](https://console.cloud.google.com/apis/credentials) にアクセス
2. 「＋認証情報を作成」→「OAuth クライアント ID」をクリック
3. **アプリケーションの種類**: 「Chromeアプリ」を選択
4. **名前**: "タスクブックマーク Chrome拡張機能"
5. **アプリケーション ID**:
   - 拡張機能をビルド後に取得するIDを入力
   - 初回は仮の値でOK（後で更新可能）
6. 「作成」をクリック
7. 表示される**クライアントID**をコピー
   - 形式: `XXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com`

---

## 2. ローカル環境での設定

### 2-1. manifest.jsonの作成

```bash
# FRONTENDディレクトリに移動
cd FRONTEND

# テンプレートをコピー
cp manifest.json.template manifest.json
```

### 2-2. manifest.jsonにclient_idを設定

`FRONTEND/manifest.json`を開き、以下の部分を編集:

```json
{
  "oauth2": {
    "client_id": "ここにコピーしたクライアントIDを貼り付け",
    "scopes": [
      "https://www.googleapis.com/auth/calendar"
    ]
  }
}
```

**例**:
```json
{
  "oauth2": {
    "client_id": "123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/calendar"
    ]
  }
}
```

### 2-3. ビルド

```bash
npm install
npm run build
```

### 2-4. Chrome拡張機能のIDを取得

1. Chromeで `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `FRONTEND/dist/` ディレクトリを選択
5. 拡張機能の**ID**をコピー
   - 形式: `abcdefghijklmnopqrstuvwxyzabcdef`

### 2-5. GCPでアプリケーションIDを更新

1. [認証情報](https://console.cloud.google.com/apis/credentials) にアクセス
2. 作成したOAuth 2.0クライアントIDをクリック
3. **アプリケーション ID**に、コピーした拡張機能IDを貼り付け
4. 「保存」をクリック

---

## 3. セキュリティに関する注意事項

### ⚠️ 重要: manifest.jsonをGitにコミットしない

`manifest.json`には機密情報（client_id）が含まれているため、Gitにコミットしないでください。

**確認方法**:
```bash
# manifest.jsonが.gitignoreに含まれていることを確認
cat ../.gitignore | grep manifest.json
# → "FRONTEND/manifest.json" が表示されればOK

# git statusでmanifest.jsonが無視されていることを確認
git status
# → manifest.jsonが表示されなければOK
```

### 🔐 機密情報の管理

- **manifest.json**: ローカル開発環境のみ（Gitにコミットしない）
- **manifest.json.template**: Gitにコミット可能（プレースホルダーのみ）
- **client_id**: Google Cloud Consoleで管理

### 🚨 万が一、機密情報をGitHubにプッシュしてしまった場合

1. 直ちにGCPでOAuth2クライアントIDを削除
2. 新しいclient_idを作成
3. Gitの履歴から機密情報を削除（git filter-repo等）
4. リモートリポジトリに強制プッシュ

---

## 4. トラブルシューティング

### 認証エラーが発生する

**症状**: 拡張機能で「認証に失敗しました」と表示される

**原因と対処**:
1. **client_idが正しくない**
   - manifest.jsonのclient_idを確認
   - GCPのクライアントIDと一致しているか確認

2. **アプリケーションIDが正しくない**
   - GCPのOAuth2設定でアプリケーションIDを確認
   - chrome://extensions/ で表示される拡張機能IDと一致しているか確認

3. **Google Calendar APIが有効化されていない**
   - [APIライブラリ](https://console.cloud.google.com/apis/library) でGoogle Calendar APIを有効化

4. **テストユーザーに追加されていない**
   - [OAuth同意画面](https://console.cloud.google.com/apis/credentials/consent) でテストユーザーに自分のメールアドレスを追加

### ビルドエラーが発生する

**症状**: `npm run build` でエラーが発生する

**対処**:
```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 5. 参考資料

- [Google Cloud Console](https://console.cloud.google.com/)
- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/api/identity)
- [Google Calendar API](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)

---

## サポート

問題が発生した場合は、GitHubのIssueで報告してください。
