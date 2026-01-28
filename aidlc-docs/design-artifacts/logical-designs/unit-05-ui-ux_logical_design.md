# Logical Design: Unit 5 - UI/UX実装

## 概要
本ドキュメントは、Unit 5（UI/UX実装）のLogical Designを定義します。Unit定義を拡張し、NFRsを満たすためのアーキテクチャパターンを適用した実装可能な設計です。特に、Bolt 7で実装する前後関係の可視化UIの詳細設計を含みます。

## アーキテクチャパターン

### 採用したパターン

1. **レイヤードアーキテクチャ**: プレゼンテーション層（UI）、アプリケーション層、ドメイン層の分離
2. **Component パターン**: UIコンポーネントの分離と再利用
3. **Observer パターン**: UI状態の更新とイベント通知（簡易実装、コールバック関数）
4. **Adapter パターン**: Service Workerとの通信（UIMessenger）
5. **Service Layer パターン**: 前後関係取得ロジックの集約（RestoreRelationService）

---

## レイヤー構造

### 1. プレゼンテーション層 (Presentation Layer)

**責任**: ユーザーインターフェースの表示とユーザー操作の処理

**コンポーネント**:

#### Side Panel Container
**責任**: サイドパネルのメインコンテナとルーティング

**主要機能**:
- サイドパネルの表示制御
- 画面遷移の管理（タブ一覧、保存済み仕事一覧、詳細表示）
- 認証状態の管理

**実装ファイル**:
- `FRONTEND/sidepanel/sidepanel.html`
- `FRONTEND/sidepanel/sidepanel.ts`

**依存関係**:
- Chrome Side Panel API
- Application Layer (各種Service)

---

#### Tab List Component
**責任**: 現在のタブ一覧の表示

**主要機能**:
- タブ一覧の表示（タイトル、URL、ファビコン）
- タブの順序表示
- スクロール可能なリスト

**実装ファイル**:
- `FRONTEND/sidepanel/sidepanel.html` (tabs-section)
- `FRONTEND/sidepanel/sidepanel.ts` (loadCurrentTabs, renderTabsList)

**依存関係**:
- Application Layer (TabCaptureService)

---

#### Save Form Component
**責任**: 仕事状態保存のフォーム

**主要機能**:
- 仕事名の入力（必須）
- メモの入力（任意）
- 保存ボタン
- バリデーション

**実装ファイル**:
- `FRONTEND/sidepanel/sidepanel.html` (save-section)
- `FRONTEND/sidepanel/sidepanel.ts` (saveWorkState)

**依存関係**:
- Application Layer (CalendarEventService)

---

#### Work State List Component
**責任**: 保存済み仕事一覧の表示

**主要機能**:
- 時系列での一覧表示
- 検索機能（仕事名で検索）
- 日付フィルタリング（今日、今週、今月）
- 復元ボタン
- 詳細表示ボタン（将来の拡張）
- **前後関係インジケーター**（Bolt 7で追加）

**実装ファイル**:
- `FRONTEND/sidepanel/sidepanel.html` (work-states-section)
- `FRONTEND/sidepanel/sidepanel.ts` (loadWorkStates, renderWorkStateList)

**依存関係**:
- Application Layer (CalendarEventService, RestoreRelationService)

**UIデザイン**:
```
┌─────────────────────────────────┐
│ プロジェクトAの調査        [🔗]  │ ← 前後関係インジケーター
│ 5タブ | 2026-01-22 10:00        │
│ [復元]                          │
└─────────────────────────────────┘
```

---

#### Work State Detail Component
**責任**: 保存済み仕事の詳細表示と編集

**主要機能**:
- 仕事の詳細情報表示
- URLリストの表示と編集（Bolt 8で実装予定）
- **前後関係の表示**（Bolt 7で実装）
- 保存ボタン（編集後）

**実装ファイル**:
- `FRONTEND/sidepanel/sidepanel.html` (work-state-detail-section) - 新規追加
- `FRONTEND/sidepanel/sidepanel.ts` (showWorkStateDetail, renderRestoreRelations) - 新規追加

**依存関係**:
- Application Layer (CalendarEventService, RestoreRelationService)
- Application Layer (RestoreService) - 復元処理

**UIデザイン**:
```
┌─────────────────────────────────┐
│ 仕事名: プロジェクトAの調査      │
│ 保存日時: 2026-01-22 10:00      │
│ タブ数: 5                        │
│                                  │
│ 【前後関係】                     │
│                                  │
│ ← 復元元: プロジェクトBの調査     │
│    (2026-01-21 15:00)            │
│    [詳細を見る]                  │
│                                  │
│ → 復元先:                        │
│    - プロジェクトAの続き          │
│      (2026-01-22 14:00)          │
│      [詳細を見る]                │
│    - プロジェクトAの再開          │
│      (2026-01-23 09:00)          │
│      [詳細を見る]                │
└─────────────────────────────────┘
```

---

#### Restore Relation View Component（新規、Bolt 7）
**責任**: 前後関係の可視化

**主要機能**:
- 復元元の表示（`restoredFrom`）
- 復元先の表示（`restoredTo`）
- 復元チェーンの表示（オプション）
- クリック可能なリンク（詳細表示への遷移）

**実装ファイル**:
- `FRONTEND/sidepanel/sidepanel.html` (restore-relations-section)
- `FRONTEND/sidepanel/sidepanel.ts` (loadRestoreRelations, renderRestoreRelations, renderRestoreChain)

**依存関係**:
- Application Layer (RestoreRelationService)

**UIデザイン**:
```
┌─────────────────────────────────┐
│ 【前後関係】                     │
│                                  │
│ ← 復元元                         │
│   プロジェクトBの調査             │
│   保存日時: 2026-01-21 15:00     │
│   [詳細を見る]                   │
│                                  │
│ → 復元先 (2件)                   │
│   ┌─────────────────────────┐   │
│   │ プロジェクトAの続き       │   │
│   │ 復元日時: 2026-01-22 14:00│   │
│   │ [詳細を見る]             │   │
│   └─────────────────────────┘   │
│   ┌─────────────────────────┐   │
│   │ プロジェクトAの再開       │   │
│   │ 復元日時: 2026-01-23 09:00│   │
│   │ [詳細を見る]             │   │
│   └─────────────────────────┘   │
└─────────────────────────────────┘
```

---

#### Progress Indicator Component
**責任**: ローディングとプログレスの表示

**主要機能**:
- 保存中のローディング表示
- 復元中のプログレスバー
- データ取得中のローディング表示

**実装ファイル**:
- `FRONTEND/sidepanel/sidepanel.html` (message-section)
- `FRONTEND/sidepanel/sidepanel.ts` (showMessage)

---

#### Error Message Component
**責任**: エラーメッセージの表示

**主要機能**:
- エラーメッセージの表示
- リトライボタン
- エラーの種類に応じた適切なメッセージ

**実装ファイル**:
- `FRONTEND/sidepanel/sidepanel.html` (message-section)
- `FRONTEND/sidepanel/sidepanel.ts` (showMessage)

---

### 2. アプリケーション層 (Application Layer)

**責任**: ユースケースの実装、プレゼンテーション層とドメイン層の調整

**コンポーネント**:

#### RestoreRelationService（新規、Bolt 7）
**責任**: 前後関係データの取得と構築

**主要メソッド**:
- `getRestoreRelations(eventId: EventId, calendarId: CalendarId, accessToken: AccessToken): Promise<RestoreRelations>`
  - 指定されたイベントIDの前後関係を取得
  - 依存関係: Domain Layer (WorkState, EventId), Infrastructure Layer (CalendarEventRepository)
  
- `getRestoreChain(eventId: EventId, calendarId: CalendarId, accessToken: AccessToken, maxDepth?: number): Promise<RestoreChain>`
  - 復元チェーンを構築（オプション機能）
  - 最大深度を制限（デフォルト: 10レベル）して無限ループを防止
  - 依存関係: Domain Layer (WorkState, EventId), Infrastructure Layer (CalendarEventRepository)

**実装ファイル**:
- `FRONTEND/src/application/services/restore-relation-service.ts`（新規）

**実装フロー**:
1. `CalendarEventRepository.findById()`で元のWorkStateを取得
2. `WorkState.metadata.restoredFrom`から復元元のイベントIDを取得
3. `CalendarEventRepository.findById()`で復元元のWorkStateを取得（存在する場合）
4. `WorkState.metadata.restoredTo`から復元先の情報リストを取得
   - 各エントリは `{ eventId: string; restoredAt: string }` 形式
5. `CalendarEventRepository.findById()`で各復元先のWorkStateを取得
6. `RestoreRelations`オブジェクトを構築して返す

**エラーハンドリング**:
- 存在しないイベントIDの場合は`null`を返す
- 削除されたイベントの場合は「削除済み」と表示

**依存関係**:
- Domain Layer (WorkState, EventId, CalendarId, AccessToken)
- Infrastructure Layer (CalendarEventRepository, Logger)

---

### 3. ドメイン層 (Domain Layer)

**責任**: ビジネスロジックとドメインモデル

**コンポーネント**:

#### RestoreRelation Value Object（新規、Bolt 7）
**責任**: 復元関係を表す不変オブジェクト

**属性**:
- `eventId: string` - イベントID
- `title: string` - 仕事名
- `savedAt: string` - 保存日時（ISO 8601形式）
- `restoredAt?: string` - 復元日時（ISO 8601形式、復元先の場合のみ）

**メソッド**:
- `static create(data: RestoreRelationData): RestoreRelation`
- `equals(other: RestoreRelation): boolean`

**実装ファイル**:
- `FRONTEND/src/domain/value-objects/restore-relation.ts`（新規）

---

#### RestoreChain Value Object（新規、Bolt 7、オプション）
**責任**: 復元チェーンを表す不変オブジェクト

**属性**:
- `chain: RestoreRelation[]` - 復元チェーンの配列（時系列順）

**メソッド**:
- `static create(relations: RestoreRelation[]): RestoreChain`
- `getDepth(): number` - チェーンの深度を取得
- `equals(other: RestoreChain): boolean`

**実装ファイル**:
- `FRONTEND/src/domain/value-objects/restore-chain.ts`（新規、オプション）

---

### 4. インフラストラクチャ層 (Infrastructure Layer)

**責任**: 外部システムとの通信とデータ永続化

**コンポーネント**:

#### UIMessenger
**責任**: Service WorkerとUIコンポーネント間のメッセージング

**主要メソッド**:
- `sendMessage(message: UIMessage): Promise<UIResponse>`
- `onMessage(handler: (message: UIMessage) => void): void`

**実装ファイル**:
- `FRONTEND/src/infrastructure/adapters/ui-messenger.ts`（既存）

**拡張内容（Bolt 7）**:
- `GET_RESTORE_RELATIONS`メッセージ型の追加
- `RESTORE_RELATIONS_RESPONSE`メッセージ型の追加

---

## データフロー

### 前後関係の取得フロー（Bolt 7）

1. **ユーザー操作**: 保存済み仕事一覧で「詳細を見る」をクリック
2. **UI**: `showWorkStateDetail(eventId)`を呼び出し
3. **UI**: `loadRestoreRelations(eventId)`を呼び出し
4. **UI**: Service Workerに`GET_RESTORE_RELATIONS`メッセージを送信
5. **Service Worker**: `RestoreRelationService.getRestoreRelations()`を呼び出し
6. **RestoreRelationService**: 
   - `CalendarEventRepository.findById()`で元のWorkStateを取得
   - `WorkState.metadata.restoredFrom`から復元元のイベントIDを取得
   - 復元元のWorkStateを取得（存在する場合）
   - `WorkState.metadata.restoredTo`から復元先のイベントIDリストを取得
   - 各復元先のWorkStateを取得
7. **RestoreRelationService**: `RestoreRelations`オブジェクトを構築
8. **Service Worker**: `RESTORE_RELATIONS_RESPONSE`メッセージをUIに送信
9. **UI**: `renderRestoreRelations(relations)`で前後関係を表示

---

## UI/UX設計原則

### シンプルさ
- ブックマーク作成と同等の手軽さ
- 不要な情報を表示しない
- 直感的な操作

### 視覚的フィードバック
- すべての操作に明確なフィードバック
- ローディング状態の表示
- 成功/失敗メッセージの表示

### エラー処理
- ユーザーフレンドリーなエラーメッセージ
- リトライ機能の提供
- エラーの種類に応じた適切なメッセージ

### アクセシビリティ
- キーボード操作のサポート
- ARIAラベルの設定
- 色のコントラスト（WCAG 2.1 Level AA基準）

---

## レスポンシブデザイン

- サイドパネルのサイズに応じて適切に表示
- 最小幅: 300px
- 最大幅: 600px（推奨）

---

## エラーハンドリング

### 前後関係取得時のエラー（Bolt 7）

- **存在しないイベントID**: 「前後関係を取得できませんでした」と表示
- **削除されたイベント**: 「削除済み」と表示
- **ネットワークエラー**: 「ネットワークエラーが発生しました。再試行してください。」と表示
- **認証エラー**: 「認証に失敗しました。もう一度お試しください。」と表示

---

## パフォーマンス要件

- **前後関係の取得**: 3件以内の前後関係を1秒以内で取得（NFR-001を参考）
- **UI応答性**: ユーザー操作に対して100ms以内に応答

---

## テスト戦略

### ユニットテスト
- 各UIコンポーネントのテスト
- `RestoreRelationService`のテスト
- `RestoreRelation` Value Objectのテスト
- フォームバリデーションのテスト

### 統合テスト
- 実際のChrome環境でのUIテスト
- ユーザーフローのテスト
- 前後関係表示のテスト

### E2Eテスト
- Playwrightを使用したE2Eテスト（将来の拡張）

---

## 依存関係

### 外部依存
- Chrome Side Panel API
- Chrome Storage API

### 内部依存
- Unit 1 (認証): 認証状態の表示
- Unit 2 (タブキャプチャ): タブ一覧の表示
- Unit 3 (Calendar API): 保存・一覧表示・編集・前後関係データの取得
- Unit 4 (状態復元): 復元ボタンとプログレス

---

## 実装の優先順位

**優先度**: 高（ユーザー体験の要）

### Bolt別の実装範囲

- **Bolt 1-6**: 基本UI（認証、タブ表示、保存、一覧表示、復元）
- **Bolt 7**: 前後関係の可視化UI（本Logical Designの主要部分）
- **Bolt 8**: URL編集機能
- **Bolt 9-10**: エラーハンドリングとUX改善

---

## リスク

### RISK-009: ユーザー採用率の低下
- **軽減策**: ユーザーテスト、段階的な機能公開

### RISK-008: XSS攻撃
- **軽減策**: 入力のサニタイズ、CSPの適用

### RISK-UI-001: UIの複雑化（Bolt 7）
- **説明**: 前後関係の表示により、UIが複雑になる可能性
- **軽減策**: 
  - シンプルなデザインを採用
  - 詳細表示はオプションとして実装
  - ユーザーテストを実施

---

## 成功基準

- [ ] サイドパネルが正常に表示される
- [ ] すべての主要機能がUIから操作できる
- [ ] フォームバリデーションが正常に動作する
- [ ] エラーメッセージが適切に表示される
- [ ] キーボード操作が可能
- [ ] スクリーンリーダーに対応
- [ ] レスポンシブデザインが適切に動作する
- [ ] **前後関係が可視化される（Bolt 7）**
- [ ] **一覧表示に前後関係インジケーターが表示される（Bolt 7）**
- [ ] ユニットテストのカバレッジが80%以上

---

**作成日**: 2026-01-22  
**最終更新**: 2026-01-22  
**ステータス**: 設計完了（Bolt 7対応）
