# Unit 7: 無視URL設定（URL Filter）

## 概要
ユーザーが登録した「無視URLルール」を管理し、保存・閉じ・復元の各タイミングでURLマッチング判定を提供するUnitです。フィードバック（`request/20260528_feedback.md`）に基づく実用上の課題（Meet通話タブの自動クローズ、SPA/ポータルURLのノイズ）に対応します。

## 責任範囲
- 無視URLルールのドメインモデル定義（Value Object / Aggregate）
- 無視URLルールの永続化（`chrome.storage.local`）
- ルールのCRUD API提供（追加・編集・削除・一覧・有効化/無効化）
- URLマッチング判定（`substring` 一本化）
- 3つの無視フラグ（`ignoreOnSave` / `ignoreOnClose` / `ignoreOnRestore`）に対する判定の提供
- バリデーション（pattern、フラグ少なくとも1つ true、重複、上限100件）

## 関連User Stories
- **US-10**: 無視URL設定によるタブの除外制御（メインストーリー）
- **US-3**: 仕事状態の保存（`ignoreOnSave`/`ignoreOnClose` のフィルタ点）
- **US-5**: 仕事状態の復元（`ignoreOnRestore` のフィルタ点）

## 入力
- ユーザーのCRUD操作（サイドパネルの設定セクション経由）
- 各Unit（Unit-2、Unit-4）からの判定リクエスト（`isIgnoredOnSave(url)` 等）

## 出力
- ルール一覧（`IgnoreRule[]`）
- 単一ルールの取得・追加・更新・削除
- マッチング判定結果（boolean）

## 主要コンポーネント

### 1. IgnoreRule（Value Object）
**責任**: 1件の無視URLルールを表す不変オブジェクト

**フィールド**:
```typescript
interface IgnoreRule {
  id: string;            // 内部ID（uuid v4）
  pattern: string;       // URL の部分一致パターン（trim 済み、1〜2048文字）
  ignoreOnSave: boolean;
  ignoreOnClose: boolean;
  ignoreOnRestore: boolean;
  label?: string;        // 表示名（任意、最大100文字）
  enabled: boolean;
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
}
```

**バリデーション**:
- `pattern`: trim 後 1〜2048 文字
- 3フラグの少なくとも1つが `true`
- `label` は最大100文字（任意）

**メソッド**:
- `matches(url: string): boolean` — `enabled === true && url.includes(pattern)`
- `equals(other: IgnoreRule): boolean`

### 2. IgnorePattern / IgnoreFlags（Value Object 候補）
**責任**: `pattern` と「3つの無視フラグの組合せ」をそれぞれ独立した不変VOにする
（実装簡素化のため、Aggregate 内のプリミティブとしても可）

### 3. IgnoreRulesAggregate（Aggregate Root）
**責任**: 全ルールの集合を管理。重複チェック、上限管理、判定の集約。

**主要メソッド**:
- `add(rule: IgnoreRule): IgnoreRulesAggregate` — 重複・上限チェック後に新インスタンスを返す（イミュータブル）
- `update(id: string, partial: Partial<IgnoreRule>): IgnoreRulesAggregate`
- `remove(id: string): IgnoreRulesAggregate`
- `setEnabled(id: string, enabled: boolean): IgnoreRulesAggregate`
- `list(): IgnoreRule[]` — 一覧取得（不変コピーを返す）
- `findIgnoredOnSave(url: string): IgnoreRule | undefined`
- `findIgnoredOnClose(url: string): IgnoreRule | undefined`
- `findIgnoredOnRestore(url: string): IgnoreRule | undefined`
- `isIgnoredOnSave(url: string): boolean`
- `isIgnoredOnClose(url: string): boolean`
- `isIgnoredOnRestore(url: string): boolean`

### 4. IgnoreRuleRepository（インターフェース）
**責任**: 永続化抽象。ドメイン層で定義し、インフラ層で実装する。

**主要メソッド**:
- `load(): Promise<IgnoreRulesAggregate>`
- `save(aggregate: IgnoreRulesAggregate): Promise<void>`

### 5. ChromeStorageIgnoreRulesRepository（インフラ層実装）
**責任**: `chrome.storage.local` キー `ignoreRulesV1` に対する読み書き

**ストレージスキーマ**:
```json
{
  "ignoreRulesV1": {
    "schemaVersion": 1,
    "rules": [/* IgnoreRule[] */]
  }
}
```

**振る舞い**:
- 読み込み失敗・パース失敗時は空のAggregateを返し、ログにエラー記録
- 書き込みは全件置換

### 6. IgnoreRulesService（Application Service）
**責任**: ユースケースの集約。サイドパネル/Service Worker から呼ばれる窓口

**主要メソッド**:
- `list(): Promise<IgnoreRule[]>`
- `add(input: AddIgnoreRuleInput): Promise<IgnoreRule>`（バリデーション含む）
- `update(id: string, input: UpdateIgnoreRuleInput): Promise<IgnoreRule>`
- `remove(id: string): Promise<void>`
- `setEnabled(id: string, enabled: boolean): Promise<void>`
- `filterTabsForSave(tabs: TabInfo[]): Promise<{ kept: TabInfo[]; ignored: TabInfo[] }>`
- `filterTabIdsForClose(tabs: TabInfo[]): Promise<{ keepCloseTargets: number[]; keepOpenTabs: TabInfo[] }>`
- `filterTabsForRestore(tabs: TabInfo[]): Promise<{ kept: TabInfo[]; ignored: TabInfo[] }>`

**依存関係**:
- `IgnoreRuleRepository`（読み込み）
- ドメイン層（`IgnoreRulesAggregate`, `IgnoreRule`）

## 技術スタック
- **言語**: TypeScript
- **API**: Chrome Storage API（`chrome.storage.local`）
- **テスト**: Jest + Chrome API モック

## データフロー（CRUD）
1. ユーザーがサイドパネルの設定セクションでルールを操作
2. `IgnoreRulesService` のメソッドを呼ぶ（add/update/remove/setEnabled）
3. リポジトリから現状の Aggregate を読み、操作後の Aggregate を計算
4. リポジトリで保存（`chrome.storage.local`）

## データフロー（判定: 保存時）
1. Service Worker の `SAVE_WORK_STATE` ハンドラが起動
2. `TabCaptureService.getAllWindowsTabs()` でタブ取得
3. `IgnoreRulesService.filterTabsForSave(tabs)` で `ignoreOnSave` 適用 → WorkState 作成
4. 保存成功後、`IgnoreRulesService.filterTabIdsForClose(tabs)` で `ignoreOnClose` 適用 → 閉じる
5. 既存どおり 新規ウィンドウ作成、サイドパネル維持

## データフロー（判定: 復元時）
1. Service Worker の `RESTORE_WORK_STATE` ハンドラが起動
2. WorkState を取得
3. `IgnoreRulesService.filterTabsForRestore(workState.tabs)` で `ignoreOnRestore` 適用
4. 結果が0件なら新規ウィンドウを作らずUIへ警告
5. それ以外は既存どおり段階的にタブを復元

## エラーハンドリング
- **ストレージ読み込み失敗**: 空のAggregate（ルール0件）として動作。ログにエラー記録
- **ストレージ書き込み失敗**: ユーザーにエラー表示、UI状態は更新前にロールバック
- **バリデーションエラー**: 専用のエラー型を返し、UIで日本語メッセージ表示

## パフォーマンス要件
- マッチング判定: 100ルール × 50タブで **追加コスト 50ms 以内**（NFR-1.1）
- CRUD UI操作: **200ms以内** にUI反映（NFR-1.1）
- ストレージ容量: ルール100件で約25KB（`chrome.storage.local` の制限 5MB に対し十分小さい）

## テスト戦略
- **ユニットテスト**:
  - `IgnoreRule` のバリデーション・等価性
  - `IgnoreRulesAggregate` の add/update/remove/setEnabled の不変性
  - 重複検出、上限超過の例外
  - URLマッチング（`substring` 部分一致）の境界条件
  - 3フラグそれぞれの判定（独立性検証）
- **統合テスト**:
  - `chrome.storage.local` のモック越しに CRUD と読み書き整合性
  - Unit-2/Unit-4 と組み合わせた保存・復元フロー
- **テストケース例**:
  - Meet ユースケース: `meet.google.com` を ignoreOnClose+ignoreOnRestore で登録 → 保存対象に含まれる、閉じない、復元時に開かれない
  - ポータル ユースケース: `portal.example.com` を ignoreOnSave で登録 → WorkState に含まれない
  - ルール無効化: `enabled=false` のルールはどのフラグも作用しない

## 依存関係
- **外部依存**: Chrome Storage API
- **内部依存**: なし（独立した Unit、ドメインのみ）

## 他のUnitsとのインターフェース
- **Unit-2 (タブキャプチャ)**: 保存処理から `filterTabsForSave` / `filterTabIdsForClose` を呼ばれる
- **Unit-4 (状態復元)**: 復元処理から `filterTabsForRestore` を呼ばれる
- **Unit-5 (UI/UX)**: 設定セクションから CRUD API（`list/add/update/remove/setEnabled`）を呼ばれる

## 実装の優先順位
**優先度**: 高（実用上の主要課題、Chrome Web Store公開後の早期改善）

## リスク
- **RISK-016**: 無視URL設定の誤設定による意図せぬタブ除外（軽減策: 無効化トグル、ヘルプ表示、将来のプレビュー機能）
- **RISK-017**: ルール件数増加によるパフォーマンス劣化（軽減策: 上限100件、計測テスト）
- **RISK-018**: ストレージ破損によるルール喪失（軽減策: スキーマバージョニング、将来のエクスポート機能）

## 関連ADR
- **ADR-030**: 無視URL設定のマッチング方式（substring 一本化）
- **ADR-031**: 無視URL設定の永続化先（`chrome.storage.local`）
- **ADR-032**: 無視判定の適用ポイントとUI配置

## 成功基準
- [ ] `IgnoreRule` Value Object と `IgnoreRulesAggregate` がイミュータブルパターンで実装されている
- [ ] `chrome.storage.local` への永続化が正常に動作する
- [ ] CRUD API がすべて機能し、バリデーションが正しく行われる
- [ ] 3つの無視フラグが独立に判定できる
- [ ] ルール未登録時は判定がすべて `false` を返す（後方互換性）
- [ ] 100ルール × 50タブの判定が 50ms 以内で完了する
- [ ] ユニットテストのカバレッジが80%以上

---

**作成日**: 2026-05-28
**最終更新**: 2026-05-28
**ステータス**: 設計中（ユーザー承認済み・ウォーターフォール展開中）
**ソース**: `request/20260528_feedback.md`、`modification_analysis_20260528_url_filter.md`
