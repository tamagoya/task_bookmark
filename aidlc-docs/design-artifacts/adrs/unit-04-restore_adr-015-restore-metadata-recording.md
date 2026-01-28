# ADR-015: 復元メタデータの記録戦略

## ステータス
承認済み（2026-01-22 改訂）

## コンテキスト
Unit 4（状態復元機能）では、復元時にメタデータを記録する必要があります。User Story 5の要件として、「復元実行時の時刻を開始時間として、カレンダーイベントに記録する（メタデータとして）」と「復元元の仕事との関連性（前後関係）をメタデータとして保持する」があります。

また、User Story 7（前後関係の可視化）を実現するために、復元先のイベントIDと復元日時の両方を記録する必要があります。

Unit 3のドメインモデルには、以下のフィールドが定義されています：
- `WorkStateMetadata.restoredFrom`: 復元元のイベントID（任意）
- `WorkStateMetadata.restoredTo`: 復元先の情報リスト（任意、オブジェクト配列形式）

## 決定
復元メタデータの記録戦略として、以下の戦略を採用します：

1. **`restoredTo`フィールドをオブジェクト配列として定義**:
   - **形式**: オブジェクト配列（`Array<{ eventId: string; restoredAt: string }>`）
   - **内容**: 
     - `eventId`: 復元先のイベントID（新しく作成されたWorkStateのID）
     - `restoredAt`: 復元日時（ISO 8601形式）
   - **理由**: 
     - User Story 5の要件（復元日時の記録）を満たす
     - User Story 7の要件（前後関係の可視化）を満たす
     - イベントIDと復元日時のペアが明確になる

2. **CalendarEventServiceの拡張**: `recordRestore()`メソッドを追加
   - **責任**: 復元メタデータの記録を担当
   - **実装フロー**:
     1. `CalendarEventRepository.findById()`で既存のWorkStateを取得
     2. `WorkStateMetadata`の`restoredTo`フィールドに新しい復元情報を追加（新しいメタデータを作成）
     3. `WorkState.updateMetadata()`でメタデータを更新
     4. `CalendarEventRepository.update()`でカレンダーに保存
   - **理由**: Unit 3のパターンと一貫性を保つ

3. **イミュータビリティの維持**: 新しいメタデータを作成して更新
   - **理由**: 既存のコーディングスタイルガイドに準拠
   - **実装**: `WorkStateMetadata.createFromRaw()`を使用して新しいメタデータを作成

4. **復元タイミング**: 復元完了後にメタデータを記録
   - **理由**: 復元が成功した場合のみメタデータを記録
   - **エラーハンドリング**: 復元が失敗した場合、メタデータは記録しない

## 結果

### ポジティブ
- **一貫性**: Unit 3のドメインモデルとパターンを再利用
- **拡張性**: `restoredTo`フィールドはオブジェクト配列形式のため、複数の復元を記録可能
- **前後関係の可視化**: イベントIDを含むため、User Story 7の要件を満たす
- **保守性**: 既存のコードを拡張するため、保守性が高い
- **テスト容易性**: Unit 3のテストパターンを再利用可能
- **明確なペア関係**: イベントIDと復元日時のペアが明確になる

### ネガティブ
- **メタデータ更新のオーバーヘッド**: 復元のたびにカレンダーイベントを更新する必要がある
- **エラー処理**: メタデータ更新が失敗した場合の処理が必要
- **データサイズ**: オブジェクト配列のため、単純な文字列配列よりデータサイズが大きい

### 検討した代替案

#### 代替案1: 新しいイベントを作成
- **説明**: 復元時に新しいカレンダーイベントを作成し、`restoredFrom`フィールドに元のイベントIDを設定
- **却下理由**: User Story 5の要件に合わない（元のイベントにメタデータを追加する必要がある）

#### 代替案2: 別のストレージに記録
- **説明**: Chrome Storage APIに復元メタデータを記録
- **却下理由**: データの一貫性が保証されない、Unit 3のパターンと一貫性がない

#### 代替案3: `restoredTo`フィールドに復元日時のみを追加
- **説明**: 復元日時のみをISO 8601形式で追加（`string[]`）
- **却下理由**: User Story 7の要件に合わない（前後関係の可視化にイベントIDが必要）

#### 代替案4: 別々のフィールドを使用
- **説明**: `restoredToEventIds: string[]` と `restoredToTimestamps: string[]` を別々に定義
- **却下理由**: イベントIDと復元日時のペア関係が不明確になる

#### 代替案5: 復元前にメタデータを記録
- **説明**: 復元開始時にメタデータを記録
- **却下理由**: 復元が失敗した場合、不要なメタデータが記録される

## データ構造

```typescript
// restoredToの型定義
interface RestoredToEntry {
  eventId: string;      // 復元先のイベントID
  restoredAt: string;   // 復元日時（ISO 8601形式）
}

// WorkStateMetadataの型定義（関連部分のみ）
interface WorkStateMetadata {
  // ... 他のフィールド
  restoredFrom?: string;           // 復元元のイベントID
  restoredTo?: RestoredToEntry[];  // 復元先の情報リスト
}
```

## 実装例

```typescript
// CalendarEventService.recordRestore()
async recordRestore(
  eventId: EventId,
  restoredToEventId: EventId,
  restoredAt: Date,
  calendarId: CalendarId,
  accessToken: AccessToken
): Promise<void> {
  // 既存のWorkStateを取得
  const existingWorkState = await this.calendarEventRepository.findById(
    eventId,
    calendarId,
    accessToken
  );

  if (!existingWorkState) {
    throw new Error(`WorkState not found: ${eventId.value}`);
  }

  // restoredToに新しい復元情報を追加
  const existingMetadata = existingWorkState.metadata;
  const existingRestoredTo = existingMetadata.restoredTo || [];
  const updatedRestoredTo = [
    ...existingRestoredTo,
    {
      eventId: restoredToEventId.value,
      restoredAt: restoredAt.toISOString()
    }
  ];

  // 新しいメタデータを作成（イミュータビリティ）
  const updatedMetadata = WorkStateMetadata.createFromRaw({
    ...existingMetadata.toJSON(),
    restoredTo: updatedRestoredTo
  }, existingMetadata.version);

  // WorkStateを更新
  existingWorkState.updateMetadata(updatedMetadata);

  // カレンダーに保存
  await this.calendarEventRepository.update(
    existingWorkState,
    calendarId,
    accessToken
  );
}
```

## 日付
2026-01-22（改訂）

## 改訂履歴
- 2026-01-22: 初版作成（`restoredTo`を復元日時の文字列配列として定義）
- 2026-01-22: 改訂（`restoredTo`をオブジェクト配列に変更、イベントIDと復元日時の両方を記録）

---

**作成者**: アーキテクト  
**レビュー**: 承認済み
