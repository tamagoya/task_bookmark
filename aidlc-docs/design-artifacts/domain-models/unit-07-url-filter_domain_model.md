# Domain Model: Unit 7 - 無視URL設定（URL Filter）

## 概要
本ドキュメントは、Unit 7（無視URL設定）の Domain Model を定義します。Domain-Driven Design 原則に基づき、無視URLルールのビジネスロジックをインフラストラクチャ（Chrome Storage API）から独立してモデル化しています。

## ドメインの境界
無視URLドメインは、ユーザーが定義する「URLの部分一致パターンと3つの独立した無視フラグの集合」を管理し、各タイミング（保存・閉じ・復元）における判定を提供することを担当します。Chrome Storage API などのインフラ詳細は含みません。

## 設計方針
- **Aggregate**: 全ルールの集合を1つの Aggregate Root として扱い、重複・上限・整合性を集約レベルで保証する
- **Value Objects**: ルール本体（IgnoreRule）とその構成要素（IgnorePattern, IgnoreFlags）を不変オブジェクトとして表現
- **Domain Events**: ルールの追加・更新・削除・有効化変更を Domain Event として発行（既存のイベントハンドラに統合可能）
- **Factories**: 新規ルール作成時のID生成・タイムスタンプ付与・バリデーションを集約

---

## Value Objects

### IgnorePattern

URLパターン文字列を表す Value Object。

#### 属性
- `value: string` — トリム済み・1〜2048文字のパターン

#### 不変性
- 作成後変更不可
- 等価性は `value` の完全一致で判定

#### バリデーション
1. **長さ**: trim 後 1〜2048文字
2. **空白のみ拒否**: trim 後の長さが0なら例外
3. **マッチ方式**: `substring`（URL中の部分一致）一本化（ADR-030）

#### メソッド
- `matches(url: string): boolean` — `url.includes(this.value)` を返す
- `equals(other: IgnorePattern): boolean`

#### 使用例
```typescript
const pattern = IgnorePattern.create('meet.google.com');
pattern.matches('https://meet.google.com/abc-defg-hij'); // true
```

---

### IgnoreFlags

3つの無視フラグの組合せを表す Value Object。

#### 属性
- `ignoreOnSave: boolean`
- `ignoreOnClose: boolean`
- `ignoreOnRestore: boolean`

#### 不変性
- 作成後変更不可
- 等価性は3フラグすべての一致で判定

#### バリデーション
- 少なくとも1つが `true` でなければならない（全 false は無効）

#### メソッド
- `hasAnyFlag(): boolean` — 1つでも `true` なら `true`
- `equals(other: IgnoreFlags): boolean`

#### 使用例
```typescript
const flags = IgnoreFlags.create({
  ignoreOnSave: false,
  ignoreOnClose: true,
  ignoreOnRestore: true,
}); // Meet ユースケース
```

---

### IgnoreRule

1件の無視URLルールを表す Value Object（または小さな Entity 扱いも可）。

#### 属性
- `id: string` — 内部ID（uuid v4 等）
- `pattern: IgnorePattern`
- `flags: IgnoreFlags`
- `label: string | undefined` — 表示名（任意、最大100文字）
- `enabled: boolean` — ルール有効/無効
- `createdAt: Date`
- `updatedAt: Date`

#### 不変性
- 作成後変更不可。「更新」は新インスタンスを返す（既存コーディングスタイル準拠）

#### バリデーション
- `id` は空でない文字列
- `label` は省略可、指定時は最大100文字
- `pattern` と `flags` のバリデーションを満たすこと（VOで保証）

#### メソッド
- `matches(url: string): boolean` — `enabled === true && pattern.matches(url)`
- `appliesOnSave(url: string): boolean` — `matches(url) && flags.ignoreOnSave`
- `appliesOnClose(url: string): boolean` — `matches(url) && flags.ignoreOnClose`
- `appliesOnRestore(url: string): boolean` — `matches(url) && flags.ignoreOnRestore`
- `withLabel(label: string | undefined): IgnoreRule`
- `withFlags(flags: IgnoreFlags): IgnoreRule`
- `withEnabled(enabled: boolean): IgnoreRule`
- `equals(other: IgnoreRule): boolean`

---

## Aggregate

### IgnoreRulesAggregate (Aggregate Root)

無視URLルールの集合を表す Aggregate Root。重複検出、上限管理、判定の集約点を提供する。

#### 属性
- `rules: IgnoreRule[]` — ルールの配列（イミュータブル）
- `schemaVersion: number = 1`

#### 不変条件
1. ルール総数 ≤ 100（ADR/NFR）
2. 同一 `pattern.value`（trim 後）を持つルールは集合内に1件のみ
3. 各 `IgnoreRule.flags` は少なくとも1つが `true`

#### 主要メソッド
- `static empty(): IgnoreRulesAggregate`
- `add(rule: IgnoreRule): IgnoreRulesAggregate`
  - 重複チェック → 上限チェック → 新インスタンスを返す
- `update(id: string, updater: (rule: IgnoreRule) => IgnoreRule): IgnoreRulesAggregate`
- `remove(id: string): IgnoreRulesAggregate`
- `setEnabled(id: string, enabled: boolean): IgnoreRulesAggregate`
- `find(id: string): IgnoreRule | undefined`
- `list(): readonly IgnoreRule[]`
- `findIgnoredOnSave(url: string): IgnoreRule | undefined`
- `findIgnoredOnClose(url: string): IgnoreRule | undefined`
- `findIgnoredOnRestore(url: string): IgnoreRule | undefined`
- `isIgnoredOnSave(url: string): boolean`
- `isIgnoredOnClose(url: string): boolean`
- `isIgnoredOnRestore(url: string): boolean`

#### イベント発行
- `add` 成功時 → `IgnoreRuleAdded`
- `update` 成功時 → `IgnoreRuleUpdated`
- `remove` 成功時 → `IgnoreRuleRemoved`
- `setEnabled` で `enabled` が変化した時 → `IgnoreRuleEnabledChanged`

---

## Domain Events

### IgnoreRuleAdded
**ペイロード**: `{ rule: IgnoreRule, addedAt: Date }`

### IgnoreRuleUpdated
**ペイロード**: `{ before: IgnoreRule, after: IgnoreRule, updatedAt: Date }`

### IgnoreRuleRemoved
**ペイロード**: `{ removedRule: IgnoreRule, removedAt: Date }`

### IgnoreRuleEnabledChanged
**ペイロード**: `{ ruleId: string, enabled: boolean, changedAt: Date }`

---

## Factories

### IgnoreRuleFactory

新規ルール作成時に `id`・`createdAt`・`updatedAt` を生成し、Value Object を組み立てる。

#### ファクトリメソッド

##### `create(input: { pattern: string; ignoreOnSave: boolean; ignoreOnClose: boolean; ignoreOnRestore: boolean; label?: string; enabled?: boolean }): IgnoreRule`
- `id` は uuid v4 等で新規発番
- `createdAt`, `updatedAt` は現在時刻
- `enabled` 省略時は `true`
- VOバリデーションを通す（pattern 空 / 全フラグ false / label 長すぎ などは例外）

##### `fromPersisted(data: PersistedIgnoreRuleDTO): IgnoreRule`
- `chrome.storage.local` から復元する用途
- 厳密にバリデーションを通す（壊れたデータは例外、Repository 側でログ＆スキップ）

### IgnoreRulesAggregateFactory

##### `fromPersisted(data: PersistedIgnoreRulesDTO): IgnoreRulesAggregate`
- 永続化されたDTOから集約全体を復元
- ルール配列のうち復元失敗したものはログを残してスキップ
- 復元後の集約が不変条件（重複・上限）を満たすかチェック

---

## ビジネスルール

### ルール集合に関するルール
1. **重複禁止**: 同一 `pattern.value`（trim 後）のルールは集合内に1件のみ
2. **上限**: 100件
3. **少なくとも1フラグ true**: 全フラグ false のルールは作成・更新ともに不可

### マッチング判定に関するルール
1. **マッチ方式**: `String.prototype.includes()` による単純な部分一致のみ（ADR-030）
2. **無効ルールは作用しない**: `enabled === false` のルールはどの判定でも `false` を返す
3. **適用ポイントの独立性**: 3フラグはそれぞれ独立に作用する。例えば `ignoreOnClose=true, ignoreOnSave=false, ignoreOnRestore=false` のルールは「保存はする、閉じない、復元はする」という挙動になる
4. **WorkState 不変原則**: 復元時の `ignoreOnRestore` フィルタは、新規ウィンドウに開くタブだけに作用し、カレンダー上に保存された WorkState 自体は変更しない（履歴保持）

### 後方互換性に関するルール
1. **空集合フォールバック**: `IgnoreRulesAggregate.empty()` は判定すべて `false` を返す。これにより、ルール未登録時は従来挙動と完全一致する
2. **読み込み失敗時のフォールバック**: Repository は読み込み失敗時に空集合を返す（ユーザー操作を妨げない）

---

## 他のUnitsとのインターフェース

### Unit 2 (タブキャプチャ)
- **提供**: `IgnoreRulesAggregate` の判定 API
- **使用**: `getAllWindowsTabs()` 後の `ignoreOnSave` フィルタ、`closeAllCapturedTabs` 前の `ignoreOnClose` フィルタ

### Unit 4 (状態復元)
- **提供**: `IgnoreRulesAggregate` の判定 API
- **使用**: `restoreWorkState()` 内の `ignoreOnRestore` フィルタ

### Unit 5 (UI/UX)
- **提供**: `IgnoreRulesService` の CRUD API
- **使用**: 設定セクションでルールの追加・編集・削除・有効化トグル

---

## 実装上の注意事項

### イミュータビリティ
- すべての Value Object と Aggregate は不変。「変更」操作は新インスタンスを返す
- 既存コーディングスタイルガイド（CLAUDE.md）に準拠

### バリデーション
- VO の `create()` でバリデーションを完結させる（外部バリデーション層を作らない）
- バリデーションエラーは専用例外型を使うか、Result 型のようなパターンを既存コードに合わせる

### パフォーマンス
- マッチング判定は `O(rules × tabs)` だが、`String.includes()` は十分高速
- ルール上限100件、タブ50件で5,000回判定 ≪ 50ms

### XSS 対策
- ドメイン層自体は表示と無関係だが、`label` `pattern` は UI 側で必ず `textContent` で表示する旨を Unit-5 側に明記済み

### スキーマバージョニング
- Aggregate は `schemaVersion: 1` を保持し、永続化フォーマットの将来変更に備える

---

## ドメインモデル図（テキスト）

```
[IgnoreRulesAggregate (Aggregate Root)]
  └── rules: IgnoreRule[]
       └── pattern: IgnorePattern (VO)
       └── flags:   IgnoreFlags (VO)
       └── label?:  string
       └── enabled: boolean
       └── createdAt / updatedAt: Date

[Domain Events]
  ├── IgnoreRuleAdded
  ├── IgnoreRuleUpdated
  ├── IgnoreRuleRemoved
  └── IgnoreRuleEnabledChanged

[Factories]
  ├── IgnoreRuleFactory
  └── IgnoreRulesAggregateFactory

[Repository (interface, ドメイン層で定義)]
  └── IgnoreRuleRepository
       ├── load(): Promise<IgnoreRulesAggregate>
       └── save(aggregate): Promise<void>
```

---

**作成日**: 2026-05-28
**最終更新**: 2026-05-28
**ステータス**: 設計完了
**関連**: Unit-7 Unit定義、ADR-030〜032、`modification_analysis_20260528_url_filter.md`
