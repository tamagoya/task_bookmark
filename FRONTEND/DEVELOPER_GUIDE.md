# 開発者ガイド

## 目次

- [環境セットアップ](#環境セットアップ)
- [開発ワークフロー](#開発ワークフロー)
- [テスト実行](#テスト実行)
- [検証スクリプト](#検証スクリプト)
- [CI/CD](#cicd)
- [トラブルシューティング](#トラブルシューティング)
- [Chrome拡張機能特有の注意点](#chrome拡張機能特有の注意点)
- [コーディング規約](#コーディング規約)

## 環境セットアップ

### 前提条件

- **Node.js**: 18.x 以降（推奨: 20.x）
- **npm**: 10.x 以降
- **Git**: 2.x 以降
- **Chrome**: 最新版

### 初回セットアップ

```bash
# リポジトリのクローン
git clone <repository-url>
cd task_bookmark

# FRONTEND ディレクトリに移動
cd FRONTEND

# 依存関係のインストール
npm install

# TypeScript型チェック
npm run type-check

# ビルド
npm run build
```

### 開発環境の確認

```bash
# ビルドが成功することを確認
npm run build

# テストが通ることを確認
npm test

# Lintが通ることを確認
npm run lint
```

すべてのコマンドがエラーなく完了すれば、開発環境のセットアップは完了です。

## 開発ワークフロー

### 1. ブランチの作成

```bash
# メインブランチから最新を取得
git checkout main
git pull origin main

# 新しいブランチを作成
git checkout -b feature/your-feature-name
```

### 2. コーディング

```bash
# ウォッチモードでビルド（コード変更時に自動再ビルド）
npm run dev
```

#### 推奨する開発サイクル

1. コードを変更
2. `npm run type-check` で型エラーがないことを確認
3. `npm test -- --watch` でテストを実行
4. Chromeで拡張機能をリロードして動作確認

### 3. コミット前のチェック

```bash
# 型チェック
npm run type-check

# Lint
npm run lint

# フォーマットチェック
npm run format:check

# テスト
npm test

# ビルド
npm run build

# 全検証を一括実行
npm run verify:all
```

### 4. コミットとプッシュ

```bash
# 変更をステージング
git add .

# コミット
git commit -m "feat: Add new feature"

# プッシュ
git push origin feature/your-feature-name
```

### 5. プルリクエスト

GitHub上でプルリクエストを作成します。CI/CDが自動的に実行され、全ての検証が通ることを確認してください。

## テスト実行

### 基本的なテストコマンド

```bash
# 全テスト実行（約70秒）
npm test

# カバレッジレポート生成
npm run test:coverage

# 特定のテストファイルのみ実行
npm test -- --testPathPattern="auth"

# ウォッチモード（開発中）
npm run test:watch
```

### カバレッジレポートの確認

```bash
# カバレッジレポート生成
npm run test:coverage

# HTMLレポートを開く
open coverage/lcov-report/index.html
```

カバレッジ閾値：
- Statements: 80%
- Branches: 65%
- Functions: 80%
- Lines: 80%

### テストの書き方

#### 基本構造（AAAパターン）

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    jest.clearAllMocks();
  });

  it('should do something when condition is met', () => {
    // Arrange: テストデータの準備
    const input = createTestData();

    // Act: 実行
    const result = doSomething(input);

    // Assert: 検証
    expect(result).toBe(expectedValue);
  });
});
```

#### Chrome APIのモック

```typescript
describe('Authentication Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Chrome Storage APIのモック
    (chrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => callback({ authState: mockAuthState })
    );
  });

  it('should save auth state', async () => {
    const authState = createAuthState();
    await saveAuthState(authState);

    expect(chrome.storage.local.set).toHaveBeenCalledWith({ authState });
  });
});
```

詳細は [TESTING.md](./TESTING.md) を参照してください。

## 検証スクリプト

### マニフェスト検証

```bash
# manifest.jsonの検証
npm run verify:manifest
```

検証項目：
- JSON構文の正当性
- 必須フィールドの存在
- バージョン番号の形式
- パーミッションの妥当性
- OAuth2設定

### ビルド成果物検証

```bash
# ビルド後に実行
npm run build
npm run verify:build
```

検証項目：
- dist/ディレクトリの存在
- 必須ファイルの存在
- ファイルサイズの妥当性
- manifest.jsonの内容
- service-worker.jsの基本チェック

### 統合検証

```bash
# 全検証を実行（テストなし）
npm run verify:all

# テスト込みで全検証を実行
npm run verify:all:with-tests
```

実行される検証：
1. TypeScript型チェック
2. ESLint
3. マニフェスト検証
4. ビルド成果物検証（オプション）
5. ユニットテスト（--with-testsオプション時）

## CI/CD

### GitHub Actionsワークフロー

プッシュやプルリクエスト時に、以下のジョブが自動実行されます：

#### 1. build-and-lint
- TypeScript型チェック
- ESLint
- Prettierフォーマットチェック
- ビルド

#### 2. test
- ユニットテスト実行
- カバレッジレポート生成

#### 3. verification
- マニフェスト検証（10項目）
- ビルド成果物検証

#### 4. security-scan
- npm audit（週次）

#### 5. package
- ZIPパッケージ作成（main/developブランチのみ）

### ローカルでのCI/CD再現

```bash
# CI/CDと同じ検証を実行
npm run verify:all:with-tests
```

これにより、プッシュ前にCI/CDエラーを予防できます。

## トラブルシューティング

### ビルドエラー

#### 問題: TypeScript型エラー

```bash
# 型エラーの確認
npm run type-check

# エラーメッセージを確認し、該当箇所を修正
```

よくあるエラー：
- 型定義が不足: `@types/*` パッケージを追加
- 型の不一致: 型注釈を修正
- Chrome API型: `@types/chrome` がインストールされているか確認

#### 問題: ESLintエラー

```bash
# Lintエラーの確認
npm run lint

# 自動修正可能なエラーを修正
npm run lint -- --fix
```

よくあるエラー：
- 未使用の変数: 削除するか、`_` プレフィックスを付ける
- コンソールログ: `console.log` は削除、`Logger` を使用
- インポート順序: ESLintの `--fix` で自動修正

#### 問題: Prettierフォーマットエラー

```bash
# フォーマットチェック
npm run format:check

# 自動フォーマット
npm run format
```

### テストエラー

#### 問題: テストが失敗する

```bash
# 失敗したテストのみ実行
npm test -- --onlyFailures

# 詳細なエラーメッセージを表示
npm test -- --verbose
```

よくある原因：
- モックが正しく設定されていない
- 非同期処理の扱いが不適切
- テスト間で状態が共有されている

#### 問題: カバレッジが閾値未満

```bash
# カバレッジレポートを生成
npm run test:coverage

# HTMLレポートで未カバー箇所を確認
open coverage/lcov-report/index.html
```

対処法：
- 未カバーの行を確認
- エッジケースのテストを追加
- 不要なコードは削除

### Chrome拡張機能の問題

#### 問題: 拡張機能が読み込めない

1. ビルドが成功しているか確認
   ```bash
   npm run build
   ls -la dist/
   ```

2. manifest.jsonが存在するか確認
   ```bash
   cat dist/manifest.json
   ```

3. Chrome Extensions ページでエラーを確認
   - `chrome://extensions/` を開く
   - 「エラー」ボタンをクリック

#### 問題: Service Workerがクラッシュする

1. Service Workerのコンソールを確認
   - `chrome://extensions/` を開く
   - 「Service Worker」をクリック
   - エラーメッセージを確認

2. コンソールエラーを修正
   - 構文エラーがないか確認
   - Chrome API の使用方法が正しいか確認

#### 問題: OAuth2認証が失敗する

1. manifest.jsonのOAuth2設定を確認
   ```bash
   npm run verify:manifest
   ```

2. Google Cloud Consoleで設定を確認
   - クライアントIDが正しいか
   - リダイレクトURIが設定されているか
   - Calendar APIが有効になっているか

## Chrome拡張機能特有の注意点

### Chrome APIの使用

#### ストレージAPI

```typescript
// ✅ 良い例: コールバックを使用
chrome.storage.local.get(['authState'], (result) => {
  const authState = result.authState;
});

// ✅ 良い例: Promiseでラップ
const getAuthState = (): Promise<AuthState> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authState'], (result) => {
      resolve(result.authState);
    });
  });
};

// ❌ 悪い例: 同期的に使用しようとする
const authState = chrome.storage.local.get(['authState']); // これは動作しない
```

#### タブAPI

```typescript
// ✅ 良い例: queryを使用
chrome.tabs.query({ currentWindow: true }, (tabs) => {
  console.log('Current tabs:', tabs);
});

// ❌ 悪い例: Service Workerからwindow.locationを使用
const url = window.location.href; // Service Workerでは使用できない
```

### Service Workerの制約

Service Workerでは以下が使用できません：
- `window` オブジェクト
- `document` オブジェクト
- `localStorage`
- DOM操作

代わりに以下を使用：
- `chrome.storage` API（永続化）
- `chrome.tabs` API（タブ情報）
- `chrome.windows` API（ウィンドウ情報）

### OAuth2認証

```typescript
// ✅ 良い例: interactiveオプションを使用
chrome.identity.getAuthToken({ interactive: true }, (token) => {
  if (chrome.runtime.lastError) {
    console.error('Auth error:', chrome.runtime.lastError);
    return;
  }
  // トークンを使用
});

// ⚠️ 注意: 非インタラクティブモードはユーザーの明示的な操作後のみ
chrome.identity.getAuthToken({ interactive: false }, (token) => {
  // トークンがキャッシュされている場合のみ成功
});
```

### マニフェストv3の注意点

#### Content Security Policy

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

- `eval()` は使用不可
- インライン `<script>` は使用不可
- 外部スクリプトのロードは制限

#### Service Worker

Manifest v3ではBackground Pageの代わりにService Workerを使用：

```javascript
// ✅ Service Worker（Manifest v3）
chrome.alarms.create('refreshToken', { periodInMinutes: 30 });

// ❌ Background Page（Manifest v2、廃止）
setInterval(() => {
  refreshToken();
}, 30 * 60 * 1000);
```

## コーディング規約

### TypeScript

#### 型注釈

```typescript
// ✅ 良い例: 明示的な型注釈
function saveAuthState(authState: AuthState): Promise<void> {
  // ...
}

// ❌ 悪い例: any型の使用
function saveAuthState(authState: any) {
  // ...
}
```

#### null/undefinedの扱い

```typescript
// ✅ 良い例: Optional Chainingを使用
const userId = authState?.userId ?? 'anonymous';

// ❌ 悪い例: nullチェックなし
const userId = authState.userId; // authStateがnullの場合エラー
```

### コード品質

#### DRY原則

```typescript
// ✅ 良い例: 共通ロジックを関数化
function validateToken(token: Token): boolean {
  return token.expiry > Date.now();
}

const isValid1 = validateToken(token1);
const isValid2 = validateToken(token2);

// ❌ 悪い例: 重複したコード
const isValid1 = token1.expiry > Date.now();
const isValid2 = token2.expiry > Date.now();
```

#### SOLID原則

- **Single Responsibility**: 1つのクラスは1つの責任
- **Open/Closed**: 拡張に開いて、修正に閉じている
- **Liskov Substitution**: サブクラスは基底クラスと置き換え可能
- **Interface Segregation**: 小さく特化したインターフェース
- **Dependency Inversion**: 抽象に依存、実装に依存しない

### ファイル構成

```
src/
├── domain/              # ドメイン層（ビジネスロジック）
│   ├── entities/        # エンティティ
│   ├── value-objects/   # 値オブジェクト
│   ├── events/          # ドメインイベント
│   └── services/        # ドメインサービス
├── application/         # アプリケーション層（ユースケース）
│   ├── services/        # アプリケーションサービス
│   ├── handlers/        # イベントハンドラ
│   └── decorators/      # デコレータ
└── infrastructure/      # インフラ層（技術的詳細）
    ├── adapters/        # 外部APIアダプター
    └── repositories/    # リポジトリ実装
```

### コミットメッセージ

Conventional Commitsに従います：

```bash
# 新機能
git commit -m "feat: Add token refresh functionality"

# バグ修正
git commit -m "fix: Fix authentication state persistence"

# ドキュメント
git commit -m "docs: Update developer guide"

# テスト
git commit -m "test: Add tests for tab capture service"

# リファクタリング
git commit -m "refactor: Extract common validation logic"
```

## 参考資料

- [TESTING.md](./TESTING.md) - テスト戦略とガイド
- [scripts/README.md](./scripts/README.md) - 検証スクリプトの使用方法
- [VERIFICATION_GUIDE.md](./VERIFICATION_GUIDE.md) - 手動検証ガイド
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/) - Chrome拡張機能の公式ドキュメント
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - TypeScript公式ハンドブック

## サポート

問題が発生した場合：
1. このガイドのトラブルシューティングセクションを確認
2. [TESTING.md](./TESTING.md) のトラブルシューティングを確認
3. GitHubでIssueを作成

Happy coding! 🚀
