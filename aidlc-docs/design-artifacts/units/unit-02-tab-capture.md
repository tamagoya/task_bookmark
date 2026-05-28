# Unit 2: タブ状態キャプチャ

## 概要
すべてのChromeウィンドウで開いているタブの情報（URL、タイトル、ファビコン）を取得し、UIに表示する機能を担当するUnitです。保存時は全ウィンドウのタブを対象とし、保存成功後はそれらのタブを閉じ、新しいタブを1つだけ開いた新規ウィンドウを表示する処理も担当します。

## 責任範囲
- すべてのChromeウィンドウで開いているタブ情報の取得（保存・一覧表示用）
- 現在のウィンドウのタブ情報の取得（従来の取得APIとの整合用）
- タブ情報の構造化（URL、タイトル、ファビコン）
- タブ情報のUI表示（サイドパネル）
- タブの順序の保持（ウィンドウ単位・同一ウィンドウ内のインデックス順）
- 保存対象タブの一括閉じ（タブID指定）
- 新規ウィンドウの作成（新しいタブを1つだけ開いたウィンドウ）
- **無視URL設定の適用（保存無視・閉じる無視）（2026-05-28 追加、Unit-7 と連携）**:
  - 保存処理で `getAllWindowsTabs()` の結果から `ignoreOnSave=true` のルールに部分一致するタブを除外する責務を持つ
  - 保存成功後の閉じる処理で `ignoreOnClose=true` のルールに部分一致するタブを `closeAllCapturedTabs()` の対象から除外する責務を持つ
  - 実際のフィルタ判定ロジックは Unit-7 の `IgnoreRulesService` に委譲する（Unit-2 はサービスを呼ぶだけ）

## 関連User Stories
- **US-2**: 現在のタブ状態の取得と表示（全ウィンドウのタブを表示）
- **US-3**: 仕事状態の保存（全ウィンドウのタブを保存、保存後は全タブを閉じ＋新規ウィンドウ1タブ表示、無視URL適用）
- **US-10**: 無視URL設定によるタブの除外制御（2026-05-28 追加、保存無視・閉じる無視のフィルタ点）

## 入力
- ユーザーの「タブ情報を取得」リクエスト
- サイドパネルの表示リクエスト

## 出力
- タブ情報の配列（TabInfo[]）
- UI表示用のデータ（タブ一覧）

## 主要コンポーネント

### 1. Tab Capture Service
**責任**: タブ情報の取得・構造化、保存対象タブの一括閉じ、新規ウィンドウ作成の調整

**主要メソッド**:
- `getCurrentWindowTabs()`: 現在のウィンドウのタブ情報を取得（従来API）
- `getAllWindowsTabs()`: すべてのChromeウィンドウのタブ情報を取得（保存・一覧表示用）
- `getTabInfo(tabId)`: 特定のタブの情報を取得
- `getFaviconUrl(tabId)`: タブのファビコンURLを取得
- `closeCurrentWindowTabs()`: 現在のウィンドウのタブを閉じる（従来）
- `closeAllCapturedTabs(tabIds: number[])`: 指定したタブIDのタブを一括で閉じる（保存成功後用）
- 新規ウィンドウ作成: Chrome Windows Adapter の `createWindow(urls)` を利用（例: `createWindow(['about:newtab'])`）

**依存関係**:
- Chrome Tabs API (`chrome.tabs`)
- Chrome Windows API (`chrome.windows`)

### 2. Tab Data Model
**責任**: タブ情報のデータ構造定義

**データ構造**:
```typescript
interface TabInfo {
  id: number;
  url: string;
  title: string;
  faviconUrl?: string;
  index: number; // タブの順序
}
```

### 3. Tab List Component (UI)
**責任**: タブ一覧のUI表示

**主要機能**:
- タブ一覧の表示（タイトル、URL、ファビコン）
- タブの順序表示
- スクロール可能なリスト

**依存関係**:
- Tab Capture Service
- Unit 5 (UI/UX実装) の共通コンポーネント

## 技術スタック
- **言語**: TypeScript
- **API**: 
  - Chrome Tabs API
  - Chrome Windows API
- **UI**: HTML/CSS/JavaScript（またはReact/Vueなどのフレームワーク）

## データフロー（一覧表示）
1. ユーザーがサイドパネルを開く
2. Tab Capture Serviceが全ウィンドウのタブ情報を取得（`getAllWindowsTabs()`）
3. タブ情報を構造化（TabInfo[]、ウィンドウID・インデックス順を保持）
4. UIコンポーネントにデータを渡して表示

## データフロー（保存）
1. ユーザーが保存を実行
2. Tab Capture Serviceが全ウィンドウのタブ情報を取得（`getAllWindowsTabs()`）
3. **(2026-05-28 追加)** Unit-7 の `IgnoreRulesService.list()` で現在のルール一覧を取得
4. **(2026-05-28 追加)** `ignoreOnSave=true` のルールに部分一致するタブをフィルタで除外し、保存対象タブ集合 `tabsForSave` を確定（元の `tabs` も保持してID逆引き可能にする）
5. `tabsForSave` を Calendar API 連携に渡す
6. 保存成功後、**`ignoreOnClose=true` のルールに部分一致するタブIDを除外したID集合** `tabIdsToClose` を作り、`closeAllCapturedTabs(tabIdsToClose)` で閉じる
7. Chrome Windows Adapter で `createWindow(['about:newtab'])` を呼び、新しいタブを1つだけ開いた新規ウィンドウを表示する（既存挙動。詳細は ADR-027）

> **ルール未登録時**: ステップ 3〜4・6 のフィルタは空集合となり、従来挙動と完全に一致する（NFR-互換性要件）。

## エラーハンドリング
- **タブ取得エラー**: エラーメッセージを表示し、再試行ボタンを提供
- **ファビコン取得エラー**: デフォルトアイコンを表示
- **権限エラー**: ユーザーに権限の許可を促す

## パフォーマンス要件
- **レスポンス時間**: 全ウィンドウのタブ取得は1秒以内（複数ウィンドウ・合計最大50タブ程度を想定）。単一ウィンドウの取得は500ms以内（NFR-001）
- **メモリ使用量**: タブ情報のキャッシュは最小限に

## テスト戦略
- **ユニットテスト**: 
  - Tab Capture Serviceのモックテスト
  - タブ情報の構造化テスト
- **統合テスト**: 
  - 実際のChrome環境でのタブ取得テスト
  - 複数のタブ（10個、20個）でのパフォーマンステスト

## 依存関係
- **外部依存**: 
  - Chrome Tabs API
  - Chrome Windows API
- **内部依存**: 
  - Unit 1 (認証): 認証状態の確認（オプション）
  - Unit 5 (UI/UX): UIコンポーネント

## 他のUnitsとのインターフェース
- **Unit 3 (Calendar API連携)**: タブ情報を提供（保存時に使用）
- **Unit 4 (状態復元)**: タブ情報の構造を参照（復元時に使用）
- **Unit 5 (UI/UX)**: UIコンポーネントを提供
- **Unit 7 (URL Filter)（2026-05-28 追加）**: `IgnoreRulesService.list()` で現在のルール一覧を取得し、保存無視・閉じる無視を適用する

## 実装の優先順位
**優先度**: 高（保存機能の前提条件）

## リスク
- **RISK-004**: 大量のタブ取得時のパフォーマンス問題（軽減策: 段階的な取得、キャッシュの活用）

## 成功基準
- [ ] すべてのChromeウィンドウのタブ情報を正確に取得できる（`getAllWindowsTabs()`）
- [ ] タブの順序が保持される（ウィンドウ単位・同一ウィンドウ内のインデックス順）
- [ ] ファビコンが適切に表示される
- [ ] 全ウィンドウのタブ取得が1秒以内で完了する（複数ウィンドウ想定）
- [ ] 保存成功後、保存対象のタブを一括で閉じられる（`closeAllCapturedTabs`）
- [ ] 保存成功後、新しいタブを1つだけ開いた新規ウィンドウが表示される
- [ ] **無視URL設定（Unit-7）と連携し、`ignoreOnSave` のタブが WorkState から除外される（2026-05-28 追加）**
- [ ] **無視URL設定（Unit-7）と連携し、`ignoreOnClose` のタブが保存後の閉じ対象から除外される（2026-05-28 追加）**
- [ ] **ルール未登録時は従来挙動と完全に一致する（後方互換性、2026-05-28 追加）**
- [ ] **無視URLフィルタの追加コストが 50ms 以内（NFR-1.1、2026-05-28 追加）**
- [ ] ユニットテストのカバレッジが80%以上

---

**作成日**: 2026-01-21  
**最終更新**: 2026-05-28（無視URL設定との連携を追加）  
**ステータス**: 設計完了
