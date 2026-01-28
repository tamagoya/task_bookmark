# Bolt 5 実行計画: 保存済み仕事一覧表示

## Bolt 5の概要
- **スコープ**: カレンダーから保存済み仕事状態の取得、一覧表示UI、検索・フィルタリング機能
- **期間**: 1週間（5営業日）
- **成果物**: 一覧表示UI、検索・フィルタリング機能、ファビコンサムネイル表示

## 前提条件
- ✅ Bolt 1完了（認証機能）
- ✅ Bolt 2完了（Calendar API連携）
- ✅ Bolt 3完了（タブキャプチャ）
- ✅ Bolt 4完了（仕事状態の保存）

## 既存の実装資産

### 再利用可能なサービス
| サービス | ファイル | 用途 |
|---------|---------|------|
| CalendarEventService | `src/application/services/calendar-event-service.ts` | `getWorkStateEvents`メソッドが実装済み |
| CalendarEventRepository | `src/infrastructure/repositories/calendar-event-repository-impl.ts` | `findByDateRange`メソッドが実装済み |
| WorkState | `src/domain/entities/work-state.ts` | 仕事状態エンティティ |
| TabInfo | `src/domain/value-objects/tab-info.ts` | タブ情報Value Object |

### 必要な新規実装
1. **Service Workerメッセージハンドラー** - `GET_WORK_STATE_EVENTS` メッセージ処理
2. **一覧表示UI** - サイドパネルに保存済み仕事一覧を表示
3. **検索機能** - 仕事名での検索
4. **フィルタリング機能** - 日付フィルタリング（今日、今週、今月）
5. **ファビコンサムネイル表示** - 最初の数個のタブのファビコンを表示

---

## AI-DLCコマンド実行順序

### Phase 1: 設計確認と準備（0.5日目）

#### ステップ1: 既存設計の確認
**作業内容**: 既存のドメインモデルとアーキテクチャ設計を確認

**確認対象**:
- `aidlc-docs/design-artifacts/domain-models/unit-03-calendar-api_domain_model.md`
- `aidlc-docs/design-artifacts/logical-designs/unit-03-calendar-api_logical_design.md`
- `aidlc-docs/story-artifacts/user_stories.md` (US-4)

**注意**: Unit 3のドメインモデルとアーキテクチャは既に設計済み。追加の設計は不要。

---

### Phase 2: コード実装（2-4日目）

#### ステップ2: コード生成
**コマンド**: `/aidlc-code-generation "Bolt 5: 保存済み仕事一覧表示"`

**目的**: 
- Service Workerメッセージハンドラーの実装
- 一覧表示UIの実装
- 検索・フィルタリング機能の実装

**実装内容**:

##### 2.1 Service Workerメッセージハンドラー
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

##### 2.2 サイドパネルUI拡張
```
FRONTEND/sidepanel/
├── sidepanel.html (拡張)
├── sidepanel.css (拡張)
└── sidepanel.ts (拡張)
```

**追加UI要素**:
- 保存済み仕事一覧セクション
- 検索入力欄
- フィルタリングボタン（今日、今週、今月）
- ローディングインジケーター
- エラーメッセージと再試行ボタン
- ファビコンサムネイル表示

##### 2.3 検索・フィルタリング機能
```typescript
// sidepanel/sidepanel.ts (拡張)
// 検索機能
function filterWorkStatesBySearch(workStates: WorkState[], searchQuery: string): WorkState[] {
  if (!searchQuery.trim()) {
    return workStates;
  }
  const query = searchQuery.toLowerCase();
  return workStates.filter(ws => ws.title.toLowerCase().includes(query));
}

// フィルタリング機能
function getDateRange(filter: 'today' | 'thisWeek' | 'thisMonth'): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  switch (filter) {
    case 'today':
      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      return { startDate, endDate };
    case 'thisWeek':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return { startDate: weekStart, endDate };
    case 'thisMonth':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: monthStart, endDate };
    default:
      // 過去30日分（デフォルト）
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return { startDate: thirtyDaysAgo, endDate };
  }
}
```

---

### Phase 3: テスト（4-5日目）

#### ステップ3: テスト実行とカバレッジ確認
**手動実行**: テストの実行とカバレッジ確認

**テスト対象**:
- Service Workerメッセージハンドラーのテスト
- 検索・フィルタリング機能のテスト
- UIコンポーネントの手動テスト

**成功基準**:
- ユニットテストのカバレッジ80%以上
- 過去30日分の取得が3秒以内で完了する

---

### Phase 4: 統合と動作確認（5日目）

#### ステップ4: Chromeでの動作確認
**手動実行**: 拡張機能の動作確認

**確認項目**:
- [ ] 保存済み仕事一覧が時系列で表示される
- [ ] 仕事名で検索できる
- [ ] 日付でフィルタリングできる（今日、今週、今月）
- [ ] ファビコンサムネイルが表示される
- [ ] ローディングインジケーターが表示される
- [ ] エラー時に再試行ボタンが表示される
- [ ] 過去30日分の取得が3秒以内で完了する

---

## 実装詳細

### UIデザイン（ワイヤーフレーム）

```
┌─────────────────────────────────────┐
│  タスクブックマーク                   │
├─────────────────────────────────────┤
│  認証状態: 認証済み    [ログアウト]   │
├─────────────────────────────────────┤
│  ■ 現在のタブ (5)                   │
│  ...                                │
├─────────────────────────────────────┤
│  ■ 仕事状態を保存                    │
│  ...                                │
├─────────────────────────────────────┤
│  ■ 保存済み仕事                      │
│  ┌─────────────────────────────────┐│
│  │ [検索: ___________]             ││
│  │ [今日] [今週] [今月] [すべて]   ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ 📄 プロジェクトAの調査           ││
│  │ 🌐🌐🌐 (5タブ)                  ││
│  │ 2026-01-22 10:00 - 10:30        ││
│  ├─────────────────────────────────┤│
│  │ 📄 API仕様確認                   ││
│  │ 🌐🌐 (3タブ)                    ││
│  │ 2026-01-22 09:00 - 09:30        ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### メッセージフロー

```
サイドパネル                Service Worker              Google Calendar
    │                           │                           │
    │──GET_WORK_STATE_EVENTS───>│                           │
    │  {startDate, endDate}     │                           │
    │                           │──findByDateRange()───────>│
    │                           │<─────events[]─────────────│
    │<─────workStates[]─────────│                           │
    │                           │                           │
```

---

## 実行順序のサマリー

```
1. 既存設計の確認                           → 準備（0.5日）
2. /aidlc-code-generation "Bolt 5"         → コード実装（2.5日）
3. テスト実行とカバレッジ確認               → テスト（1日）
4. Chromeでの動作確認                       → 統合（1日）
```

---

## 受け入れ基準

Bolt 5が完了したとみなす条件：
- [x] 保存済み仕事状態を時系列で表示できる
- [x] 仕事名で検索できる
- [x] 日付でフィルタリング（今日、今週、今月）できる
- [x] ファビコンサムネイルが表示される
- [x] 過去30日分の取得が3秒以内で完了する
- [x] ユニットテストのカバレッジが80%以上

---

## リスク管理

| リスク | 影響度 | 発生確率 | 軽減策 |
|--------|--------|----------|--------|
| Google Calendar APIレート制限 | 中 | 低 | キャッシュの活用、日付範囲の制限 |
| 大量データ取得時のパフォーマンス問題 | 中 | 中 | デフォルトで過去30日分のみ取得、ページネーション検討 |
| UIの複雑化 | 低 | 中 | シンプルなUI設計、段階的な機能追加 |

---

## パフォーマンス要件

- **過去30日分の取得**: 3秒以内で完了
- **検索・フィルタリング**: クライアント側で実行（即座に反映）
- **ファビコン読み込み**: 非同期で読み込み、エラー時はデフォルトアイコン

---

**作成日**: 2026-01-22  
**最終更新**: 2026-01-22  
**ステータス**: 実装完了・動作確認完了  
**確認完了日**: 2026-01-22
