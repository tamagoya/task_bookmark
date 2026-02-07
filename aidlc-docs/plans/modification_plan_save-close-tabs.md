# 改修計画: 保存時にタブを閉じる機能

## 概要

作業状態をリセットして別の作業に取り掛かり始められるように、保存ボタンを押した時に、保存されたタブを閉じる機能を追加します。

## 新規要件

**要件**: 保存ボタンを押した時に、保存されたタブを閉じる

**ビジネス価値**: 
- 作業状態をリセットして、新しい作業に集中できる
- タブが増えすぎることを防ぐ
- 保存後のクリーンアップを自動化

**受け入れ基準**:
- [ ] 保存成功後、保存したタブが自動的に閉じられる
- [ ] タブを閉じる際のエラーハンドリングが適切に行われる
- [ ] ユーザーが意図しないタブの閉鎖を防ぐ（確認なしで閉じるが、エラー時は通知）

## 影響範囲分析（Impact Analysis）

### 1. User Stories

**影響**: `aidlc-docs/story-artifacts/user_stories.md` の **User Story 3: 仕事状態の保存** に追加要件を追記

**変更内容**:
- 保存成功後の動作として「保存したタブを閉じる」を追加

### 2. Infrastructure Layer

**影響**: `FRONTEND/src/infrastructure/adapters/chrome-tabs-adapter.ts`

**変更内容**:
- `closeTab(tabId: number): Promise<void>` メソッドを追加
- `closeTabs(tabIds: number[]): Promise<void>` メソッドを追加（複数タブを閉じる）

**理由**: Chrome Tabs APIの `chrome.tabs.remove()` をラップする必要がある

### 3. Application Layer

**影響**: `FRONTEND/src/application/services/tab-capture-service.ts`

**変更内容**:
- `closeCurrentWindowTabs(): Promise<void>` メソッドを追加
- 現在のウィンドウのタブを取得して閉じる処理を実装

**理由**: タブを閉じる処理をアプリケーション層で管理する

**影響**: `FRONTEND/src/application/services/optimized-tab-capture-service.ts`

**変更内容**:
- `closeCurrentWindowTabs()` メソッドを追加（ベースサービスの委譲）

**理由**: 最適化されたサービスにも同様の機能を提供

### 4. Presentation Layer

**影響**: `FRONTEND/background/service-worker.ts`

**変更内容**:
- `SAVE_WORK_STATE` メッセージハンドラー内で、保存成功後にタブを閉じる処理を追加
- 保存時に取得したタブIDを保持し、保存成功後に閉じる

**理由**: Service Workerからタブを閉じる処理を実行する必要がある

**影響**: `FRONTEND/sidepanel/sidepanel.ts`

**変更内容**:
- `saveWorkState` 関数内で、保存成功後にタブを閉じるメッセージを送信（オプション）
- または、Service Worker側で自動的に閉じるため、変更不要の可能性

**理由**: UI層からの指示でタブを閉じるか、Service Worker側で自動的に閉じるかを決定

### 5. Domain Layer

**影響**: なし

**理由**: タブを閉じる処理はインフラストラクチャ層の責務であり、ドメインロジックには影響しない

### 6. Tests

**影響**: 
- `FRONTEND/tests/infrastructure/adapters/chrome-tabs-adapter.test.ts` - `closeTab` と `closeTabs` のテストを追加
- `FRONTEND/tests/application/services/tab-capture-service.test.ts` - `closeCurrentWindowTabs` のテストを追加
- `FRONTEND/tests/application/services/optimized-tab-capture-service.test.ts` - `closeCurrentWindowTabs` のテストを追加
- `FRONTEND/tests/application/services/calendar-event-service.test.ts` - 保存後のタブ閉鎖の統合テストを追加（オプション）

**理由**: 新規機能のテストカバレッジを確保

## 実装計画

### フェーズ1: Infrastructure Layer の実装

1. [ ] `ChromeTabsAdapter` に `closeTab` メソッドを追加
2. [ ] `ChromeTabsAdapter` に `closeTabs` メソッドを追加（複数タブを一度に閉じる）
3. [ ] エラーハンドリングを実装（タブが見つからない場合など）
4. [ ] ユニットテストを追加

### フェーズ2: Application Layer の実装

1. [ ] `TabCaptureService` に `closeCurrentWindowTabs` メソッドを追加
2. [ ] `OptimizedTabCaptureService` に `closeCurrentWindowTabs` メソッドを追加（委譲）
3. [ ] エラーハンドリングを実装
4. [ ] ユニットテストを追加

### フェーズ3: Service Worker の統合

1. [ ] `SAVE_WORK_STATE` ハンドラー内で、保存成功後にタブを閉じる処理を追加
2. [ ] 保存時に取得したタブIDを保持
3. [ ] 保存成功後に `TabCaptureService.closeCurrentWindowTabs()` を呼び出す
4. [ ] エラーハンドリングを実装（タブを閉じる際のエラーはログに記録し、保存処理は成功とする）

### フェーズ4: User Stories の更新

1. [ ] `user_stories.md` の User Story 3 に「保存後にタブを閉じる」を追記

### フェーズ5: テストと検証

1. [ ] 全テストを実行して既存機能に影響がないことを確認
2. [ ] 手動テスト: 保存後にタブが閉じられることを確認
3. [ ] エラーケースのテスト: タブを閉じる際のエラーが適切に処理されることを確認

## 技術的考慮事項

### エラーハンドリング

- タブを閉じる際にエラーが発生した場合、保存処理自体は成功として扱う
- エラーはログに記録し、ユーザーには通知しない（保存は成功しているため）
- 一部のタブが閉じられなかった場合でも、エラーをスローせずに続行

### パフォーマンス

- 複数のタブを閉じる際は、`chrome.tabs.remove()` に配列を渡して一度に閉じる
- パフォーマンス監視は既存の `PerformanceInterceptor` で自動的に行われる

### セキュリティ

- Chrome Tabs APIの権限は既に `manifest.json` で設定済み
- 追加の権限は不要

### UX考慮事項

- タブを閉じる際の確認ダイアログは表示しない（要件に基づく）
- 保存成功メッセージは既存の通り表示
- タブが閉じられたことは明示的に通知しない（保存成功メッセージで十分）

## リスク

### 低リスク

- **タブを閉じる際のエラー**: 保存処理は成功しているため、エラーが発生してもユーザーへの影響は最小限
- **既存機能への影響**: 新規機能の追加であり、既存の保存処理には影響しない

### 軽減策

- エラーハンドリングを適切に実装
- 包括的なテストを追加
- 段階的な実装とテスト

## 依存関係

- Chrome Tabs API (`chrome.tabs.remove()`)
- 既存の `ChromeTabsAdapter`
- 既存の `TabCaptureService`

## 次のアクション

1. この計画を承認する
2. `/aidlc-code-generation` コマンドで実装を開始する
3. または、段階的に実装を進める（フェーズごとに承認を求める）

---

**作成日**: 2026-02-04
**ステータス**: ✅ 完了
**承認日**: 2026-02-04
**完了日**: 2026-02-04
**作成者**: Modification & Impact Analysis エージェント

## 実装完了報告

### 実装内容

1. ✅ **User Stories の更新**: User Story 3 に「保存後にタブを閉じる」を追加
2. ✅ **Infrastructure Layer**: `ChromeTabsAdapter` に `closeTab` と `closeTabs` メソッドを追加
3. ✅ **Application Layer**: `TabCaptureService` と `OptimizedTabCaptureService` に `closeCurrentWindowTabs` メソッドを追加
4. ✅ **Service Worker 統合**: `SAVE_WORK_STATE` ハンドラー内で、保存成功後にタブを閉じる処理を追加
5. ✅ **テスト**: 新規機能のテストを追加（ChromeTabsAdapter、TabCaptureService）

### 品質指標

- **ビルド**: ✅ 成功（69.24 KB）
- **全テスト**: ✅ 624テストパス（100%）
- **テストカバレッジ**: 既存のカバレッジを維持

### 実装詳細

#### Infrastructure Layer
- `ChromeTabsAdapter.closeTab(tabId: number)`: 単一タブを閉じる
- `ChromeTabsAdapter.closeTabs(tabIds: number[])`: 複数タブを一度に閉じる（エラーハンドリング付き）

#### Application Layer
- `TabCaptureService.closeCurrentWindowTabs()`: 現在のウィンドウのタブを閉じる
- `OptimizedTabCaptureService.closeCurrentWindowTabs()`: パフォーマンス監視付きでタブを閉じる

#### Service Worker
- `SAVE_WORK_STATE` ハンドラー内で、保存成功後に `optimizedTabCaptureService.closeCurrentWindowTabs()` を呼び出し
- エラーハンドリング: タブを閉じる際のエラーはログに記録し、保存処理は成功として扱う

### 動作確認

- 保存成功後、保存したタブが自動的に閉じられる
- タブを閉じる際のエラーが適切に処理される（ログに記録、保存処理は成功）
- 既存機能への影響なし（全テストパス）
