# ADR-015: 復元メタデータの記録戦略

## ステータス
承認済み

## コンテキスト
Unit 4（状態復元機能）では、復元時にメタデータを記録する必要があります。User Story 5の要件として、「復元実行時の時刻を開始時間として、カレンダーイベントに記録する（メタデータとして）」と「復元元の仕事との関連性（前後関係）をメタデータとして保持する」があります。

Unit 3のドメインモデルには、既に以下のフィールドが実装されています：
- `WorkStateMetadata.restoredFrom`: 復元元のイベントID（任意）
- `WorkStateMetadata.restoredTo`: 復元先のイベントIDリスト（任意、配列形式）

復元時に、元のWorkStateのメタデータに`restoredTo`フィールドに復元日時を追加する必要があります。

## 決定
復元メタデータの記録戦略として、以下の戦略を採用します：

1. **Unit 3のドメインモデルを再利用**: `WorkStateMetadata`の`restoredTo`フィールドを使用
   - **形式**: 配列形式（`string[]`）
   - **内容**: 復元日時をISO 8601形式の文字列として追加
   - **理由**: 既存のドメインモデルを活用し、一貫性を保つ

2. **CalendarEventServiceの拡張**: `recordRestore()`メソッドを追加
   - **責任**: 復元メタデータの記録を担当
   - **実装フロー**:
     1. `CalendarEventRepository.findById()`で既存のWorkStateを取得
     2. `WorkStateMetadata`の`restoredTo`フィールドに復元日時を追加（新しいメタデータを作成）
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
- **拡張性**: `restoredTo`フィールドは配列形式のため、複数の復元を記録可能
- **保守性**: 既存のコードを拡張するため、保守性が高い
- **テスト容易性**: Unit 3のテストパターンを再利用可能

### ネガティブ
- **メタデータ更新のオーバーヘッド**: 復元のたびにカレンダーイベントを更新する必要がある
- **エラー処理**: メタデータ更新が失敗した場合の処理が必要

### 検討した代替案

#### 代替案1: 新しいイベントを作成
- **説明**: 復元時に新しいカレンダーイベントを作成し、`restoredFrom`フィールドに元のイベントIDを設定
- **却下理由**: User Story 5の要件に合わない（元のイベントにメタデータを追加する必要がある）

#### 代替案2: 別のストレージに記録
- **説明**: Chrome Storage APIに復元メタデータを記録
- **却下理由**: データの一貫性が保証されない、Unit 3のパターンと一貫性がない

#### 代替案3: `restoredTo`フィールドにイベントIDを追加
- **説明**: 復元日時ではなく、復元先のイベントIDを追加
- **却下理由**: User Story 5の要件に合わない（復元日時を記録する必要がある）

#### 代替案4: 復元前にメタデータを記録
- **説明**: 復元開始時にメタデータを記録
- **却下理由**: 復元が失敗した場合、不要なメタデータが記録される

## 実装例

```typescript
// CalendarEventService.recordRestore()
async recordRestore(
  eventId: EventId,
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

  // restoredToに復元日時を追加
  const existingMetadata = existingWorkState.metadata;
  const updatedRestoredTo = [
    ...(existingMetadata.restoredTo || []),
    restoredAt.toISOString()
  ];

  // 新しいメタデータを作成（イミュータビリティ）
  const updatedMetadata = WorkStateMetadata.createFromRaw({
    ...existingMetadata.toRaw(),
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
2026-01-22

---

**作成者**: アーキテクト  
**レビュー**: 承認済み
