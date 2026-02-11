# Unit 3: Google Calendar API連携

## 概要
Google Calendar APIを使用して、仕事状態の保存、読み取り、更新を行う機能を担当するUnitです。カレンダーイベントの説明欄にJSON形式でタブ情報を格納します。

## 責任範囲
- 仕事状態のカレンダーイベントへの保存
- 保存済み仕事状態の一覧取得
- カレンダーイベントの更新（URL編集機能）
- カレンダーイベントのメタデータ管理（前後関係の記録）

## 関連User Stories
- **US-3**: 仕事状態の保存（メタデータ入力とカレンダー保存）
- **US-4**: 保存済み仕事状態の一覧表示
- **US-6**: 保存済みURLの編集
- **US-7**: 仕事の前後関係の可視化（メタデータ部分）

## 入力
- タブ情報の配列（TabInfo[]）
- メタデータ（仕事名、メモ、保存日時）
- 更新リクエスト（URL編集、メタデータ更新）

## 出力
- カレンダーイベントID
- 保存済み仕事状態の一覧（WorkState[]）
- 更新結果

## 主要コンポーネント

### 1. Calendar Event Service
**責任**: カレンダーイベントのCRUD操作

**主要メソッド**:
- `createWorkStateEvent(tabInfo, metadata)`: 仕事状態をイベントとして保存
- `getWorkStateEvents(startDate, endDate)`: 保存済み仕事状態を取得
- `updateWorkStateEvent(eventId, updates)`: イベントを更新（URL編集など）
- `deleteWorkStateEvent(eventId)`: イベントを削除（オプション）

**依存関係**:
- Google Calendar API v3
- Unit 1 (認証): 認証トークンとカレンダーID

### 2. Work State Data Model
**責任**: 仕事状態のデータ構造定義

**データ構造**:
```typescript
interface WorkState {
  eventId: string;
  title: string; // 仕事名
  description: string; // JSON形式のタブ情報
  startTime: Date;
  endTime: Date;
  metadata: WorkStateMetadata;
}

interface WorkStateMetadata {
  version: string; // スキーマバージョン
  tabs: TabInfo[];
  memo?: string;
  savedAt: string; // ISO 8601形式
  restoredFrom?: string; // 復元元のイベントID
  restoredTo?: string[]; // 復元先のイベントIDリスト
}
```

### 3. Event Parser
**責任**: カレンダーイベントとWorkStateの相互変換

**主要メソッド**:
- `parseEventToWorkState(event)`: カレンダーイベントをWorkStateに変換
- `serializeWorkStateToEvent(workState)`: WorkStateをカレンダーイベント形式に変換
- `validateSchema(metadata)`: スキーマバージョンの検証

### 4. Metadata Manager
**責任**: メタデータ（前後関係など）の管理

**主要メソッド**:
- `recordRestoreRelation(fromEventId, toEventId)`: 復元関係を記録
- `getRestoreChain(eventId)`: 仕事の前後関係を取得
- `updateMetadata(eventId, metadata)`: メタデータを更新

## 技術スタック
- **言語**: TypeScript
- **API**: Google Calendar API v3
- **データ形式**: JSON（イベント説明欄に格納）

## データ構造（カレンダーイベント説明欄）

### JSONスキーマ（v1.0）
- 保存後にイベント説明欄に **eventId** を追加で格納する（Google Calendar GUI 上の「復元」ボタンで eventId を参照するため）。既存フィールドは変更なし。
```json
{
  "version": "1.0",
  "eventId": "実際のイベントID（保存後にPATCHで追加）",
  "tabs": [
    {
      "url": "https://example.com",
      "title": "Example Page",
      "faviconUrl": "https://example.com/favicon.ico",
      "index": 0
    }
  ],
  "memo": "作業メモ",
  "savedAt": "2026-01-21T10:30:00Z",
  "restoredFrom": "event-id-123",
  "restoredTo": ["event-id-456", "event-id-789"]
}
```

## エラーハンドリング
- **APIエラー**: 
  - レート制限エラー（429）: リトライ前に待機
  - 認証エラー（401）: 再認証を促す
  - その他のエラー: ユーザーフレンドリーなメッセージを表示
- **データ検証エラー**: スキーマバージョンの不一致時、マイグレーションまたはエラー表示

## パフォーマンス要件
- **保存時間**: 2秒以内（NFR-001）
- **一覧取得時間**: 過去30日分（最大600件）を3秒以内（NFR-001）
- **レート制限**: 1秒あたり100リクエスト以内（RISK-001対策）

## テスト戦略
- **ユニットテスト**: 
  - Event Parserのテスト
  - Metadata Managerのテスト
  - スキーマバリデーションのテスト
- **統合テスト**: 
  - Google Calendar APIとの実際の通信テスト（テストアカウント使用）
  - レート制限のテスト
  - エラーケースのテスト

## 依存関係
- **外部依存**: 
  - Google Calendar API v3
- **内部依存**: 
  - Unit 1 (認証): 認証トークンとカレンダーID
  - Unit 2 (タブキャプチャ): TabInfo型の参照

## 他のUnitsとのインターフェース
- **Unit 1 (認証)**: 認証トークンとカレンダーIDを取得
- **Unit 2 (タブキャプチャ)**: TabInfo[]を受け取る
- **Unit 4 (状態復元)**: WorkState[]を提供、復元関係を記録
- **Unit 5 (UI/UX)**: 保存・一覧表示・編集のUIを提供

## 実装の優先順位
**優先度**: 高（コア機能）

## リスク
- **RISK-001**: Google Calendar APIのレート制限（軽減策: バッチ処理、リトライ戦略）
- **RISK-010**: Google Calendar APIの仕様変更（軽減策: 公式ドキュメントの監視、スキーマバージョニング）

## 成功基準
- [ ] 仕事状態をカレンダーイベントとして正常に保存できる
- [ ] 保存済み仕事状態の一覧を取得できる
- [ ] URL編集機能が正常に動作する
- [ ] 前後関係が適切に記録される
- [ ] スキーマバージョニングに対応している
- [ ] レート制限エラーが適切に処理される
- [ ] ユニットテストのカバレッジが80%以上

---

**作成日**: 2026-01-21  
**最終更新**: 2026-01-21  
**ステータス**: 設計完了
