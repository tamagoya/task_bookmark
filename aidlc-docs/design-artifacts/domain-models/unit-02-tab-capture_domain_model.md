# Domain Model: Unit 2 - タブ状態キャプチャ

## 概要
本ドキュメントは、Unit 2（タブ状態キャプチャ）のDomain Modelを定義します。Domain-Driven Design原則に基づいて、タブ情報取得ドメインのビジネスロジックをインフラストラクチャから独立してモデル化しています。

## ドメインの境界
タブ状態キャプチャドメインは、単一ウィンドウまたはすべてのChromeウィンドウで開いているタブの情報を取得し、構造化することを担当します。Chrome Tabs APIやChrome Windows APIなどのインフラストラクチャの詳細は含みません。取得したタブ情報は、Unit 3（Calendar API連携）で使用されます。保存成功後の「保存対象タブの一括閉じ」「新規ウィンドウ（新しいタブ1つ）の表示」は、アプリケーション層でインフラを利用して実現します。

## 設計方針
Unit 2は比較的シンプルなドメインであり、以下の設計方針を採用します：
- **Aggregateは不要**: タブ情報の取得のみで、永続化や複雑な状態管理は不要
- **Value Objects中心**: タブ情報は不変なValue Objectとして表現
- **Domain Events**: タブ情報取得完了時にイベントを発行
- **Factories**: Chrome Tabs APIのデータからドメインオブジェクトへの変換を担当

---

## Value Objects

### TabInfo

タブ情報を表すValue Objectです。不変性を保証し、タブのURL、タイトル、ファビコン、順序などの情報を保持します。

#### 属性
- `url: string` - タブのURL（必須）
- `title: string` - タブのタイトル（必須）
- `faviconUrl: string | undefined` - ファビコンURL（任意）
- `index: number` - タブの順序（必須、0から始まる連番）
- `extensions: Record<string, unknown> | undefined` - 拡張フィールド（任意、将来の拡張用）

#### 不変性
- 作成後は変更不可
- 等価性はすべての属性で判定

#### バリデーション
1. **URLの検証**:
   - 空文字列は許可しない
   - 有効なURL形式である必要がある（簡易チェック: `http://`または`https://`で始まる、または`chrome://`、`chrome-extension://`などの特殊スキーム）
   - 最大長: 2048文字（URLの一般的な制限）

2. **タイトルの検証**:
   - 空文字列は許可しない（ただし、空白文字のみは許可する可能性がある）
   - 最大長: 500文字（実用的な上限）

3. **インデックスの検証**:
   - 0以上の整数である必要がある
   - 負の数は許可しない

4. **ファビコンURLの検証**:
   - 空文字列の場合は`undefined`として扱う
   - 有効なURL形式である必要がある（任意フィールドのため、検証エラー時は`undefined`として扱う）

#### メソッド
- `equals(other: TabInfo): boolean`
  - 等価性チェック
  - すべての属性が等しい場合に`true`を返す

#### 使用例
```typescript
const tabInfo = TabInfo.create({
  url: 'https://example.com',
  title: 'Example Page',
  faviconUrl: 'https://example.com/favicon.ico',
  index: 0
});
```

---

## Domain Events

### TabsCaptured

タブ情報が取得された時に発行されるDomain Eventです。

#### ペイロード
- `tabs: TabInfo[]` - 取得されたタブ情報の配列
- `windowId: number` - タブが取得されたウィンドウID。**全ウィンドウから取得した場合は `0` とする**（複数ウィンドウにまたがるため単一の windowId で表さない）
- `capturedAt: Date` - 取得日時
- `tabCount: number` - 取得されたタブの数（`tabs.length`と等しい）

#### 発生タイミング
- タブ情報の取得が正常に完了した時（現在のウィンドウのみ、または全ウィンドウ）
- エラーが発生した場合は発行しない（エラーイベントを別途発行）

#### ビジネスルール
- `tabs`配列は空であってはならない（少なくとも1つのタブが必要）
- `windowId`は 0 以上の整数である必要がある。0 は「全ウィンドウから取得した」ことを表す。1以上は単一ウィンドウのID
- `capturedAt`は現在時刻または過去の時刻である必要がある（未来の時刻は許可しない）

#### 使用例
```typescript
const event = new TabsCaptured(
  [tabInfo1, tabInfo2, tabInfo3],
  12345,
  new Date()
);
```

---

## Factories

### TabInfoFactory

TabInfoの作成を担当するFactoryです。Chrome Tabs APIのデータからTabInfo Value Objectを作成し、バリデーションを行います。

#### ファクトリメソッド

##### `createFromChromeTab(chromeTab: chrome.tabs.Tab): TabInfo`

Chrome Tabs APIの`Tab`オブジェクトからTabInfoを作成します。

**パラメータ**:
- `chromeTab: chrome.tabs.Tab` - Chrome Tabs APIのタブオブジェクト

**戻り値**:
- `TabInfo` - 作成されたTabInfo Value Object

**バリデーション**:
- `chromeTab.url`が存在し、有効なURL形式である必要がある
- `chromeTab.title`が存在し、空文字列でない必要がある
- `chromeTab.index`が存在し、0以上の整数である必要がある
- `chromeTab.favIconUrl`は任意（存在しない場合は`undefined`）

**エラーハンドリング**:
- URLが無効な場合: `Error('Invalid URL')`を投げる
- タイトルが空の場合: `Error('Title cannot be empty')`を投げる
- インデックスが無効な場合: `Error('Invalid tab index')`を投げる

**使用例**:
```typescript
const chromeTab = await chrome.tabs.get(tabId);
const tabInfo = TabInfoFactory.createFromChromeTab(chromeTab);
```

##### `createFromRawData(data: { url: string; title: string; faviconUrl?: string; index: number; extensions?: Record<string, unknown> }): TabInfo`

生のデータからTabInfoを作成します（主にテストや既存データからの復元用）。

**パラメータ**:
- `data: { url: string; title: string; faviconUrl?: string; index: number; extensions?: Record<string, unknown> }` - タブ情報の生データ

**戻り値**:
- `TabInfo` - 作成されたTabInfo Value Object

**バリデーション**:
- `createFromChromeTab`と同じバリデーションルールを適用

**使用例**:
```typescript
const tabInfo = TabInfoFactory.createFromRawData({
  url: 'https://example.com',
  title: 'Example Page',
  faviconUrl: 'https://example.com/favicon.ico',
  index: 0
});
```

---

## ビジネスルール

### タブ情報に関するルール

1. **必須フィールド**:
   - URLとタイトルは必須
   - インデックスは必須（0以上の整数）

2. **任意フィールド**:
   - ファビコンURLは任意（取得できない場合もある）
   - 拡張フィールドは任意（将来の拡張用）

3. **順序の保持**:
   - タブの順序（index）は0から始まる連番である必要がある
   - 順序は取得時の順序を保持する

4. **URLの形式**:
   - 有効なURL形式である必要がある
   - 特殊スキーム（`chrome://`、`chrome-extension://`など）も許可

### タブ取得に関するルール

1. **ウィンドウの範囲**:
   - 現在のウィンドウのタブのみを取得する
   - 複数のウィンドウが開いている場合、アクティブなウィンドウのタブのみを取得

2. **順序の保持**:
   - タブの順序は取得時の順序を保持する
   - インデックスは0から始まる連番

3. **パフォーマンス要件**:
   - 最大20タブの取得を500ms以内で完了する必要がある（NFR-001）
   - 大量のタブがある場合、段階的な取得を検討する

4. **エラーハンドリング**:
   - タブ取得エラー時、エラーメッセージを表示する
   - ファビコン取得エラー時、デフォルトアイコンを使用する
   - 権限エラー時、ユーザーに権限の許可を促す

### エラーハンドリングに関するルール

1. **タブ取得エラー**:
   - エラーメッセージを表示し、再試行ボタンを提供
   - 部分的に取得できた場合は、取得できたタブのみを表示

2. **ファビコン取得エラー**:
   - デフォルトアイコンを表示
   - エラーを無視して処理を続行

3. **権限エラー**:
   - ユーザーに権限の許可を促す
   - 権限が許可されるまで、タブ情報の取得をブロック

---

## 他のUnitsとのインターフェース

### Unit 3 (Calendar API連携)
- **提供**: `TabInfo[]` - タブ情報の配列を提供
- **使用**: `WorkStateMetadata`が`TabInfo[]`を使用してタブ情報を保持

### Unit 4 (状態復元)
- **提供**: `TabInfo`の構造を参照
- **使用**: 復元時に`TabInfo`の構造を使用してタブを復元

### Unit 5 (UI/UX)
- **提供**: `TabInfo[]` - UI表示用のタブ情報を提供
- **使用**: サイドパネルでタブ一覧を表示

---

## 実装上の注意事項

### パフォーマンス最適化

1. **並列取得**:
   - 複数のタブ情報を取得する場合、可能な限り並列に取得する
   - Chrome Tabs APIの`chrome.tabs.query`を使用して一括取得

2. **キャッシュ**:
   - タブ情報のキャッシュは最小限に（メモリ使用量を抑制）
   - 取得直後の情報のみをキャッシュ（古い情報は無効）

3. **段階的な取得**:
   - 大量のタブ（20個以上）がある場合、段階的に取得を検討
   - ただし、パフォーマンス要件（500ms以内）を満たす必要がある

### エラーハンドリング

1. **部分的な取得**:
   - 一部のタブ情報の取得に失敗した場合、取得できたタブのみを返す
   - エラーを記録し、ユーザーに通知

2. **リトライ**:
   - 一時的なエラー（ネットワークエラーなど）の場合、リトライを試みる
   - 永続的なエラー（権限エラーなど）の場合、ユーザーに通知

### 拡張性

1. **extensionsフィールド**:
   - `TabInfo`に`extensions`フィールドを追加し、将来の拡張に対応
   - Unit 3の拡張性パターンに合わせる

2. **バージョニング**:
   - 将来的に`TabInfo`の構造が変更される可能性がある場合、バージョニングを検討
   - 現時点では、`extensions`フィールドで対応可能

---

## ドメインモデル図

```
┌─────────────────────────────────────────┐
│         Tab Capture Domain              │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐                      │
│  │  TabInfo     │  (Value Object)      │
│  │  - url       │                      │
│  │  - title     │                      │
│  │  - faviconUrl│                      │
│  │  - index     │                      │
│  │  - extensions│                      │
│  └──────────────┘                      │
│           │                            │
│           │ creates                    │
│           ▼                            │
│  ┌──────────────┐                      │
│  │TabInfoFactory│  (Factory)           │
│  │  - createFrom│                      │
│  │    ChromeTab │                      │
│  │  - createFrom│                      │
│  │    RawData   │                      │
│  └──────────────┘                      │
│           │                            │
│           │ emits                      │
│           ▼                            │
│  ┌──────────────┐                      │
│  │TabsCaptured  │  (Domain Event)      │
│  │  - tabs      │                      │
│  │  - windowId  │                      │
│  │  - capturedAt│                      │
│  └──────────────┘                      │
│                                         │
└─────────────────────────────────────────┘
```

---

## まとめ

Unit 2のドメインモデルは、シンプルで明確な設計となっています：

1. **TabInfo Value Object**: タブ情報を不変なValue Objectとして表現
2. **TabsCaptured Domain Event**: タブ情報取得完了時にイベントを発行
3. **TabInfoFactory**: Chrome Tabs APIのデータからドメインオブジェクトへの変換を担当

この設計により、タブ情報の取得と構造化を、インフラストラクチャから独立して表現できます。また、Unit 3で既に参照されている`TabInfo`の完全な定義を提供し、システム全体の一貫性を保ちます。

---

**作成日**: 2026-01-22  
**最終更新**: 2026-01-22  
**ステータス**: 設計完了
