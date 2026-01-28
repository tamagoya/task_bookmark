# Bolt 6 実行計画: 仕事状態の復元

## Bolt 6の概要
- **スコープ**: 保存済み仕事状態の選択と復元、タブの一括展開（新しいウィンドウ）、基本的な復元メタデータの記録
- **期間**: 2週間（10営業日）
- **成果物**: 復元サービス、タブ復元マネージャー、復元ボタンUI、プログレスインジケーター

## 前提条件
- ✅ Bolt 1完了（認証機能）
- ✅ Bolt 2完了（Calendar API連携）
- ✅ Bolt 3完了（タブキャプチャ）
- ✅ Bolt 4完了（仕事状態の保存）
- ✅ Bolt 5完了（保存済み仕事一覧表示）

## 既存の実装資産

### 再利用可能なサービス
| サービス | ファイル | 用途 |
|---------|---------|------|
| CalendarEventService | `src/application/services/calendar-event-service.ts` | `getWorkStateEvents`メソッドが実装済み、復元メタデータ更新用に拡張可能 |
| CalendarEventRepository | `src/infrastructure/repositories/calendar-event-repository-impl.ts` | `findById`メソッドが実装済み、復元メタデータ更新用に`update`メソッドが利用可能 |
| WorkState | `src/domain/entities/work-state.ts` | 仕事状態エンティティ、`recordRestoredFrom`メソッドが実装済み |
| WorkStateFactory | `src/domain/factories/work-state-factory.ts` | `createWithRestoreRelation`メソッドが実装済み |
| WorkStateMetadata | `src/domain/value-objects/work-state-metadata.ts` | `restoredFrom`、`restoredTo`フィールドが実装済み |
| ChromeTabsAdapter | `src/infrastructure/adapters/chrome-tabs-adapter.ts` | タブ情報取得は実装済み、タブを開く機能は未実装 |
| ChromeWindowsAdapter | `src/infrastructure/adapters/chrome-windows-adapter.ts` | ウィンドウ情報取得は実装済み、新しいウィンドウ作成機能は未実装 |
| TabInfo | `src/domain/value-objects/tab-info.ts` | タブ情報Value Object |

### 必要な新規実装
1. **ChromeTabsAdapterの拡張** - `createTab`、`createTabs`メソッドの追加
2. **ChromeWindowsAdapterの拡張** - `createWindow`メソッドの追加
3. **RestoreService** - 仕事状態の復元処理を担当するサービス
4. **TabRestoreManager** - タブの復元処理と順序管理を担当するマネージャー
5. **Service Workerメッセージハンドラー** - `RESTORE_WORK_STATE` メッセージ処理
6. **復元ボタンUI** - サイドパネルに復元ボタンを追加
7. **プログレスインジケーター** - 復元中の進捗を表示

---

## AI-DLCコマンド実行順序

### Phase 1: 設計確認と準備（1-2日目）

#### ステップ1: 既存設計の確認
**作業内容**: 既存のUnit定義と関連設計を確認

**確認対象**:
- `aidlc-docs/design-artifacts/units/unit-04-restore.md`（Unit定義は存在）
- `aidlc-docs/design-artifacts/domain-models/unit-03-calendar-api_domain_model.md`（復元メタデータ部分）
- `aidlc-docs/story-artifacts/user_stories.md` (US-5)
- `aidlc-docs/requirements/nfrs.md`（パフォーマンス要件）

**確認ポイント**:
- 復元メタデータの構造（`restoredFrom`、`restoredTo`）
- パフォーマンス要件（10タブを5秒以内）
- 大量タブ復元時の段階的読み込み要件（20個以上は段階的に）

**注意**: Unit 4のUnit定義は存在するが、詳細な設計ドキュメント（ドメインモデル、論理設計、ADR）は未作成。ただし、Unit 4は既存のドメインモデル（Unit 3のWorkState、WorkStateMetadataなど）を再利用するため、新しいドメインモデルは不要。論理設計とADRは必要に応じて作成する。

#### ステップ1.5: 必要に応じた設計ドキュメントの作成（オプション）
**作業内容**: 必要に応じて論理設計とADRを作成

**判断基準**:
- 既存のUnit定義（`unit-04-restore.md`）で十分な詳細が記載されている場合は、設計ドキュメントの作成をスキップ可能
- 複雑なアーキテクチャ決定が必要な場合は、ADRを作成
- レイヤー構造やデータフローが不明確な場合は、論理設計を作成

**必要に応じて作成するドキュメント**:
- `aidlc-docs/design-artifacts/logical-designs/unit-04-restore_logical_design.md`（レイヤー構造、データフロー、コンポーネント間の相互作用）
- `aidlc-docs/design-artifacts/adrs/unit-04-restore_adr-013-*.md`（重要なアーキテクチャ決定）

**注意**: Bolt 6では基本的な復元機能のみを実装。Bolt 7で復元メタデータと前後関係の可視化を実装する。

---

### Phase 2: コード実装（5-8日目）

#### ステップ2: コード生成
**コマンド**: `/aidlc-code-generation "Bolt 6: 仕事状態の復元"`

**目的**: 
- Chrome API Adapterの拡張（タブ作成、ウィンドウ作成）
- 復元サービスの実装
- タブ復元マネージャーの実装
- Service Workerメッセージハンドラーの実装
- 復元ボタンUIとプログレスインジケーターの実装

**実装内容**:

##### 2.1 ChromeTabsAdapterの拡張
```typescript
// src/infrastructure/adapters/chrome-tabs-adapter.ts (拡張)
/**
 * 新しいタブを作成
 * @param windowId ウィンドウID
 * @param url URL
 * @param index タブの位置（省略時は最後）
 * @returns 作成されたタブ情報
 */
async createTab(windowId: number, url: string, index?: number): Promise<chrome.tabs.Tab> {
  // chrome.tabs.create()を使用
}

/**
 * 複数のタブを順番通りに作成
 * @param windowId ウィンドウID
 * @param urls URLの配列
 * @returns 作成されたタブ情報の配列
 */
async createTabs(windowId: number, urls: string[]): Promise<chrome.tabs.Tab[]> {
  // 順番通りにタブを作成（並列実行は順序が保証されないため）
}
```

##### 2.2 ChromeWindowsAdapterの拡張
```typescript
// src/infrastructure/adapters/chrome-windows-adapter.ts (拡張)
/**
 * 新しいウィンドウを作成
 * @param urls 初期タブのURL配列（省略時は空のウィンドウ）
 * @returns 作成されたウィンドウ情報
 */
async createWindow(urls?: string[]): Promise<chrome.windows.Window> {
  // chrome.windows.create()を使用
}
```

##### 2.3 RestoreServiceの実装
```typescript
// src/application/services/restore-service.ts (新規)
export class RestoreService {
  constructor(
    private readonly chromeWindowsAdapter: ChromeWindowsAdapter,
    private readonly chromeTabsAdapter: ChromeTabsAdapter,
    private readonly calendarEventService: CalendarEventService,
    private readonly logger: Logger
  ) {}

  /**
   * 仕事状態を復元
   * @param eventId イベントID
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   * @returns 復元結果（ウィンドウID、タブIDの配列）
   */
  async restoreWorkState(
    eventId: EventId,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<{ windowId: number; tabIds: number[] }> {
    // 1. WorkStateを取得
    // 2. 新しいウィンドウを作成
    // 3. タブを段階的に開く（TabRestoreManagerを使用）
    // 4. 復元メタデータを記録（CalendarEventServiceを使用）
  }

  /**
   * タブを段階的に開く（パフォーマンス最適化）
   * @param tabs タブ情報の配列
   * @param windowId ウィンドウID
   * @param onProgress 進捗コールバック
   */
  private async restoreTabsBatch(
    tabs: TabInfo[],
    windowId: number,
    onProgress?: (completed: number, total: number) => void
  ): Promise<number[]> {
    // 一度に5個ずつタブを開く
    // 各バッチの間に100msの待機時間を設ける
  }
}
```

##### 2.4 TabRestoreManagerの実装
```typescript
// src/application/services/tab-restore-manager.ts (新規)
export class TabRestoreManager {
  constructor(
    private readonly chromeTabsAdapter: ChromeTabsAdapter,
    private readonly logger: Logger
  ) {}

  /**
   * タブを順番通りに復元
   * @param tabs タブ情報の配列
   * @param windowId ウィンドウID
   * @returns 作成されたタブIDの配列
   */
  async restoreTabsInOrder(
    tabs: TabInfo[],
    windowId: number
  ): Promise<number[]> {
    // 順番通りにタブを作成
    // エラーが発生したタブはスキップして続行
  }

  /**
   * 単一タブを復元
   * @param tabInfo タブ情報
   * @param windowId ウィンドウID
   * @param index タブの位置
   * @returns 作成されたタブID
   */
  private async restoreTab(
    tabInfo: TabInfo,
    windowId: number,
    index: number
  ): Promise<number | null> {
    // タブを作成
    // エラー時はnullを返す
  }
}
```

##### 2.5 CalendarEventServiceの拡張
```typescript
// src/application/services/calendar-event-service.ts (拡張)
/**
 * 復元メタデータを記録
 * @param eventId イベントID
 * @param restoredAt 復元日時
 * @param calendarId カレンダーID
 * @param accessToken アクセストークン
 */
async recordRestore(
  eventId: EventId,
  restoredAt: Date,
  calendarId: CalendarId,
  accessToken: AccessToken
): Promise<void> {
  // 既存のWorkStateを取得
  // restoredToに復元日時を追加（メタデータを更新）
  // カレンダーに保存
}
```

##### 2.6 Service Workerメッセージハンドラー
```typescript
// background/service-worker.ts (拡張)
case 'RESTORE_WORK_STATE':
  try {
    const { eventId } = message.payload as { eventId: string };
    
    // 認証状態を確認
    const authState = await authRepository.getCurrent();
    if (!authState || !authState.calendarId || !authState.accessToken) {
      sendResponse({ success: false, error: 'Not authenticated' });
      break;
    }

    // 復元を実行
    const result = await restoreService.restoreWorkState(
      EventId.create(eventId),
      authState.calendarId,
      authState.accessToken
    );

    // 復元メタデータを記録
    await calendarEventService.recordRestore(
      EventId.create(eventId),
      new Date(),
      authState.calendarId,
      authState.accessToken
    );

    sendResponse({ 
      success: true, 
      windowId: result.windowId,
      tabCount: result.tabIds.length
    });
  } catch (error) {
    logger.error('Failed to restore work state', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
  break;
```

##### 2.7 復元ボタンUIとプログレスインジケーター
```typescript
// sidepanel/sidepanel.ts (拡張)
// 復元ボタンの追加
function renderWorkStateList(): void {
  // ... 既存のコード ...
  
  // 各仕事項目に復元ボタンを追加
  const restoreButton = document.createElement('button');
  restoreButton.textContent = '復元';
  restoreButton.className = 'restore-button';
  restoreButton.addEventListener('click', () => {
    restoreWorkState(workState.eventId);
  });
  item.appendChild(restoreButton);
}

// 復元処理
async function restoreWorkState(eventId: string): Promise<void> {
  // プログレスインジケーターを表示
  showProgressIndicator();
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'RESTORE_WORK_STATE',
      payload: { eventId },
    });

    if (response.success) {
      showMessage('仕事状態を復元しました', 'success');
      // プログレスインジケーターを非表示
      hideProgressIndicator();
    } else {
      throw new Error(response.error || 'Failed to restore work state');
    }
  } catch (error) {
    console.error('Failed to restore work state:', error);
    showMessage('復元に失敗しました', 'error');
    hideProgressIndicator();
  }
}
```

---

### Phase 3: テスト実行とカバレッジ確認（1-2日目）

#### ステップ3: テスト実行
**作業内容**: 生成されたコードのテストを実行し、カバレッジを確認

**確認項目**:
- ユニットテストがすべて成功する
- テストカバレッジが80%以上
- エッジケース（大量タブ、無効なURLなど）のテストが含まれている

**コマンド**:
```bash
cd FRONTEND
npm test -- --coverage
```

---

### Phase 4: Chromeでの動作確認（1日目）

#### ステップ4: 動作確認
**作業内容**: Chrome拡張機能をインストールし、復元機能を確認

**確認項目**:
- 保存済み仕事一覧から復元ボタンが表示される
- 復元ボタンをクリックすると新しいウィンドウが開く
- タブが順番通りに開かれる
- プログレスインジケーターが表示される
- 10タブの復元が5秒以内で完了する
- 大量タブ（20個以上）が段階的に読み込まれる
- エラーが適切に処理される

**確認手順**: `VERIFICATION_GUIDE.md`に記載（後で追加）

---

## 実装の詳細設計

### タブ復元の順序保証
Chrome Tabs APIの`chrome.tabs.create()`は並列実行すると順序が保証されないため、順番通りにタブを作成する必要があります。

```typescript
// 順番通りにタブを作成
for (let i = 0; i < tabs.length; i++) {
  const tab = await chromeTabsAdapter.createTab(windowId, tabs[i].url, i);
  tabIds.push(tab.id!);
}
```

### 段階的なタブ読み込み（パフォーマンス最適化）
20個以上のタブを復元する場合、一度に5個ずつタブを開き、各バッチの間に100msの待機時間を設けます。

```typescript
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 100;

for (let i = 0; i < tabs.length; i += BATCH_SIZE) {
  const batch = tabs.slice(i, i + BATCH_SIZE);
  const batchTabIds = await Promise.all(
    batch.map((tab, index) => 
      chromeTabsAdapter.createTab(windowId, tab.url, i + index)
    )
  );
  tabIds.push(...batchTabIds.map(tab => tab.id!));
  
  // 進捗を通知
  if (onProgress) {
    onProgress(i + batch.length, tabs.length);
  }
  
  // 最後のバッチでない場合は待機
  if (i + BATCH_SIZE < tabs.length) {
    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
  }
}
```

### 復元メタデータの記録
復元時に、元のWorkStateのメタデータに`restoredTo`フィールドに復元日時を追加します。

```typescript
// WorkStateMetadataのrestoredToに復元日時を追加
const updatedMetadata = WorkStateMetadata.createFromRaw({
  ...existingMetadata.toRaw(),
  restoredTo: [...(existingMetadata.restoredTo || []), restoredAt.toISOString()]
}, existingMetadata.version);
```

### エラーハンドリング
- **無効なURL**: エラーメッセージをログに記録し、他のタブは開き続ける
- **ウィンドウ作成エラー**: エラーメッセージを表示し、処理を中断
- **部分的な復元**: 成功したタブは開いたまま、失敗したタブのリストをユーザーに表示

---

## UIデザイン

### 復元ボタン
保存済み仕事一覧の各項目に「復元」ボタンを追加します。

```
┌─────────────────────────────────────┐
│ 📄 プロジェクトAの調査               │
│ 🌐🌐🌐 (5タブ)                      │
│ 2026-01-22 10:00 - 10:30            │
│ [復元]                               │
└─────────────────────────────────────┘
```

### プログレスインジケーター
復元中は、サイドパネルにプログレスインジケーターを表示します。

```
┌─────────────────────────────────────┐
│ 復元中...                           │
│ ████████░░░░░░░░░░ 40% (8/20タブ)  │
└─────────────────────────────────────┘
```

---

## 受け入れ基準

Bolt 6が完了したとみなす条件：
- [ ] 保存済み仕事状態を選択して復元できる
- [ ] 新しいウィンドウでタブが開かれる
- [ ] タブの順序が保持される
- [ ] 10タブの復元が5秒以内で完了する
- [ ] プログレスインジケーターが表示される
- [ ] 大量タブ（20個以上）が段階的に読み込まれる
- [ ] エラーが適切に処理される（無効なURL、ネットワークエラーなど）
- [ ] 復元メタデータが記録される（`restoredTo`フィールドに追加）
- [ ] ユニットテストのカバレッジが80%以上

---

## リスク管理

| リスク | 影響度 | 発生確率 | 軽減策 |
|--------|--------|----------|--------|
| 大量タブ復元時のパフォーマンス問題 | 中 | 中 | 段階的なタブ読み込み（5個ずつ、100ms待機）、最大タブ数の制限（30個） |
| 無効なURLによる復元エラー | 低 | 中 | エラーハンドリングを実装し、他のタブは開き続ける |
| タブの順序が保証されない | 高 | 低 | 順番通りにタブを作成（並列実行を避ける） |
| 復元メタデータの記録失敗 | 低 | 低 | エラーハンドリングとリトライ機能 |

---

## パフォーマンス要件

- **復元時間**: 10個のタブを5秒以内で復元（NFR-001）
- **大量タブ**: 20個以上のタブは段階的に読み込む（5個ずつ、100ms待機）
- **最大タブ数**: 30個を超える場合は警告を表示（将来の拡張）

---

## 実行順序のサマリー

```
1. 既存設計の確認                           → 準備（0.5日）
1.5. 必要に応じた設計ドキュメントの作成    → 設計（0.5-1.5日、オプション）
2. /aidlc-code-generation "Bolt 6"          → コード実装（4日）
3. テスト実行とカバレッジ確認               → テスト（1-2日）
4. Chromeでの動作確認                       → 統合（1日）
```

**合計**: 約7-9営業日（設計ドキュメント作成を含む場合、推定期間2週間の範囲内）

---

**作成日**: 2026-01-22  
**最終更新**: 2026-01-22  
**ステータス**: ✅ 実装完了・動作確認完了
