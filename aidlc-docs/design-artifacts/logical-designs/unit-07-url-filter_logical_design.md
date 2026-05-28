# Logical Design: Unit 7 - 無視URL設定（URL Filter）

## 概要
本ドキュメントは、Unit 7（無視URL設定）の Logical Design を定義します。Unit-7 の Domain Model（`unit-07-url-filter_domain_model.md`）を拡張し、NFRs を満たすためのアーキテクチャパターンを適用した実装可能な設計です。

## アーキテクチャパターン

### 採用したパターン
1. **レイヤードアーキテクチャ**: ドメイン層、アプリケーション層、インフラストラクチャ層の分離（既存Unit と整合）
2. **Service Layer パターン**: `IgnoreRulesService` によるユースケース集約
3. **Repository パターン**: `IgnoreRuleRepository` による永続化抽象化
4. **Aggregate パターン**: `IgnoreRulesAggregate` による集合の不変条件管理
5. **Factory パターン**: `IgnoreRuleFactory`, `IgnoreRulesAggregateFactory`
6. **Domain Events パターン**: 既存 EventHandler に統合可能なイベント発行

---

## レイヤー構造

### 1. ドメイン層 (Domain Layer)

**責任**: ビジネスロジックとドメインモデル

**コンポーネント**:
- `IgnorePattern` (Value Object)
- `IgnoreFlags` (Value Object)
- `IgnoreRule` (Value Object)
- `IgnoreRulesAggregate` (Aggregate Root)
- `IgnoreRuleAdded` / `IgnoreRuleUpdated` / `IgnoreRuleRemoved` / `IgnoreRuleEnabledChanged` (Domain Events)
- `IgnoreRuleFactory` / `IgnoreRulesAggregateFactory` (Factories)
- `IgnoreRuleRepository` (Interface)

**特徴**:
- インフラストラクチャに依存しない
- 純粋なビジネスロジック
- テスト容易性が高い

詳細は `aidlc-docs/design-artifacts/domain-models/unit-07-url-filter_domain_model.md` を参照。

---

### 2. アプリケーション層 (Application Layer)

**責任**: ユースケースの実装、ドメイン層とインフラストラクチャ層の調整

**コンポーネント**:

#### IgnoreRulesService

無視URLルールのCRUDと、保存・閉じ・復元の判定 API を提供するアプリケーションサービス。

**主要メソッド**:

```typescript
class IgnoreRulesService {
  /** ルール一覧を取得（読み込みキャッシュは持たず、毎回ストレージを読む。50ルールなら1ms未満） */
  async list(): Promise<IgnoreRule[]>

  /** ルールを追加（バリデーション・重複・上限チェック） */
  async add(input: AddIgnoreRuleInput): Promise<IgnoreRule>

  /** ルールを更新（部分更新可） */
  async update(id: string, input: UpdateIgnoreRuleInput): Promise<IgnoreRule>

  /** ルールを削除 */
  async remove(id: string): Promise<void>

  /** ルールの有効/無効を切替 */
  async setEnabled(id: string, enabled: boolean): Promise<void>

  /** 保存対象タブのフィルタ（ignoreOnSave） */
  async filterTabsForSave(tabs: TabInfo[]): Promise<{
    kept: TabInfo[];      // 保存対象として残るタブ
    ignored: TabInfo[];   // 除外されたタブ（デバッグ・ログ用）
  }>

  /** 閉じる対象タブIDのフィルタ（ignoreOnClose） */
  async filterTabIdsForClose(tabs: TabInfo[]): Promise<{
    closeTargetIds: number[];  // 閉じる対象として残るID
    keepOpen: TabInfo[];        // 閉じない対象（デバッグ・ログ用）
  }>

  /** 復元対象タブのフィルタ（ignoreOnRestore） */
  async filterTabsForRestore(tabs: TabInfo[]): Promise<{
    kept: TabInfo[];     // 復元対象として残るタブ
    ignored: TabInfo[];  // 除外されたタブ
  }>
}

interface AddIgnoreRuleInput {
  pattern: string;
  ignoreOnSave: boolean;
  ignoreOnClose: boolean;
  ignoreOnRestore: boolean;
  label?: string;
  enabled?: boolean; // 省略時 true
}

interface UpdateIgnoreRuleInput {
  pattern?: string;
  ignoreOnSave?: boolean;
  ignoreOnClose?: boolean;
  ignoreOnRestore?: boolean;
  label?: string;
  enabled?: boolean;
}
```

**依存関係**:
- Domain Layer: `IgnoreRulesAggregate`, `IgnoreRule`, `IgnoreRuleFactory`, `IgnoreRuleRepository`
- Infrastructure Layer: `Logger`

**実装フロー（add）**:
1. `repository.load()` で現在の Aggregate を取得
2. `IgnoreRuleFactory.create(input)` で新規 IgnoreRule を生成（VOバリデーション通過）
3. `aggregate.add(newRule)` で重複・上限チェック後の新 Aggregate を取得
4. `repository.save(newAggregate)` で永続化
5. `IgnoreRuleAdded` Domain Event を発行
6. 追加された IgnoreRule を返す

**実装フロー（filterTabsForSave）**:
1. `repository.load()` で現在の Aggregate を取得
2. `tabs.filter(t => !aggregate.isIgnoredOnSave(t.url))` を `kept` に
3. `tabs.filter(t => aggregate.isIgnoredOnSave(t.url))` を `ignored` に
4. 両者を返す

`filterTabIdsForClose` / `filterTabsForRestore` も同様のパターン。

**パフォーマンス**:
- 50ルール × 50タブ判定で 50ms 以内（NFR-1.1）
- `chrome.storage.local.get()` のレイテンシは数ms 程度。CRUD 操作の体感レスポンスは 200ms 以内（NFR-1.1）

**エラーハンドリング**:
- バリデーションエラー: 専用例外型 `IgnoreRuleValidationError` を投げ、UI で日本語メッセージ表示
- ストレージ失敗: `IgnoreRuleStorageError` を投げ、UI でエラー表示し操作前の状態にロールバック

---

### 3. インフラストラクチャ層 (Infrastructure Layer)

**責任**: 外部API（Chrome Storage API）との通信

**コンポーネント**:

#### ChromeStorageIgnoreRulesRepository

`IgnoreRuleRepository` の Chrome Storage 実装。

**実装**:
```typescript
class ChromeStorageIgnoreRulesRepository implements IgnoreRuleRepository {
  private static readonly STORAGE_KEY = 'ignoreRulesV1';

  async load(): Promise<IgnoreRulesAggregate> {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const dto = result[STORAGE_KEY];
    if (!dto) return IgnoreRulesAggregate.empty();
    try {
      return IgnoreRulesAggregateFactory.fromPersisted(dto);
    } catch (e) {
      Logger.error('Failed to parse ignore rules, falling back to empty', e);
      return IgnoreRulesAggregate.empty();
    }
  }

  async save(aggregate: IgnoreRulesAggregate): Promise<void> {
    const dto = {
      schemaVersion: 1,
      rules: aggregate.list().map(toPersistedDTO),
    };
    await chrome.storage.local.set({ [STORAGE_KEY]: dto });
  }
}
```

**特徴**:
- 読み込み失敗時は空Aggregateにフォールバック（ユーザー操作を妨げない）
- 書き込みは全件置換（差分書き込みは複雑性に対し利得が小さい）
- スキーマバージョン `1` を持ち、将来のマイグレーションに備える

#### Logger（既存共通）
- ストレージ読み書き失敗、バリデーションエラーをログに記録
- 機密情報（URL等）は記録しない

---

## ストレージスキーマ

```json
{
  "ignoreRulesV1": {
    "schemaVersion": 1,
    "rules": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "pattern": "meet.google.com",
        "ignoreOnSave": false,
        "ignoreOnClose": true,
        "ignoreOnRestore": true,
        "label": "Google Meet",
        "enabled": true,
        "createdAt": "2026-05-28T01:30:00.000Z",
        "updatedAt": "2026-05-28T01:30:00.000Z"
      }
    ]
  }
}
```

---

## データフロー（CRUD: ルール追加）

```
[Sidepanel UI]
  └ 「ルール追加」フォーム submit
     └→ IgnoreRulesService.add(input)
         └→ IgnoreRuleRepository.load() → IgnoreRulesAggregate
             ↓
         └→ IgnoreRuleFactory.create(input) → IgnoreRule
             ↓
         └→ aggregate.add(rule) → newAggregate (不変、重複/上限チェック)
             ↓
         └→ IgnoreRuleRepository.save(newAggregate)
             ↓
         └→ IgnoreRuleAdded Domain Event 発行
             ↓
         └→ UI に新規 IgnoreRule を返す → renderIgnoreRules()
```

## データフロー（判定: 保存時）

```
[Service Worker: SAVE_WORK_STATE]
  ├ TabCaptureService.getAllWindowsTabs() → tabs[]
  ├ IgnoreRulesService.filterTabsForSave(tabs) → { kept, ignored }
  ├ CalendarEventService.create(workState=kept)  ★ kept のみ保存
  ├ IgnoreRulesService.filterTabIdsForClose(tabs) → { closeTargetIds, keepOpen }
  └ TabCaptureService.closeAllCapturedTabs(closeTargetIds)  ★ ignoreOnClose タブは閉じない
```

## データフロー（判定: 復元時）

```
[Service Worker: RESTORE_WORK_STATE]
  ├ CalendarEventService.findById(eventId) → workState (フル tabs[])
  ├ IgnoreRulesService.filterTabsForRestore(workState.tabs) → { kept, ignored }
  ├ if kept.length === 0 → UI に警告表示で終了
  ├ else: ChromeWindowsAdapter.createWindow()
  └       TabRestoreManager.restoreTabsInOrder(kept, ...)  ★ kept のみ復元
```

---

## NFRs との対応

| NFR | 設計上の対応 |
|-----|-------------|
| NFR-1.1（パフォーマンス: 判定50ms以内） | `String.includes()` の単純判定、ルール上限100件、テストで計測 |
| NFR-1.1（CRUD UI 200ms以内） | ストレージ書き込み非同期、UI更新は楽観的更新→失敗時ロールバック |
| NFR-1.3（ストレージ容量） | スキーマで25KB目安、`chrome.storage.local`（5MB）に十分収まる |
| NFR-2.4（プライバシー） | パターンは Google Calendar に保存しない、端末ローカルのみ |
| NFR-4.3（拡張性） | `schemaVersion`、将来のマッチ方式拡張・エクスポート/インポート余地を残す |
| NFR-6.3（UX要件） | 設定セクションUI、日本語バリデーションメッセージ、`textContent` 表示 |

---

## テスト戦略

### ユニットテスト（ドメイン層）
- `IgnorePattern` のバリデーション・等価性
- `IgnoreFlags` のバリデーション（全 false 拒否）
- `IgnoreRule` の `matches`、`appliesOnSave/Close/Restore`、`with*` 系メソッド
- `IgnoreRulesAggregate` の `add/update/remove/setEnabled`、重複検出、上限超過、判定 API
- `IgnoreRuleFactory` の create／fromPersisted

### ユニットテスト（アプリケーション層）
- `IgnoreRulesService` の CRUD ユースケース（モック Repository）
- `filterTabsForSave/Close/Restore` の境界条件（空配列、ルール未登録、有効/無効ルール混在）
- 例外系（バリデーションエラー、ストレージ失敗、ロールバック）

### 統合テスト
- `chrome.storage.local` モック越しの永続化と復元
- Unit-2、Unit-4 と組み合わせた保存・復元フローの E2E（Service Worker レベル）

### 代表的テストケース
| 名前 | 内容 |
|------|------|
| meet-keep-and-no-restore | `meet.google.com` を ignoreOnClose+ignoreOnRestore で登録 → 保存対象、閉じない、復元時にスキップ |
| portal-no-save | `portal.example.com` を ignoreOnSave で登録 → WorkState に含まれない |
| disabled-rule | enabled=false のルールはどの判定でも作用しない |
| empty-aggregate | ルール未登録時はすべての判定で false を返す（後方互換性） |
| limit-101 | 101件目の add は LimitExceededError |
| duplicate-pattern | 同一 pattern の追加は DuplicateError |
| substring-edge | `.com` の登録時、想定外URLにもマッチすることを検証（注意喚起） |

---

## カバレッジ目標
80%以上（NFR-4.1）

---

**作成日**: 2026-05-28
**最終更新**: 2026-05-28
**ステータス**: 設計完了
**関連**: Unit-7 Unit定義、Domain Model、ADR-030〜032
