# ADR-032: 無視判定の適用ポイントとUI配置

## ステータス
承認済み（2026-05-28）／ 改訂（2026-05-28: 実機検証で発見した `keepTabId` 書き換え問題を反映、キャッシュ戦略を実装に合わせて訂正）

## コンテキスト
US-10（無視URL設定）では、3つの独立した無視フラグ（`ignoreOnSave` / `ignoreOnClose` / `ignoreOnRestore`）を持つルール群を、保存・閉じ・復元の各処理に適用する必要がある。
また、設定 UI の配置場所も決定する必要がある。

既存の保存フロー（ADR-027）は次の構造を持つ:
1. 全ウィンドウのタブ取得（`getAllWindowsTabs`）
2. WorkState を作成し Calendar API に保存
3. 保存成功後、すべての保存対象タブを閉じる（`closeAllCapturedTabs`）
4. サイドパネルが開いているウィンドウを維持しつつ新規タブを生成（ADR-027 改訂版）

既存の復元フローは次の構造を持つ:
1. WorkState を取得
2. 新規ウィンドウを作成
3. `restoreTabsInOrder` で段階的にタブを開く
4. 復元メタデータを記録

## 決定

### 1. 適用ポイント（3つのフラグの作用箇所）

| フラグ | 適用箇所 | 効果 |
|--------|---------|------|
| `ignoreOnSave` | `getAllWindowsTabs()` 直後、WorkState 作成前 | WorkState の `tabs[]` から除外、Calendar JSON にも残らない |
| `ignoreOnClose` | `closeAllCapturedTabs(...)` の引数生成時 | 該当タブIDを閉じる対象から除外（保存対象になっていても、なっていなくても、独立に判定する） |
| `ignoreOnRestore` | `restoreTabsInOrder` 直前、`createWindow()` の前後どちらでも可 | 新規ウィンドウで開かれない。WorkState のデータは変更しない |

判定ロジックは Unit-7 の `IgnoreRulesService` に集約し、Unit-2（タブキャプチャ）と Unit-4（復元）はサービスを呼ぶだけとする。

### 2. ADR-027 との関係

ADR-027（全ウィンドウ保存・新規ウィンドウ表示）の方針はそのまま維持する。

変更点:
- 「保存成功後、保存した全タブを閉じる」を **「保存成功後、`ignoreOnClose=true` のルールに該当するタブを除いた全タブを閉じる」** に拡張する
- 新規タブ生成・サイドパネル維持の挙動は変更なし
- ルール未登録時は ADR-027 の挙動と完全に一致する（後方互換性）

#### 2-1. サイドパネル維持機構（`keepTabId` の URL 書き換え）と `ignoreOnClose` の相互作用

ADR-027 改訂版では、保存後にサイドパネルを維持するため次の処理を行う:
1. 「最後にフォーカスされたウィンドウ（=サイドパネル付きウィンドウ）」のアクティブタブIDを `keepTabId` として取得
2. `keepTabId` を `chrome.tabs.update(keepTabId, { url: 'chrome://newtab' })` で新タブに遷移させる（=ウィンドウ生存維持）
3. `keepTabId` を閉じる対象から除外して、残りを `chrome.tabs.remove` で一括クローズ

**問題**: 上記ステップ 2 は「閉じない」タブ（例: Google Meet 通話中のタブ）を `keepTabId` として選んだ場合、`chrome.tabs.remove` は呼ばないものの **URL 書き換えにより通話を切断**してしまう。`ignoreOnClose=true` の意味的意図は「タブが何も触られず維持される」であり、URL の書き換えも含めて避ける必要がある。

**決定**:
- `keepTabId` が `closeTargetTabIds`（=「閉じる」対象として残ったID集合）に含まれない場合、その `keepTabId` は `ignoreOnClose` の対象とみなして **URL 書き換えもスキップ** する
- スキップした場合、そのタブはユーザー操作前と同一の状態で残り、ウィンドウも維持される（=ウィンドウ生存維持の目的を別経路で達成）
- `keepTabId` が通常タブの場合は ADR-027 と同じく `chrome://newtab` に遷移させる

判定ロジック:
```ts
const keepTabIsIgnoredOnClose = !closeTargetTabIds.includes(keepTabId);
if (!keepTabIsIgnoredOnClose) {
  await chrome.tabs.update(keepTabId, { url: 'chrome://newtab' });
}
```

`closeTargetTabIds` は `IgnoreRulesService.filterTabIdsForClose(tabIdUrlPairs)` で生成済みのため二重判定は不要。書き換え可否と閉じる可否を同一基準で扱える。

#### 2-2. 全ウィンドウのタブIDとURLのペア取得

`closeTargetTabIds` を生成するためには `(tabId, url)` のペア配列が必要。これに合わせて `TabCaptureService.getAllWindowsTabs()` の戻り値に `tabIdUrlPairs: Array<{tabId: number; url: string}>` を追加する。

- 戻り値型は後方互換のため `tabs` `tabIds` を維持し、`tabIdUrlPairs` を追加するのみ
- `OptimizedTabCaptureService` も同型を素通しする
- TabInfo 化に失敗したタブも `tabIdUrlPairs` には含める（URL は判定対象として独立して必要なため）

### 3. 復元時に対象が0件になった場合

`ignoreOnRestore` フィルタの結果、復元対象タブが0件になった場合は:
- 新規ウィンドウを作成しない
- UI（サイドパネル）に「無視URL設定により復元対象が0件になりました。設定を見直してください」旨の警告メッセージを表示する
- 復元メタデータの記録は行わない（実質的に「復元」イベントが発生していないため）

### 4. UI 配置

無視URLルールの管理 UI は、サイドパネルに新設する **「設定」セクション** として実装する。

- 既存セクション（タブ一覧 / 保存フォーム / 保存済み一覧）と並列に配置
- ルールの一覧 / 追加 / 編集 / 削除 / 有効化トグルを提供
- 表示は `textContent` で行い XSS を防ぐ
- ポップアップウィンドウや別画面（`options.html`）には配置しない（既存UIとの一貫性、サイドパネルで完結する原則を維持）

### 5. ルール変更の伝搬

`IgnoreRulesService` は **メモリキャッシュ + `chrome.storage.onChanged` リスナーによる無効化** という方式を採用する。

理由: 1回の保存処理で `filterTabsForSave` と `filterTabIdsForClose` の2回連続でルール集約を読むため、毎回 `chrome.storage.local.get` を呼ぶと不要な I/O が走る。

実装方針:
- `IgnoreRulesService` は最初の `load()` で集約を取得し、以降はメモリにキャッシュ
- CRUD（add / update / remove / setEnabled）後はサービス内で自分のキャッシュを更新
- 外部（サイドパネル等）からの変更は Service Worker 側で `chrome.storage.onChanged` を購読し、`ignoreRules` キーが変わったら `ignoreRulesService.invalidateCache()` を呼ぶ
  - これによりサイドパネルでルールを変更した直後の保存・復元でも即座に最新ルールが反映される
  - 変更が同一サービスインスタンス経由（CRUD API）であっても、外部経由（直接ストレージ書き換え等）であっても安全

## 代替案
1. **判定をTabCaptureService内部で行う**: 関心の分離が崩れ、Unit-2 が無視URLの仕様変更（将来の MatchType 追加など）に追従し続ける必要が出る。Unit-7 に委譲する方針を採用。
2. **`ignoreOnSave=true` のタブは閉じる対象からも自動的に除外**: 「保存対象でないタブは保存処理上タブIDを保持しないため自動的に閉じない」という暗黙の挙動に頼ると、3フラグの独立性が損なわれる。明示的に独立判定する方針を採用。
3. **サイドパネルではなく `options.html` に設定UIを配置**: 既存UIから別ページに遷移する必要があり、ブックマーク作成と同等の手軽さ（RFP）から外れる。サイドパネル内設定セクションを採用。
4. **CRUD後に Service Worker へメッセージで通知**: 不要。Service Worker は `chrome.storage.onChanged` を購読しキャッシュを無効化するため、メッセージ機構を別途用意する必要はない。
5. **`keepTabId` の書き換え可否を「ignoreOnClose 対象 URL かどうか」で再判定する**: 既に `closeTargetTabIds` が `IgnoreRulesService.filterTabIdsForClose` の結果として「閉じない」対象を除外しているため、`closeTargetTabIds.includes(keepTabId)` で同一基準を使い回す方が判定の重複もリスクもない。後者を採用。
6. **`keepTabId` は常に書き換える**: 当初の実装（ADR-027 改訂版）。Meet 等の「ignoreOnClose 対象タブ」がアクティブな状態で保存すると通話切断が発生するため、実機検証で問題が確認され不採用となった。

## 結果

### 利点
- 3フラグの独立性が明確に実装される
- Unit-2 / Unit-4 はフィルタ判定の詳細を知らずに済む（責任分離）
- ADR-027 の挙動を最小変更で拡張できる（後方互換性）
- 0件警告により「復元したのに何も開かない」という不気味な体験を防げる
- サイドパネル内に設定セクションを置くことで、設定変更 → 保存・復元の体験が同一画面内で完結する
- `keepTabId` の書き換えと閉じる判定を `closeTargetTabIds` の同一集合で判定するため、Meet などの通話タブが「閉じない」対象として登録されていれば自動的に保護される（=ユーザーが明示的に2箇所設定する必要がない）
- メモリキャッシュにより、保存処理1回あたりの `chrome.storage.local.get` は最大1回に抑えられる

### 欠点・トレードオフ
- メモリキャッシュ + onChanged 無効化方式では、`chrome.storage.onChanged` イベントが届くまで（通常 数ms）外部変更が反映されない可能性がある
  - **軽減策**: サイドパネルからの CRUD 操作は同じ Service Worker インスタンス内で完結するため実質的な遅延はない。外部からのストレージ直接編集は想定外のシナリオ
- サイドパネルが縦に長くなる
  - **軽減策**: 設定セクションは折り畳み（`<details>`）可能とする（実装済み）
- `keepTabId` 判定が `closeTargetTabIds` の生成に依存するため、`closeTargetTabIds` 計算がバグると `keepTabId` 判定もバグるという結合がある
  - **軽減策**: `IgnoreRulesService.filterTabIdsForClose` をユニットテストで網羅し、生成ロジックの正しさを担保

## 関連
- US-3, US-5, US-10
- ADR-027（全ウィンドウ保存・新規ウィンドウ表示）— 本ADRが拡張する
- ADR-030（マッチング方式）
- ADR-031（永続化先）
- Unit-2、Unit-4、Unit-5、Unit-7
- 論理設計: `unit-07-url-filter_logical_design.md`、`unit-02-tab-capture_logical_design.md`、`unit-04-restore_logical_design.md`
- フィードバック: `request/20260528_feedback.md`

---

**作成日**: 2026-05-28
**最終更新**: 2026-05-28（実機検証で発見した `keepTabId` の URL 書き換え問題を 2-1 / 2-2 として追記、キャッシュ戦略を実装に合わせて 5 で訂正、代替案 5・6 を追加）
