# Modification Analysis: 無視URL設定機能の追加（2026-05-28）

## 1. 改修の背景

### 1.1 ユーザーフィードバック原文
`request/20260528_feedback.md` より:

> 実際に使っていて、実用上辛いことが見えてきた。
>
> 例: meetなどを使っている最中に、保存ボタンを押すと通話が切れないのでmeeting中にタスクの切り替えができない
> 例: ポータルページや、GoogleカレンダーなどSPAのページのURLなど、保存しても情報量がないページが保存されるとノイズになりやすい
>
> 対処方法
> * 個人の設定として、無視URLを指定できるようにする
> * 無視URLは、閉じる無視するのか、保存無視、復元無視をそれぞれ選べる
>
> 利用例: meetは、閉じれて困るし、過去のmeetのURLを復元する必要もない。meetのURLの部分一致で、閉じる無視かつ復元無視で登録しておく。(データとして、どのmeetに参加していたかは保持したい)
> 利用例: ポータルページは、閉じる無視するのか、保存無視として登録する。

### 1.2 課題サマリ
| 課題 | 影響 | 既存仕様の限界 |
|------|------|-----------------|
| Meet 等の通話タブが保存ボタン押下で閉じられ、通話が切断 | ミーティング中のタスク切替が事実上不可能 | ADR-027 により「保存成功時に保存対象タブを一括 close」が固定挙動 |
| ポータル/SPA等の情報量が低いURLが保存されノイズ化 | 一覧の視認性低下、復元時に不要タブが大量に開く | URLフィルタリング機構が無く、すべてのタブが等しく保存・復元される |

---

## 2. 新規要件の具体化

### 2.1 コアコンセプト
ユーザーが「**無視ルール**」のリストを設定でき、各ルールは「**URLパターン**」と「**3つの独立した無視フラグ**」で構成される。

### 2.2 IgnoreRule のデータ構造（承認反映版）

```typescript
interface IgnoreRule {
  id: string;            // 内部ID（uuid v4 等）
  pattern: string;       // URL の部分一致パターン（substring 一本化）
  ignoreOnSave:    boolean;  // 保存対象から除外
  ignoreOnClose:   boolean;  // 保存後に閉じない
  ignoreOnRestore: boolean;  // 復元時に開かない
  label?: string;        // 表示名（任意）
  enabled: boolean;      // ルール有効/無効
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
}
```

> **承認事項（2026-05-28）**: マッチ方式は `substring`（URL中の文字列部分一致）一本化。`host` / `prefix` / `regex` は不採用。`MatchType` Value Object も導入しない。

### 2.3 3つの無視フラグの作用ポイント（フィードバック原文どおり）

| フラグ | 作用箇所（既存実装） | 効果 |
|--------|----------------------|------|
| `ignoreOnSave` | `TabCaptureService.getAllWindowsTabs()` 戻り値の直後に適用 | WorkState の `tabs[]` から除外（カレンダーJSONにも残らない） |
| `ignoreOnClose` | `TabCaptureService.closeAllCapturedTabs(tabIds)` の引数を絞り込み | 該当タブは保存後に閉じない（Meet 通話継続が可能） |
| `ignoreOnRestore` | `RestoreService.restoreWorkState()` 内、`restoreTabsInOrder` 前に適用 | 新規ウィンドウで開かれない（WorkState のデータは保持済み） |

**重要な独立性**: 3つのフラグは独立に組合せ可能（2^3 = 8 通り、全 false は登録不可なので有効7通り）。

### 2.4 マッチ方式（承認反映版: substring 一本化）

| 方式 | 採否 | 理由 |
|------|------|------|
| `substring`（URL中の部分一致） | ✅ 採用（唯一） | フィードバック原文の「部分一致」と整合、ユーザーが直感的に扱える、実装/テストが最も単純 |
| `host`（ホスト一致） | ❌ 不採用 | ユーザー回答により不要 |
| `prefix`（前方一致） | ❌ 不採用 | ユーザー回答により不要 |
| `regex`（正規表現） | ❌ 不採用 | 同上、誤設定リスクも大きい |

判定ロジック:

```typescript
function urlMatchesRule(url: string, rule: IgnoreRule): boolean {
  return rule.enabled && url.includes(rule.pattern);
}
```

### 2.5 設定の永続化

- **採用**: `chrome.storage.local`
  - 認証状態・復元セッション情報と同じストレージに統一（既存実装の一貫性）
  - 容量制限（5MB）は十分（数百ルールでも数十KBオーダー）
- **却下**: `chrome.storage.sync`
  - 複数端末同期は便利だが容量制限（100KB）が厳しい、将来拡張候補
- **却下**: Google Calendar の専用イベントとして保存
  - API レイテンシでサイドパネル起動時の体感が悪化、設定はクライアントローカルが妥当

データキー設計:
```
{
  "ignoreRulesV1": {
    "schemaVersion": 1,
    "rules": IgnoreRule[]
  }
}
```

### 2.6 UI 配置

サイドパネルの構成に **「設定」セクション** を新設（既存セクションと並列）:

```
[認証セクション]
[現在のタブ一覧セクション]
[仕事状態を保存セクション]
[保存済み仕事一覧セクション]
[設定セクション]    ← 新規
  └ 無視URLルール
     ├ ルール追加ボタン
     ├ ルール一覧（カード or テーブル）
     │   ├ pattern (matchType)
     │   ├ ☑ 保存無視 ☑ 閉じる無視 ☑ 復元無視
     │   └ [編集] [削除] [有効/無効トグル]
     └ （将来）インポート/エクスポート
```

### 2.7 バリデーション

| 項目 | ルール |
|------|--------|
| `pattern` | 必須、最大 2048 文字、空白のみNG、トリム済みで1文字以上 |
| 無視フラグ | 少なくとも1つが `true` であること（全部 false なら登録拒否） |
| 重複 | 同一 `pattern`（trim 後）のルールは登録不可 |
| ルール総数 | 上限 100 件（承認済み） |

### 2.8 既存ADR-027との整合

- ADR-027（全ウィンドウ保存・保存後新規ウィンドウ表示）の方針はそのまま維持
- 「保存成功後、保存した全タブを閉じる」を **「`ignoreOnClose=true` に該当するタブを除いた全タブを閉じる」** に拡張
- サイドパネル維持の挙動も既存どおり

---

## 3. 影響範囲（Impact Analysis）

### 3.1 レイヤー1: User Stories

**変更が必要なファイル**: `aidlc-docs/story-artifacts/user_stories.md`

| US | 変更内容 |
|----|---------|
| **新規 US-10「無視URL設定」** | 無視ルールのCRUD、3フラグの個別設定、サイドパネル設定セクションのUI |
| US-3（保存） | 受け入れ基準に「`ignoreOnSave`/`ignoreOnClose` を尊重する」を追記 |
| US-5（復元） | 受け入れ基準に「`ignoreOnRestore` を尊重する」を追記 |

### 3.2 レイヤー2: 要件資料（requirements）

| ファイル | 影響 | 変更概要 |
|---------|------|---------|
| `intent_clarification_questions.md` | **あり** | Q7回答に「無視URL設定で能動的に除外可能」を追記、Q14（ターゲットの追加要望）にフィードバック内容を反映 |
| `measurement_criteria.md` | **あり** | 任意指標として「無視URL設定の利用率（アクティブユーザーの30%以上が1ルール以上登録）」を追加 |
| `nfrs.md` | **あり** | パフォーマンス: パターンマッチで保存/復元のレスポンスを劣化させない（追加コスト < 50ms）、設定UI操作のレスポンス < 200ms。互換性: 既存 WorkState スキーマには変更なし |
| `prfaq.md` | **あり** | 主要機能・FAQに「Meet を閉じずに保存」「ノイズURLの除外」を追加（Q&A 2件追加） |
| `risks.md` | **あり** | 新規 RISK-016「無視ルールの誤設定による意図せぬ除外」、RISK-017「ルール件数増加によるパフォーマンス劣化」 |

### 3.3 レイヤー3: Unit 定義

| Unit | 影響 | 変更概要 |
|------|------|---------|
| Unit-2（タブキャプチャ） | **あり** | 責任範囲に「無視ルールの適用（保存無視・閉じる無視）」を追記。新メソッド `applyIgnoreOnSave`, `applyIgnoreOnClose`（または UrlFilterService 経由） |
| Unit-4（復元） | **あり** | 責任範囲に「無視ルールの適用（復元無視）」を追記 |
| Unit-5（UI/UX） | **あり** | 設定セクション、ルール CRUD UI、`Settings Component` の追加 |
| **新規 Unit-7（URL Filter）** | **新規作成** | 無視ルールのドメイン・リポジトリ・サービスを集約。`IgnoreRulesService`, `IgnoreRuleRepository` |
| Unit-1（認証） | なし | 変更なし |
| Unit-3（Calendar API） | なし | 変更なし（保存スキーマは変えない） |
| Unit-6（Performance） | 軽微 | キャッシュ戦略にURLフィルタ判定キャッシュを追加（任意） |

### 3.4 レイヤー4: Domain Models

| ファイル | 影響 | 変更概要 |
|---------|------|---------|
| **新規 `unit-07-url-filter_domain_model.md`** | **新規作成** | Value Objects: `IgnorePattern`, `MatchType`, `IgnoreFlags`, `IgnoreRule`. Aggregate Root: `IgnoreRulesAggregate`. Domain Events: `IgnoreRuleAdded`, `IgnoreRuleUpdated`, `IgnoreRuleRemoved` |
| `unit-02-tab-capture_domain_model.md` | 軽微 | TabInfo フィルタリングのドメインルールに「IgnoreRule に依る除外」を参照として追記（実フィルタは Unit-7 が担う） |
| `unit-03-calendar-api_domain_model.md` | なし | 変更なし |
| `unit-05-ui-ux_domain_model.md` | 軽微 | Settings Component のドメイン参照を追記 |

### 3.5 レイヤー5: Logical Designs

| ファイル | 影響 | 変更概要 |
|---------|------|---------|
| **新規 `unit-07-url-filter_logical_design.md`** | **新規作成** | アプリケーションサービス、リポジトリ実装、ストレージ層 |
| `unit-02-tab-capture_logical_design.md` | **あり** | `getAllWindowsTabs()` 後のフィルタ適用、`closeAllCapturedTabs()` 前の除外フロー |
| `unit-04-restore_logical_design.md` | **あり** | `restoreWorkState()` 内のフィルタ適用フロー |
| `unit-05-ui-ux_logical_design.md` | **あり** | Settings Component の設計、ルール編集フォームのバリデーションフロー |

### 3.6 レイヤー6: ADRs（新規追加・承認反映版）

| ADR | タイトル | 概要 |
|-----|---------|------|
| **ADR-030** | 無視URL設定のマッチング方式 | substring（URL中の部分一致）一本化、`host`/`prefix`/`regex` は不採用 |
| **ADR-031** | 無視URL設定の永続化先 | `chrome.storage.local` を採用、sync・カレンダー保存は不採用 |
| **ADR-032** | 無視判定の適用ポイントとUI配置 | 保存・閉じ・復元の3ポイント独立適用、ADR-027との関係、UIはサイドパネル設定セクション |

### 3.7 レイヤー7: 実装（FRONTEND）

| 領域 | 変更内容 |
|------|---------|
| **新規 ドメイン層** | `src/domain/value-objects/ignore-rule.ts`, `ignore-flags.ts`, `ignore-pattern.ts`（`MatchType` は不要） |
| **新規 ドメイン層** | `src/domain/aggregates/ignore-rules-aggregate.ts` |
| **新規 ドメイン層** | `src/domain/repositories/ignore-rule-repository.ts`（インターフェース） |
| **新規 ドメイン層** | `src/domain/factories/ignore-rule-factory.ts` |
| **新規 ドメイン層** | `src/domain/events/ignore-rule-events.ts` |
| **新規 アプリ層** | `src/application/services/ignore-rules-service.ts` |
| **新規 アプリ層** | `src/application/services/url-matcher.ts`（pure function） |
| **新規 インフラ層** | `src/infrastructure/repositories/chrome-storage-ignore-rule-repository.ts` |
| 既存変更 | `TabCaptureService.getAllWindowsTabs` → `IgnoreRulesService` 経由でフィルタ |
| 既存変更 | `Service Worker` の `SAVE_WORK_STATE` ハンドラ → `closeAllCapturedTabs` 前にフィルタ |
| 既存変更 | `RestoreService.restoreWorkState` → 復元前にフィルタ |
| 既存変更 | `sidepanel/sidepanel.html` / `.ts` / `.css` に設定セクション追加 |
| 既存変更 | `manifest.json` 変更不要（追加権限なし） |
| **新規 テスト** | 各Value Object / Aggregate のユニットテスト、URL Matcher のテスト、統合テスト（保存・復元での適用） |
| **既存テスト更新** | TabCaptureService / RestoreService の既存テストに無視ルール適用ケースを追加 |

### 3.8 影響なしと判断したアーティファクト
- Unit-1（認証）の Unit定義・ドメインモデル・論理設計
- Unit-3（Calendar API）の各設計（保存スキーマは変更しない）
- 既存 ADR（001〜029）すべて改廃なし、補完関係として ADR-030〜033 を新規追加

---

## 4. アーティファクト更新順序（ウォーターフォール）

下表の順序を **厳守** する。下位を更新する前に上位が確定していること。

| 順 | レイヤー | 対象ファイル | アクション |
|----|---------|-------------|-----------|
| 1 | User Stories | `aidlc-docs/story-artifacts/user_stories.md` | US-10新規追加、US-3/US-5の受け入れ基準追記 |
| 2a | 意図明確化 | `requirements/intent_clarification_questions.md` | Q7/Q14 補強 |
| 2b | 測定基準 | `requirements/measurement_criteria.md` | 利用率指標追加 |
| 2c | NFR | `requirements/nfrs.md` | パフォーマンス・互換性追記 |
| 2d | PR/FAQ | `requirements/prfaq.md` | 主要機能・FAQ追記 |
| 2e | リスク | `requirements/risks.md` | RISK-016/017追加 |
| 3 | Unit 定義 | `units/unit-02-tab-capture.md`, `unit-04-restore.md`, `unit-05-ui-ux.md`, **新規 `unit-07-url-filter.md`** | 責任範囲・主要メソッド・依存関係を更新 |
| 4 | ドメインモデル | **新規 `domain-models/unit-07-url-filter_domain_model.md`** ＋ 既存3ファイル軽微追記 | Value Object / Aggregate / Domain Events 定義 |
| 5 | 論理設計 | **新規 `logical-designs/unit-07-url-filter_logical_design.md`** ＋ 既存3ファイル追記 | フロー詳細、依存図、データフロー |
| 6 | ADR | **新規 `adrs/unit-07-url-filter_adr-030-match-strategy.md`**, `adr-031-storage.md`, `adr-032-apply-points-and-ui.md` の3本 | 決定事項とトレードオフを記録 |
| 7 | 実装 | `FRONTEND/src/domain/`, `application/`, `infrastructure/`, `sidepanel/`, `background/`, テスト一式 | コード生成は `@aidlc-code-generation unit-07-url-filter` 等で実行 |

**禁止事項**: 上位レイヤーが未確定のまま下位を更新しない。要件資料を飛ばして設計に進まない。

---

## 5. 実装方針の概略（参考）

### 5.1 URL マッチングのコアロジック（pure function、substring 一本化）

```typescript
function urlMatchesRule(url: string, rule: IgnoreRule): boolean {
  return rule.enabled && url.includes(rule.pattern);
}
```

### 5.2 保存フロー（Service Worker `SAVE_WORK_STATE`）

```
1. tabs = TabCaptureService.getAllWindowsTabs()
2. ignoreRules = IgnoreRulesService.list()
3. tabsForSave   = tabs.filter(t => !ignoredOnSave(t, ignoreRules))
4. WorkState 作成 → CalendarEvent 保存
5. tabIdsToClose = tabs
     .filter(t => !ignoredOnClose(t, ignoreRules))
     .map(t => t.id)
6. closeAllCapturedTabs(tabIdsToClose)
7. 既存どおり 新規タブ生成 → サイドパネル維持
```

### 5.3 復元フロー（`RESTORE_WORK_STATE`）

```
1. workState = CalendarEventService.findById(eventId)
2. ignoreRules = IgnoreRulesService.list()
3. tabsToRestore = workState.tabs.filter(t => !ignoredOnRestore(t, ignoreRules))
4. createWindow → restoreTabsInOrder(tabsToRestore, ...)
5. 既存どおり 復元メタデータ記録
```

### 5.4 イミュータビリティとテスト
- すべての Value Object / Aggregate は不変（既存コーディングスタイル準拠）
- URL Matcher は pure function → テスト容易
- カバレッジ目標: 80%以上

---

## 6. リスクと軽減策

| リスク | レベル | 軽減策 |
|--------|--------|--------|
| **RISK-016**: ユーザーの誤設定で重要URLが除外される | 中 | UIでルール適用時のプレビュー（次回保存対象から何件除外されるか）、「無効化」のトグルで一時停止可能 |
| **RISK-017**: ルール件数増加によりパフォーマンス劣化 | 低 | ルール上限100件、URLマッチはO(n)で十分高速、キャッシュ戦略は将来検討 |
| **RISK-018**: ストレージ破損時にすべてのルールが消失 | 低 | スキーマバージョニング、JSON エクスポート機能を将来追加 |

---

## 7. ユーザーへの提案と確認事項

ユーザーに以下を確認する:

1. **マッチ方式**: `host` / `prefix` / `substring` の3種で十分か（正規表現は将来でよいか）
-> substringで、URL中の文字列部分一致のみで良い

2. **永続化先**: `chrome.storage.local`（端末ローカル）で開始してよいか
-> chrome.storage.localで良い

3. **UI 配置**: サイドパネル内の「設定セクション」として追加してよいか
-> 良い

4. **デフォルト挙動**: ルール未登録時は従来どおり全タブ保存・全タブ閉じ・全タブ復元でよいか
-> 良い

5. **同梱プリセット**: `meet.google.com`（Meet）など、利用例で挙げられたパターンを初期テンプレートとして提供するか、それともユーザー任せか
-> 初期テンプレートは機能は不要

6. **ルール上限**: 100件で問題ないか
-> 問題ない

7. **エクスポート/インポート**: 初期リリースでは不要、将来拡張で追加でよいか
-> 初期リリースでは不要

---

## 8. 次のアクション（承認後）

承認をいただいた後、以下の順序で進めます:

1. **要件資料・ストーリーの更新**（レイヤー1〜2）
2. **設計ドキュメントの更新**（レイヤー3〜6）
3. 必要に応じて `@aidlc-domain-model unit-07-url-filter` で詳細ドメイン設計を起動
4. `@aidlc-architecture unit-07-url-filter` で論理設計
5. `@aidlc-code-generation unit-07-url-filter` で実装とテスト
6. 既存サービス（TabCaptureService, RestoreService, Service Worker, サイドパネル）の改修

---

**作成日**: 2026-05-28
**作成者**: Modification & Impact Analysis エージェント
**関連計画**: `modification_plan_20260528_url_filter.md`
**ソースフィードバック**: `request/20260528_feedback.md`
**ステータス**: ✅ 分析完了 / ✅ ユーザー承認済み（2026-05-28）/ 🚧 ウォーターフォール更新中

## 9. ユーザー回答の反映サマリ（2026-05-28 承認）

| # | 質問 | 回答 | 反映 |
|---|------|------|------|
| 1 | マッチ方式 | substring のみ | ADR-030, IgnoreRule から `matchType` 除去 |
| 2 | 永続化先 | chrome.storage.local | ADR-031 に明記 |
| 3 | UI 配置 | サイドパネル設定セクション | ADR-032 に明記 |
| 4 | デフォルト挙動 | ルール未登録時は従来どおり | NFR・US-3/US-5受け入れ基準で明示 |
| 5 | 同梱プリセット | 不要 | 初期テンプレート機能は実装しない |
| 6 | ルール上限 | 100件 | NFR・バリデーション仕様に明記 |
| 7 | エクスポート/インポート | 初期不要 | 将来拡張として risks/nfrs に脚注 |
