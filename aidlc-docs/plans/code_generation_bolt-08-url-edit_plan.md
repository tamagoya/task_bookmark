# Code Generation計画: Bolt 8 - URL編集機能

## 概要
Bolt 8（URL編集機能）のコード生成を実行します。Domain ModelとLogical Designに基づいて、URL編集機能の実装とユニットテストを生成します。

## 対象User Story
- **US-6**: 保存済みURLの編集

## 実装ステップ

### ステップ1: Domain ModelとLogical Designの読み込み
- [x] `unit-03-calendar-api_domain_model.md`を確認（URL編集機能の拡張が追加済み）
- [x] `unit-03-calendar-api_logical_design.md`を確認
- [x] 既存のコードベースを確認（`CalendarEventService`, `WorkState`）

### ステップ2: コード構造の設計
- [ ] レイヤードアーキテクチャに基づいて構造を設計：
  - Domain Layer: `WorkState`エンティティにURL編集メソッドを追加
  - Application Layer: `CalendarEventService`にURL編集メソッドを追加
  - Infrastructure Layer: 既存の`CalendarEventRepositoryImpl`を活用
  - Presentation Layer: UIコンポーネント（Unit 5の責任範囲、今回は実装しない）

### ステップ3: ドメイン層の実装
- [ ] `WorkState`エンティティにURL編集メソッドを追加：
  - `updateTabs(newTabs: TabInfo[]): WorkState` - タブリスト全体を更新
  - `addTab(tab: TabInfo, index?: number): WorkState` - タブを追加
  - `removeTab(tabIndex: number): WorkState` - タブを削除
  - `reorderTabs(fromIndex: number, toIndex: number): WorkState` - タブの順序を変更
  - `validateTabList(tabs: TabInfo[]): ValidationError[]` - タブリストのバリデーション
- [ ] `TabsUpdated` Domain Eventを実装（既にDomain Modelに定義済みか確認）
- [ ] イミュータビリティを保証（新しいインスタンスを返す）

### ステップ4: アプリケーション層の実装
- [ ] `CalendarEventService`にURL編集メソッドを追加：
  - `updateWorkStateTabs(eventId: EventId, newTabs: TabInfo[], calendarId: CalendarId, accessToken: AccessToken): Promise<void>`
  - `addTabToWorkState(eventId: EventId, tab: TabInfo, index: number | undefined, calendarId: CalendarId, accessToken: AccessToken): Promise<void>`
  - `removeTabFromWorkState(eventId: EventId, tabIndex: number, calendarId: CalendarId, accessToken: AccessToken): Promise<void>`
  - `reorderWorkStateTabs(eventId: EventId, fromIndex: number, toIndex: number, calendarId: CalendarId, accessToken: AccessToken): Promise<void>`
- [ ] 各メソッドで既存のWorkStateを取得し、ドメイン層のメソッドを呼び出し、Repositoryで更新
- [ ] `TabsUpdated` Domain Eventを発行

### ステップ5: インフラストラクチャ層の実装
- [ ] 既存の`CalendarEventRepositoryImpl.update`メソッドを活用（変更不要）
- [ ] 既存の`GoogleCalendarAdapter.updateEvent`メソッドを活用（変更不要）

### ステップ6: EventHandlerの拡張
- [ ] `EventHandler`に`handleTabsUpdated`メソッドを追加
- [ ] `TabsUpdated` Domain Eventを処理

### ステップ7: ユニットテストの生成（TDDワークフロー）
- [ ] `WorkState`エンティティのURL編集メソッドのテストを先に記述（RED）
  - `updateTabs`のテスト
  - `addTab`のテスト
  - `removeTab`のテスト
  - `reorderTabs`のテスト
  - `validateTabList`のテスト
- [ ] テストを実行して失敗を確認
- [ ] 最小限の実装を記述（GREEN）
- [ ] テストを実行して成功を確認
- [ ] リファクタリング（IMPROVE）
- [ ] `CalendarEventService`のURL編集メソッドのテストを記述
- [ ] `EventHandler.handleTabsUpdated`のテストを記述
- [ ] テストカバレッジを最大化（80%以上を目標）

### ステップ8: テストの実行とカバレッジ確認
- [ ] すべてのユニットテストを実行
- [ ] テストカバレッジを確認（80%以上を目標）
- [ ] 失敗したテストを特定
- [ ] 結果を記録

### ステップ9: ビルドエラーの確認と修正
- [ ] ビルドを実行：`npm run build`
- [ ] TypeScript型チェックを実行：`npx tsc --noEmit`
- [ ] ビルドエラーがある場合、最小限の変更で修正
- [ ] ビルドが成功するまで繰り返す

### ステップ10: コードレビュー
- [ ] 生成されたコードの品質をレビュー
- [ ] コード品質の問題を特定
- [ ] パフォーマンスの問題を特定
- [ ] ベストプラクティスの推奨
- [ ] CriticalまたはHighの問題がある場合、修正を実行

### ステップ11: セキュリティレビュー
- [ ] OWASP Top 10の分析を実行
- [ ] 脆弱性パターンの検出
- [ ] セキュリティチェックリストを確認
- [ ] CRITICAL問題がある場合、即座に停止し、修正を推奨

### ステップ12: 結果の分析と修正提案
- [ ] テスト結果を分析
- [ ] コードレビュー結果を分析
- [ ] セキュリティレビュー結果を分析
- [ ] 失敗の原因を特定
- [ ] 修正提案を生成
- [ ] `code_generation_bolt-08-url-edit_test_results.md`に結果を保存
- [ ] ユーザーに修正提案を提示

## 実装上の注意事項

### イミュータビリティ
- `WorkState`のURL編集メソッドは、新しいインスタンスを返す必要がある
- 既存のインスタンスを変更してはならない

### バリデーション
- タブリストは空であってはならない
- インデックスは連続している必要がある（0, 1, 2, ...）
- 最後の1つのタブは削除不可
- インデックスは範囲内である必要がある

### エラーハンドリング
- バリデーションエラーは`ValidationError[]`として返す
- APIエラーは既存のRetry パターンを活用
- ユーザーフレンドリーな日本語メッセージを提供

### パフォーマンス
- 大量のタブ（100個以上）を編集する場合でも、パフォーマンスが許容範囲内であることを確認
- バリデーションは効率的に実行

## 成功基準
- [ ] URL編集機能が実装されている
- [ ] テストカバレッジが80%以上
- [ ] ビルドが成功する
- [ ] コードレビューでCriticalまたはHighの問題がない
- [ ] セキュリティレビューでCRITICAL問題がない
- [ ] 既存のコードベースとの統合がスムーズ

---

**作成日**: 2026-02-03  
**ステータス**: 実装完了・テスト完了
