# Bolt 4 実行計画: 仕事状態の保存

## Bolt 4の概要
- **スコープ**: タブ情報とメタデータのカレンダーイベントへの保存、保存フォームUI
- **期間**: 2週間（10営業日）
- **成果物**: 保存フォームUI、保存ワークフロー、ユーザーフィードバック

## 前提条件
- ✅ Bolt 1完了（認証機能）
- ✅ Bolt 2完了（Calendar API連携、CalendarEventService実装済み）
- ✅ Bolt 3完了（タブキャプチャ、TabCaptureService実装済み）

## 既存の実装資産

### 再利用可能なサービス
| サービス | ファイル | 用途 |
|---------|---------|------|
| CalendarEventService | `src/application/services/calendar-event-service.ts` | カレンダーイベントのCRUD操作 |
| TabCaptureService | `src/application/services/tab-capture-service.ts` | タブ情報の取得 |
| WorkStateFactory | `src/domain/factories/work-state-factory.ts` | WorkState作成 |
| EventDescription | `src/domain/value-objects/event-description.ts` | JSON形式データの管理 |

### 必要な新規実装
1. **保存フォームUI** - サイドパネルに統合
2. **保存ワークフローサービス** - TabCaptureとCalendarEventの統合
3. **Service Workerメッセージハンドラー** - SAVE_WORK_STATE メッセージ処理
4. **UIフィードバック** - 成功/失敗メッセージ、ローディング状態

---

## AI-DLCコマンド実行順序

### Phase 1: 設計確認と準備（1日目）

#### ステップ1: 既存設計の確認
**作業内容**: 既存のドメインモデルとアーキテクチャ設計を確認

**確認対象**:
- `aidlc-docs/design-artifacts/domain-models/unit-03-calendar-api_domain_model.md`
- `aidlc-docs/design-artifacts/logical-designs/unit-03-calendar-api_logical_design.md`
- `aidlc-docs/story-artifacts/user_stories.md` (US-3)

**注意**: Unit 3のドメインモデルとアーキテクチャは既に設計済み。追加の設計は不要。

---

### Phase 2: コード実装（2-7日目）

#### ステップ2: コード生成
**コマンド**: `/aidlc-code-generation "Bolt 4: 仕事状態の保存"`

**目的**: 
- 保存フォームUIの実装
- 保存ワークフローの実装
- Service Workerとの統合

**実装内容**:

##### 2.1 サイドパネルUI拡張
```
FRONTEND/sidepanel/
├── sidepanel.html (拡張)
├── sidepanel.css (拡張)
└── sidepanel.ts (拡張)
```

**追加UI要素**:
- タブ一覧表示セクション
- 保存フォーム（仕事名入力、メモ入力）
- 保存ボタン
- ローディングインジケーター
- 成功/失敗メッセージ

##### 2.2 保存ワークフローサービス
```typescript
// src/application/services/save-workflow-service.ts
export class SaveWorkflowService {
  constructor(
    private tabCaptureService: TabCaptureService,
    private calendarEventService: CalendarEventService,
    private workStateFactory: WorkStateFactory
  ) {}

  async saveCurrentTabs(title: string, memo?: string): Promise<void> {
    // 1. 現在のタブを取得
    // 2. WorkStateを作成
    // 3. カレンダーイベントとして保存
  }
}
```

##### 2.3 Service Workerメッセージハンドラー
```typescript
// background/service-worker.ts (拡張)
// 追加するメッセージタイプ:
// - GET_CURRENT_TABS: 現在のタブ一覧を取得
// - SAVE_WORK_STATE: 仕事状態を保存
```

---

### Phase 3: テスト（8-9日目）

#### ステップ3: テスト実行とカバレッジ確認
**手動実行**: テストの実行とカバレッジ確認

**テスト対象**:
- 保存ワークフローサービスのユニットテスト
- Service Workerメッセージハンドラーのテスト
- UIコンポーネントの手動テスト

**成功基準**:
- ユニットテストのカバレッジ80%以上
- 保存時間が2秒以内（p50）

---

### Phase 4: 統合と動作確認（10日目）

#### ステップ4: Chromeでの動作確認
**手動実行**: 拡張機能の動作確認

**確認項目**:
- [ ] サイドパネルにタブ一覧が表示される
- [ ] 仕事名とメモを入力できる
- [ ] 保存ボタンをクリックするとカレンダーイベントが作成される
- [ ] 保存成功時に成功メッセージが表示される
- [ ] 保存失敗時にエラーメッセージが表示される
- [ ] Googleカレンダーにイベントが表示される

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
│  ┌─────────────────────────────────┐│
│  │ 🌐 Google - https://google.com ││
│  │ 📄 GitHub - https://github.com ││
│  │ 📄 Docs - https://docs.google..││
│  │ ...                            ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  ■ 仕事状態を保存                    │
│  ┌─────────────────────────────────┐│
│  │ 仕事名 *                        ││
│  │ [________________________]     ││
│  │                                ││
│  │ メモ（任意）                     ││
│  │ [________________________]     ││
│  │ [________________________]     ││
│  │                                ││
│  │ [      保存する      ]         ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  ✅ 保存しました                     │
└─────────────────────────────────────┘
```

### メッセージフロー

```
サイドパネル                Service Worker              Google Calendar
    │                           │                           │
    │──GET_CURRENT_TABS────────>│                           │
    │<─────tabs[]───────────────│                           │
    │                           │                           │
    │  (ユーザーが仕事名入力)     │                           │
    │                           │                           │
    │──SAVE_WORK_STATE─────────>│                           │
    │  {title, memo, tabs}      │                           │
    │                           │──createEvent()───────────>│
    │                           │<─────eventId──────────────│
    │<─────success──────────────│                           │
    │                           │                           │
```

---

## 実行順序のサマリー

```
1. 既存設計の確認                           → 準備（0.5日）
2. /aidlc-code-generation "Bolt 4"         → コード実装（5日）
3. テスト実行とカバレッジ確認               → テスト（2日）
4. Chromeでの動作確認                       → 統合（1日）
5. コードレビューと修正                     → 品質保証（1.5日）
```

---

## 受け入れ基準

Bolt 4が完了したとみなす条件：
- [ ] タブ情報とメタデータをカレンダーイベントとして保存できる
- [ ] イベント説明欄にJSON形式でデータが保存される
- [ ] 保存フォームで仕事名とメモを入力できる
- [ ] 保存成功・失敗時に適切なメッセージが表示される
- [ ] 保存時間が2秒以内（p50）
- [ ] ユニットテストのカバレッジが80%以上

---

## リスク管理

| リスク | 影響度 | 発生確率 | 軽減策 |
|--------|--------|----------|--------|
| Google Calendar APIレート制限 | 中 | 低 | 既存のRetryHandlerを活用 |
| 大量タブ時の保存失敗 | 中 | 中 | タブ数制限の警告表示 |
| UIとService Worker通信エラー | 低 | 低 | エラーハンドリングの強化 |

---

**作成日**: 2026-01-22  
**最終更新**: 2026-01-22  
**ステータス**: 計画完了
