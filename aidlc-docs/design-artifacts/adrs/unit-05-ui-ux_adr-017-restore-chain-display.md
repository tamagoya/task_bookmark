# ADR-017: 復元チェーンの表示方法の決定

## ステータス
承認済み（オプション機能）

## コンテキスト
User Story 7（仕事の前後関係の可視化）を実装する際、単一の前後関係だけでなく、連鎖した復元関係（復元チェーン）を表示する機能を検討する必要があります。

復元チェーンとは、以下のような連鎖した復元関係です：
```
仕事A → 仕事B（仕事Aから復元） → 仕事C（仕事Bから復元） → 仕事D（仕事Cから復元）
```

このようなチェーンを表示することで、ユーザーは仕事の流れをより深く理解できる可能性があります。

## 決定
復元チェーンの表示方法として、以下の戦略を採用します：

1. **オプション機能として実装**: 初期実装では必須機能としない
   - **理由**: ユーザーの要望を確認してから実装する方が良い
   - **実装タイミング**: Bolt 7の後、ユーザーフィードバックに基づいて判断

2. **最大深度の制限**: 復元チェーンの構築時に最大深度を制限
   - **デフォルト**: 10レベル
   - **理由**: 無限ループを防止、パフォーマンスを維持

3. **表示方法**: 横型のチェーン表示（オプション）
   - **形式**: `仕事A → 仕事B → 仕事C → 仕事D`
   - **クリック可能**: 各仕事をクリックすると詳細表示に遷移
   - **理由**: 時系列の流れを直感的に理解できる

4. **実装の分離**: 基本の前後関係表示とは分離して実装
   - **理由**: オプション機能として、必要に応じて有効/無効化できる

## 結果

### ポジティブ
- **柔軟性**: オプション機能として実装することで、必要に応じて有効/無効化できる
- **拡張性**: 将来、より高度な可視化（グラフ表示など）を追加しやすい
- **パフォーマンス**: 最大深度の制限により、パフォーマンスを維持

### ネガティブ
- **実装の複雑性**: チェーンの構築と表示のロジックが必要
- **UIの複雑化**: チェーンが長い場合、表示が複雑になる可能性
- **パフォーマンス**: チェーンの構築時に複数のイベントを取得する必要がある

### 検討した代替案

#### 代替案1: 必須機能として実装
- **説明**: Bolt 7で復元チェーンの表示を必須機能として実装
- **却下理由**: ユーザーの要望が不明確、実装の複雑性が高い

#### 代替案2: グラフ表示
- **説明**: 復元関係をグラフ形式で表示（D3.jsなどを使用）
- **却下理由**: 実装が複雑、サイドパネルのスペースに収まらない可能性

#### 代替案3: ツリービュー表示
- **説明**: 復元関係をツリービュー形式で表示
- **却下理由**: 実装が複雑、サイドパネルのスペースに収まらない可能性

#### 代替案4: チェーン表示なし
- **説明**: 復元チェーンの表示機能を実装しない
- **却下理由**: ユーザーの要望がある可能性、将来の拡張性を考慮

## 実装例

### チェーン構築のロジック
```typescript
// RestoreRelationService.getRestoreChain()
async getRestoreChain(
  eventId: EventId,
  calendarId: CalendarId,
  accessToken: AccessToken,
  maxDepth: number = 10
): Promise<RestoreChain> {
  const chain: RestoreRelation[] = [];
  let currentEventId = eventId;
  let depth = 0;

  // 復元元を辿る（後方）
  while (depth < maxDepth) {
    const workState = await this.calendarEventRepository.findById(
      currentEventId,
      calendarId,
      accessToken
    );

    if (!workState || !workState.metadata?.restoredFrom) {
      break;
    }

    const restoredFromId = EventId.create(workState.metadata.restoredFrom);
    const restoredFromWorkState = await this.calendarEventRepository.findById(
      restoredFromId,
      calendarId,
      accessToken
    );

    if (!restoredFromWorkState) {
      break;
    }

    chain.unshift(
      RestoreRelation.create({
        eventId: restoredFromWorkState.eventId.value,
        title: restoredFromWorkState.title.value,
        savedAt: restoredFromWorkState.metadata.savedAt,
      })
    );

    currentEventId = restoredFromId;
    depth++;
  }

  // 現在のイベントを追加
  const currentWorkState = await this.calendarEventRepository.findById(
    eventId,
    calendarId,
    accessToken
  );
  if (currentWorkState) {
    chain.push(
      RestoreRelation.create({
        eventId: currentWorkState.eventId.value,
        title: currentWorkState.title.value,
        savedAt: currentWorkState.metadata.savedAt,
      })
    );
  }

  // 復元先を辿る（前方）
  currentEventId = eventId;
  depth = 0;
  while (depth < maxDepth) {
    const workState = await this.calendarEventRepository.findById(
      currentEventId,
      calendarId,
      accessToken
    );

    if (!workState || !workState.metadata?.restoredTo || workState.metadata.restoredTo.length === 0) {
      break;
    }

    // 最初の復元先のみを辿る（分岐は考慮しない）
    // restoredToはオブジェクト配列: { eventId: string; restoredAt: string }[]
    const firstRestoredTo = workState.metadata.restoredTo[0];
    const restoredToId = EventId.create(firstRestoredTo.eventId);
    const restoredToWorkState = await this.calendarEventRepository.findById(
      restoredToId,
      calendarId,
      accessToken
    );

    if (!restoredToWorkState) {
      break;
    }

    chain.push(
      RestoreRelation.create({
        eventId: restoredToWorkState.eventId.value,
        title: restoredToWorkState.title.value,
        savedAt: restoredToWorkState.metadata.savedAt,
        restoredAt: firstRestoredTo.restoredAt, // 復元日時（ISO 8601形式）
      })
    );

    currentEventId = restoredToId;
    depth++;
  }

  return RestoreChain.create(chain);
}
```

### UI表示例
```html
<!-- 復元チェーン表示（オプション） -->
<div class="restore-chain-section">
  <h3>復元チェーン</h3>
  <div class="restore-chain">
    <span class="chain-item" data-event-id="event-1">仕事A</span>
    <span class="chain-arrow">→</span>
    <span class="chain-item" data-event-id="event-2">仕事B</span>
    <span class="chain-arrow">→</span>
    <span class="chain-item" data-event-id="event-3">仕事C</span>
    <span class="chain-arrow">→</span>
    <span class="chain-item" data-event-id="event-4">仕事D</span>
  </div>
</div>
```

## 実装の優先順位

1. **Phase 1（Bolt 7）**: 基本の前後関係表示（復元元、復元先）
2. **Phase 2（将来）**: 復元チェーンの表示（ユーザーフィードバックに基づいて判断）

## 日付
2026-01-22

---

**作成者**: アーキテクト  
**レビュー**: 承認済み
