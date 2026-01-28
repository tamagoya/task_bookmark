# Bolt 5: 保存済み仕事一覧表示 - コード生成計画

## 概要
Bolt 5「保存済み仕事一覧表示」のコード生成計画です。カレンダーから保存済み仕事状態を取得し、一覧表示UI、検索・フィルタリング機能を実装します。

## 実装範囲

### 新規実装
1. **Service Workerメッセージハンドラー**
   - `GET_WORK_STATE_EVENTS`: 保存済み仕事状態の取得

2. **サイドパネルUI拡張**
   - 保存済み仕事一覧セクション
   - 検索入力欄
   - フィルタリングボタン（今日、今週、今月、すべて）
   - ローディングインジケーター
   - エラーメッセージと再試行ボタン
   - ファビコンサムネイル表示

3. **検索・フィルタリング機能**
   - クライアント側検索機能（仕事名）
   - 日付範囲計算機能（今日、今週、今月、過去30日）

### 既存実装の活用
- `CalendarEventService.getWorkStateEvents` - カレンダーイベントの一覧取得
- `CalendarEventRepository.findByDateRange` - 日付範囲での取得
- `WorkState` - 仕事状態エンティティ
- `WorkStateMetadata` - メタデータ（タブ情報、メモ）
- `TabInfo` - タブ情報Value Object

---

## 実行ステップ

### ステップ1: Domain ModelとLogical Designの読み込み ✅
- [x] Unit 3のDomain Modelを確認
- [x] Unit 3のLogical Designを確認
- [x] User Story 4の要件を確認
- [x] 既存実装の状態を確認

### ステップ2: コード構造の設計
- [ ] Service Workerのメッセージハンドラー設計
- [ ] サイドパネルUIの構造設計
- [ ] 検索・フィルタリング機能の設計

### ステップ3: ドメイン層の実装（TDD）
- [ ] 既存のドメイン層は実装済み（変更不要）

### ステップ4: アプリケーション層の実装（TDD）
- [ ] 既存のアプリケーション層は実装済み（変更不要）

### ステップ5: インフラストラクチャ層の実装（TDD）
- [ ] Service Workerメッセージハンドラーの実装
- [ ] テストを先に書く（RED）
- [ ] 実装を書く（GREEN）
- [ ] リファクタリング（IMPROVE）

### ステップ6: UI層の実装
- [ ] サイドパネルHTMLの拡張
- [ ] サイドパネルCSSの拡張
- [ ] サイドパネルTypeScriptの拡張
- [ ] 一覧表示機能
- [ ] 検索機能
- [ ] フィルタリング機能
- [ ] ローディング・エラー表示

### ステップ7: ユニットテストの生成（TDD）
- [ ] Service Workerメッセージハンドラーのテスト
- [ ] 検索・フィルタリング機能のテスト
- [ ] UIコンポーネントのテスト（可能な範囲）

### ステップ8: テストの実行とカバレッジ確認
- [ ] すべてのテストを実行
- [ ] カバレッジ80%以上を確認
- [ ] 失敗したテストを修正

### ステップ9: ビルドエラーの確認と修正
- [ ] TypeScriptコンパイルエラーの確認
- [ ] ビルドエラーの修正
- [ ] ビルド成功を確認

### ステップ10: コードレビュー
- [ ] コード品質の確認
- [ ] セキュリティチェック
- [ ] パフォーマンスチェック
- [ ] レビュー結果の記録

### ステップ11: セキュリティレビュー
- [ ] OWASP Top 10の確認
- [ ] ハードコードされた秘密情報の確認
- [ ] 入力検証の確認
- [ ] セキュリティレビュー結果の記録

### ステップ12: 結果の分析と修正提案
- [ ] テスト結果の分析
- [ ] コードレビュー結果の分析
- [ ] セキュリティレビュー結果の分析
- [ ] 修正提案の生成
- [ ] 結果ドキュメントの作成

---

## 実装詳細

### Service Workerメッセージハンドラー

```typescript
// background/service-worker.ts (拡張)
case 'GET_WORK_STATE_EVENTS':
  try {
    const { startDate, endDate } = message.payload as { startDate: string; endDate: string };
    
    // 認証状態を確認
    const authState = await authRepository.getCurrent();
    if (!authState || !authState.calendarId || !authState.accessToken) {
      sendResponse({ success: false, error: 'Not authenticated' });
      break;
    }

    // 仕事状態を取得
    const workStates = await calendarEventService.getWorkStateEvents(
      new Date(startDate),
      new Date(endDate),
      authState.calendarId,
      authState.accessToken
    );

    // UI用にフォーマット
    sendResponse({ 
      success: true, 
      workStates: workStates.map(ws => ({
        eventId: ws.eventId.value,
        title: ws.title.value,
        startTime: ws.startTime.toISOString(),
        endTime: ws.endTime.toISOString(),
        tabCount: ws.metadata?.tabs.length || 0,
        favicons: ws.metadata?.tabs.slice(0, 5).map(tab => tab.faviconUrl).filter(Boolean) || [],
        memo: ws.metadata?.memo,
        isCorrupted: ws.isCorrupted,
      }))
    });
  } catch (error) {
    logger.error('Failed to get work state events', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
  break;
```

### サイドパネルUI

```typescript
// sidepanel/sidepanel.ts (拡張)
// 保存済み仕事一覧の読み込み
async function loadWorkStateEvents(filter: 'today' | 'thisWeek' | 'thisMonth' | 'all' = 'all'): Promise<void> {
  // 日付範囲を計算
  // GET_WORK_STATE_EVENTSメッセージを送信
  // 一覧を表示
}

// 検索機能
function filterWorkStatesBySearch(workStates: WorkStateListItem[], searchQuery: string): WorkStateListItem[] {
  // クライアント側でフィルタリング
}

// フィルタリング機能
function getDateRange(filter: 'today' | 'thisWeek' | 'thisMonth' | 'all'): { startDate: Date; endDate: Date } {
  // 日付範囲を計算
}
```

---

## 受け入れ基準

- [ ] 保存済み仕事状態を時系列で表示できる
- [ ] 仕事名で検索できる
- [ ] 日付でフィルタリング（今日、今週、今月）できる
- [ ] ファビコンサムネイルが表示される
- [ ] 過去30日分の取得が3秒以内で完了する
- [ ] ユニットテストのカバレッジが80%以上

---

**作成日**: 2026-01-22  
**ステータス**: 計画作成完了
