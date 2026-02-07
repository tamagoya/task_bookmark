# テスト戦略

## 概要

task_bookmark Chrome拡張機能は、包括的なユニットテストにより品質を保証しています。

## 現在のテスト範囲

### ユニットテスト

- **テストケース数**: 625個
- **テストスイート数**: 87個
- **カバレッジ閾値**:
  - Statements: 80%
  - Branches: 65%
  - Functions: 80%
  - Lines: 80%
- **品質評価**: 90/100点（Chrome拡張機能特有の動作を十分にカバー）

### カバーされている領域

#### Chrome API層
- ✅ **Chrome Storage API**: 認証状態の永続化、設定保存
- ✅ **Chrome Identity API**: OAuth2認証、トークン管理
- ✅ **Chrome Tabs API**: タブ情報の取得、タブ操作
- ✅ **Chrome Windows API**: ウィンドウ管理
- ✅ **Chrome Alarms API**: トークンリフレッシュの定期実行

#### ドメイン層
- ✅ **認証ロジック**: ログイン、ログアウト、トークンリフレッシュ
- ✅ **タブキャプチャ**: 現在のタブ情報の取得
- ✅ **仕事状態管理**: 保存、取得、復元
- ✅ **Value Objects**: 30以上のドメインオブジェクト
- ✅ **Domain Events**: 20以上のドメインイベント

#### アプリケーション層
- ✅ **サービス層**: 認証、タブキャプチャ、復元、カレンダー操作
- ✅ **デコレータ**: パフォーマンス監視、キャッシュ
- ✅ **イベントハンドラ**: ドメインイベントの処理

#### インフラストラクチャ層
- ✅ **アダプター**: Chrome API、Google Calendar API
- ✅ **リポジトリ**: 認証情報、カレンダーイベント
- ✅ **ユーティリティ**: Logger、Retry Handler

### テスト実行方法

```bash
# 全テスト実行
cd FRONTEND && npm test

# カバレッジ付き実行
cd FRONTEND && npm run test:coverage

# ウォッチモード（開発用）
cd FRONTEND && npm run test:watch

# 特定のテストファイルのみ実行
cd FRONTEND && npm test -- --testPathPattern="auth"
```

### テストカバレッジの確認

```bash
# カバレッジレポート生成
npm run test:coverage

# HTMLレポートを開く
open coverage/lcov-report/index.html
```

カバレッジレポートでは、以下を確認できます：
- ファイルごとのカバレッジ率
- 未カバーの行番号
- ブランチカバレッジの詳細

## Chrome拡張機能特有のテストアプローチ

### Chrome APIのモック

Chrome拡張機能では `chrome.storage`, `chrome.tabs`, `chrome.identity` 等のAPIを使用しますが、これらはNode.js環境では利用できません。そのため、Jestのモック機能を使用します。

#### グローバルモックの設定

各テストファイルで個別にモックを設定：

```typescript
describe('Authentication Service', () => {
  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();

    // Chrome Storage APIのモック
    (chrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => callback({ authState: mockAuthState })
    );

    (chrome.storage.local.set as jest.Mock).mockImplementation(
      (items, callback) => callback()
    );
  });

  it('should save auth state', async () => {
    const authState = createAuthState();
    await saveAuthState(authState);

    expect(chrome.storage.local.set).toHaveBeenCalledWith({ authState });
  });
});
```

### Service Workerのテスト

Service Workerの直接的なライフサイクルテストは行わず、Service Workerが使用する機能を個別にテストします：

- **認証機能**: `authentication-service.test.ts`
- **ストレージ操作**: `auth-repository-impl.test.ts`
- **タブ操作**: `tab-capture-service.test.ts`
- **カレンダー操作**: `calendar-event-service.test.ts`

この方法により、実際のブラウザ環境に依存せずにロジックを検証できます。

### OAuth2フローのテスト

実際のGoogleログインは行わず、トークン取得・リフレッシュのロジックをテストします：

```typescript
describe('Token Refresh', () => {
  it('should refresh expired token', async () => {
    const expiredToken = {
      accessToken: 'old-token',
      tokenExpiry: Date.now() - 3600000, // 1時間前
    };

    // Chrome Identity APIのモック
    (chrome.identity.getAuthToken as jest.Mock).mockImplementation(
      (options, callback) => callback('new-token')
    );

    const newToken = await refreshToken(expiredToken);
    expect(newToken.accessToken).toBe('new-token');
  });
});
```

### エッジケースのテスト

Chrome拡張機能では、以下のエッジケースも考慮します：

#### 1. 空のストレージ
```typescript
it('should handle empty storage gracefully', async () => {
  (chrome.storage.local.get as jest.Mock).mockImplementation(
    (keys, callback) => callback({})
  );

  const authState = await getAuthState();
  expect(authState.isAuthenticated).toBe(false);
});
```

#### 2. 破損したデータ
```typescript
it('should handle corrupted storage data', async () => {
  (chrome.storage.local.get as jest.Mock).mockImplementation(
    (keys, callback) => callback({ authState: 'invalid-json' })
  );

  await expect(getAuthState()).rejects.toThrow();
});
```

#### 3. トークンの有効期限切れ
```typescript
it('should treat expired tokens as unauthenticated', async () => {
  const expiredAuth = {
    userId: 'test-user',
    isAuthenticated: true,
    accessToken: 'expired-token',
    tokenExpiry: Date.now() - 3600000,
  };

  (chrome.storage.local.get as jest.Mock).mockImplementation(
    (keys, callback) => callback({ authState: expiredAuth })
  );

  const authState = await getAuthState();
  expect(authState.isAuthenticated).toBe(false);
});
```

## テストのベストプラクティス

### 1. テストは独立して実行可能に

各テストは他のテストに依存せず、単独で実行できるようにします。

```typescript
describe('My Feature', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    jest.clearAllMocks();
  });

  it('test case 1', () => {
    // 独立したテスト
  });

  it('test case 2', () => {
    // test case 1に依存しない
  });
});
```

### 2. モックは最小限に

必要最小限のモックのみを使用し、実際のロジックをテストします。過度なモックはテストの価値を下げます。

### 3. テスト名は明確に

```typescript
// ✅ 良い例
it('should return unauthenticated state when token is expired', () => {});

// ❌ 悪い例
it('works', () => {});
it('test1', () => {});
```

### 4. エッジケースもテスト

正常系だけでなく、エラーケースもテストします：
- 空のデータ
- null や undefined
- 期限切れトークン
- ネットワークエラー
- API制限エラー

### 5. AAAパターンを使用

テストは Arrange-Act-Assert パターンで構造化します：

```typescript
it('should save auth state', async () => {
  // Arrange: テストデータの準備
  const authState = createAuthState();

  // Act: 実行
  await saveAuthState(authState);

  // Assert: 検証
  expect(chrome.storage.local.set).toHaveBeenCalledWith({ authState });
});
```

## 将来の拡張計画（Phase 2）

### E2Eテストの追加

**現状**: ユニットテストで品質を十分に保証（625テスト、90/100点）

**Phase 2での追加**（必要性が高まった場合）:

#### 実装ツール
- **Puppeteer**: Chrome拡張機能対応が最も優れている

#### テストシナリオ（優先度順）

##### 1. 煙テスト（Smoke Test）- 優先度：高
```javascript
describe('Extension Loading', () => {
  it('should load extension without errors', async () => {
    // 拡張機能を読み込んで、コンソールエラーがないことを確認
  });

  it('should open sidepanel', async () => {
    // サイドパネルが開けることを確認
  });
});
```

##### 2. 認証フロー - 優先度：中
```javascript
describe('Authentication Flow', () => {
  it('should authenticate with Google', async () => {
    // OAuth2フローの完全なテスト
    // ただし、テスト用の認証情報が必要
  });

  it('should persist authentication state', async () => {
    // 認証状態が永続化されることを確認
  });
});
```

##### 3. コア機能 - 優先度：中
```javascript
describe('Tab Capture and Restore', () => {
  it('should capture current tabs', async () => {
    // タブ情報の取得をテスト
  });

  it('should save work state to Google Calendar', async () => {
    // Google Calendar APIとの連携をテスト
  });

  it('should restore saved tabs', async () => {
    // タブの復元をテスト
  });
});
```

#### 実装判断基準

以下の条件が揃ったら実装を検討：
- ユニットテストで検出できないバグが頻発
- 手動テストに1時間以上かかる
- リグレッションテストが必要な規模に成長

#### 見積もり
- セットアップ: 1-2日
- テストケース作成: 3-5日
- メンテナンス: 継続的

### E2E実装のセットアップ例

```javascript
// e2e/setup.js
const puppeteer = require('puppeteer');
const path = require('path');

const extensionPath = path.join(__dirname, '../dist');

describe('Chrome Extension E2E', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should load extension', async () => {
    // 拡張機能のテスト
  });
});
```

## トラブルシューティング

### テスト失敗時の対処

#### 1. ローカルで再現
```bash
# 失敗したテストをローカルで実行
npm test

# 特定のテストのみ実行
npm test -- --testPathPattern="failing-test"
```

#### 2. カバレッジが閾値未満の場合
```bash
# カバレッジレポート生成
npm run test:coverage

# HTMLレポートで未カバー箇所を確認
open coverage/lcov-report/index.html
```

未カバーの箇所を特定し、追加のテストケースを作成します。

#### 3. モックが正しく動作しない場合
```typescript
// モックの動作を確認
console.log((chrome.storage.local.get as jest.Mock).mock.calls);

// モックがリセットされているか確認
beforeEach(() => {
  jest.clearAllMocks();
});
```

### よくある問題

#### 問題1: Chrome APIが undefined
**原因**: モックが設定されていない
**解決策**: テストファイルの beforeEach でモックを設定

#### 問題2: 非同期テストがタイムアウト
**原因**: Promise が解決されない
**解決策**: async/await を使用し、モックのコールバックを確認

#### 問題3: カバレッジが低い
**原因**: エッジケースがテストされていない
**解決策**: 正常系だけでなく、エラーケースもテスト

## まとめ

- **現在**: 625個のユニットテストで90/100点の品質を達成
- **カバレッジ**: 全ての閾値をクリア
- **Chrome API**: 適切にモック化されている
- **将来**: 必要に応じてE2Eテストを追加

task_bookmark Chrome拡張機能は、包括的なテスト戦略により高品質を保証しています。
