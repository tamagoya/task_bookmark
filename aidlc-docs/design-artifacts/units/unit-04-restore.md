# Unit 4: 状態復元機能

## 概要
保存済みの仕事状態を復元し、記録されたタブ群を新しいウィンドウで一括展開する機能を担当するUnitです。復元時のメタデータ（前後関係）も管理します。

## 責任範囲
- 保存済み仕事状態の選択と復元
- タブの一括展開（新しいウィンドウ）
- 復元時のメタデータ記録（復元元・復元先の関係）
- 大量タブ復元時のパフォーマンス最適化
- **無視URL設定の適用（復元無視）（2026-05-28 追加、Unit-7 と連携）**:
  - WorkState の `tabs[]` から `ignoreOnRestore=true` のルールに部分一致するタブを除外してから新規ウィンドウに展開する
  - WorkState 自体（カレンダー上のデータ）は変更しない（履歴は保持される）
  - 実際のフィルタ判定は Unit-7 の `IgnoreRulesService` に委譲する

## 関連User Stories
- **US-5**: 仕事状態の復元（タブの一括展開、無視URL適用）
- **US-7**: 仕事の前後関係の可視化（復元関係の記録）
- **US-10**: 無視URL設定によるタブの除外制御（2026-05-28 追加、復元無視のフィルタ点）

## 入力
- 復元対象のWorkState（イベントIDまたはWorkStateオブジェクト）
- ユーザーの復元リクエスト

## 出力
- 新しいウィンドウID
- 復元されたタブIDの配列
- 復元メタデータ（復元日時、復元元イベントID）
- 復元した仕事のタイトル（保存フォームのデフォルト値用。`restoreWorkState` の戻り値に `title` を含める）

## 主要コンポーネント

### 1. Restore Service
**責任**: 仕事状態の復元処理

**主要メソッド**:
- `restoreWorkState(workState)`: 仕事状態を復元
- `createNewWindow()`: 新しいウィンドウを作成
- `openTabsInWindow(windowId, tabs)`: ウィンドウにタブを開く
- `restoreTabsBatch(tabs, windowId)`: タブを段階的に開く（パフォーマンス最適化）

**依存関係**:
- Chrome Windows API (`chrome.windows`)
- Chrome Tabs API (`chrome.tabs`)
- Unit 3 (Calendar API): WorkStateの取得とメタデータ更新

### 2. Tab Restore Manager
**責任**: タブの復元処理と順序管理

**主要メソッド**:
- `restoreTab(tabInfo, windowId)`: 単一タブを復元
- `restoreTabsInOrder(tabs, windowId)`: タブを順番通りに復元
- `handleRestoreError(tabInfo, error)`: 復元エラーを処理

### 3. Restore Metadata Manager
**責任**: 復元時のメタデータ管理

**主要メソッド**:
- `recordRestore(workStateId, restoredAt)`: 復元を記録
- `updateRestoreRelation(fromEventId, toEventId)`: 復元関係を更新
- `getRestoreChain(eventId)`: 復元チェーンを取得

**依存関係**:
- Unit 3 (Calendar API): メタデータの更新

### 4. Progress Manager
**責任**: 復元進捗の管理とUI通知

**主要メソッド**:
- `startRestore(totalTabs)`: 復元を開始
- `updateProgress(completedTabs, totalTabs)`: 進捗を更新
- `completeRestore()`: 復元を完了

**依存関係**:
- Unit 5 (UI/UX): プログレスインジケーターの表示

## 技術スタック
- **言語**: TypeScript
- **API**: 
  - Chrome Windows API
  - Chrome Tabs API

## データフロー
1. ユーザーが保存済み仕事を選択し、「復元」ボタンをクリック
2. Restore ServiceがWorkStateを取得（Unit 3から）
3. **(2026-05-28 追加)** Unit-7 の `IgnoreRulesService.list()` で現在のルール一覧を取得
4. **(2026-05-28 追加)** `ignoreOnRestore=true` のルールに部分一致する `TabInfo` を WorkState の `tabs[]` から除外し、復元対象 `tabsToRestore` を確定する
5. **(2026-05-28 追加)** `tabsToRestore.length === 0` の場合は新規ウィンドウを作らず、UI に警告メッセージを返して終了する
6. 新しいウィンドウを作成
7. `tabsToRestore` を段階的に開く（パフォーマンス最適化）
8. 復元完了後、メタデータを記録（Unit 3に依頼）。記録されるメタデータは元 WorkState の `eventId` であり、フィルタの有無に関わらず変わらない
9. プログレスインジケーターを更新

> **ルール未登録時**: ステップ 3〜5 のフィルタは空集合となり、従来挙動と完全に一致する。

## パフォーマンス最適化
- **段階的なタブ読み込み**: 
  - 一度に5個ずつタブを開く
  - 各バッチの間に100msの待機時間を設ける
- **最大タブ数の制限**: 
  - 30個を超える場合は警告を表示
  - ユーザーに確認を求める
- **遅延読み込み**: 
  - タブを開いた後、実際のページ読み込みを遅延させる（オプション）

## エラーハンドリング
- **タブ復元エラー**: 
  - 無効なURL: エラーメッセージを表示し、他のタブは開き続ける
  - ネットワークエラー: リトライを促す
- **ウィンドウ作成エラー**: エラーメッセージを表示
- **部分的な復元**: 成功したタブは開いたまま、失敗したタブのリストを表示

## パフォーマンス要件
- **復元時間**: 10個のタブを5秒以内で復元（NFR-001）
- **大量タブ**: 20個以上のタブは段階的に読み込む

## テスト戦略
- **ユニットテスト**: 
  - Restore Serviceのモックテスト
  - タブ復元ロジックのテスト
- **統合テスト**: 
  - 実際のChrome環境での復元テスト
  - 大量タブ（10個、20個、30個）でのパフォーマンステスト
  - エラーケースのテスト（無効なURLなど）

## 依存関係
- **外部依存**: 
  - Chrome Windows API
  - Chrome Tabs API
- **内部依存**: 
  - Unit 3 (Calendar API): WorkStateの取得とメタデータ更新
  - Unit 5 (UI/UX): プログレスインジケーター

## 他のUnitsとのインターフェース
- **Unit 3 (Calendar API)**: 
  - WorkStateの取得
  - 復元メタデータの記録
- **Unit 5 (UI/UX)**: 
  - 復元ボタンのUI（サイドパネル）
  - プログレスインジケーター
  - 復元対象が0件のときの警告表示（2026-05-28 追加）
- **Unit 7 (URL Filter)（2026-05-28 追加）**:
  - `IgnoreRulesService.list()` で現在のルール一覧を取得し、`ignoreOnRestore` のフィルタを適用する
- **Content Script（Google Calendar）**: 
  - 予定詳細画面からの復元リクエスト。既存の `RESTORE_WORK_STATE` メッセージ（payload: `{ eventId }`）を送信し、Service Worker が既存の復元フロー（ステップ3〜9含む）で処理する。

## 実装の優先順位
**優先度**: 高（コア機能）

## リスク
- **RISK-004**: 大量のタブ復元時のパフォーマンス問題（軽減策: 段階的なタブ読み込み、最大タブ数の制限）

## 成功基準
- [ ] 保存済み仕事状態を正常に復元できる
- [ ] 新しいウィンドウでタブが開かれる
- [ ] タブの順序が保持される
- [ ] 10個のタブを5秒以内で復元できる
- [ ] 大量タブ（20個以上）が段階的に読み込まれる
- [ ] 復元関係が適切に記録される
- [ ] エラーが適切に処理される
- [ ] **無視URL設定（Unit-7）と連携し、`ignoreOnRestore` のタブが復元対象から除外される（2026-05-28 追加）**
- [ ] **WorkState 自体（カレンダー上のデータ）はフィルタによって変更されない（履歴保持、2026-05-28 追加）**
- [ ] **復元対象が0件になった場合、新規ウィンドウを作らず警告メッセージを表示する（2026-05-28 追加）**
- [ ] **ルール未登録時は従来挙動と完全に一致する（後方互換性、2026-05-28 追加）**
- [ ] ユニットテストのカバレッジが80%以上

---

**作成日**: 2026-01-21  
**最終更新**: 2026-05-28（無視URL設定との連携を追加）  
**ステータス**: 設計完了
