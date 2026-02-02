# Unit 4: 状態復元機能

## 概要
保存済みの仕事状態を復元し、記録されたタブ群を新しいウィンドウで一括展開する機能を担当するUnitです。復元時のメタデータ（前後関係）も管理します。

## 責任範囲
- 保存済み仕事状態の選択と復元
- タブの一括展開（新しいウィンドウ）
- 復元時のメタデータ記録（復元元・復元先の関係）
- 大量タブ復元時のパフォーマンス最適化

## 関連User Stories
- **US-5**: 仕事状態の復元（タブの一括展開）
- **US-7**: 仕事の前後関係の可視化（復元関係の記録）

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
3. 新しいウィンドウを作成
4. タブを段階的に開く（パフォーマンス最適化）
5. 復元完了後、メタデータを記録（Unit 3に依頼）
6. プログレスインジケーターを更新

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
- **Content Script（Google Calendar）**: 
  - 予定詳細画面からの復元リクエスト。既存の `RESTORE_WORK_STATE` メッセージ（payload: `{ eventId }`）を送信し、Service Worker が既存の復元フローで処理する。

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
- [ ] ユニットテストのカバレッジが80%以上

---

**作成日**: 2026-01-21  
**最終更新**: 2026-01-21  
**ステータス**: 設計完了
