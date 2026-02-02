# Domain Model作成計画: Bolt 8 - URL編集機能

## 概要
Bolt 8（URL編集機能）のDomain Modelを作成します。既存のUnit 3（Google Calendar API連携）のドメインモデルを拡張し、URL編集に特化したドメインロジックを追加します。

## 対象User Story
- **US-6**: 保存済みURLの編集

## 受け入れ基準（US-6より）
- [ ] 保存済み仕事の詳細表示画面で、URLリストが編集可能な形式で表示される
- [ ] ユーザーが以下を実行できる：
  - [ ] 個別のURLを削除
  - [ ] URLの順序を変更（ドラッグ&ドロップ）
  - [ ] 新しいURLを追加（手動入力）
- [ ] 編集内容を保存すると、Google Calendarイベントの説明欄が更新される
- [ ] 編集内容は、構造化データの形式を維持する
- [ ] 編集履歴をメタデータとして記録する（オプション、将来の拡張）

## 既存ドメインモデルの確認
- Unit 3のドメインモデルを確認済み
- `WorkState`エンティティに`updateMetadata`メソッドが既に存在
- `WorkStateMetadata`に`tabs: TabInfo[]`が含まれている

## 実装ステップ

### ステップ1: Unit定義とUser Storyの読み込み
- [x] `suggested_bolts.md`からBolt 8の定義を確認
- [x] `user_stories.md`からUS-6の要件を確認
- [x] `unit-03-calendar-api.md`から関連する責任範囲を確認
- [x] `unit-05-ui-ux.md`からUI要件を確認
- [x] 既存の`unit-03-calendar-api_domain_model.md`を確認

### ステップ2: ドメインエンティティの拡張
- [x] `WorkState`エンティティにURL編集関連のメソッドを追加
  - [x] `updateTabs(newTabs: TabInfo[]): void` - タブリストの更新
  - [x] `addTab(tab: TabInfo, index?: number): void` - タブの追加
  - [x] `removeTab(tabIndex: number): void` - タブの削除
  - [x] `reorderTabs(fromIndex: number, toIndex: number): void` - タブの順序変更
  - [x] `validateTabList(tabs: TabInfo[]): ValidationError[]` - タブリストの検証

### ステップ3: Value Objectsの確認と拡張
- [x] `TabInfo`（Unit 2から参照）の確認
- [x] `WorkStateMetadata`の確認（既存）
- [x] 必要に応じて新しいValue Objectを定義
  - [x] 新規Value Objectは不要（既存の`TabInfo`と`WorkStateMetadata`で十分）

### ステップ4: Domain Eventsの追加
- [x] `TabsUpdated` Domain Eventを定義
  - [x] ペイロード: `eventId`, `updatedTabs`, `operationType`（追加/削除/順序変更/更新）
  - [x] 発生タイミング: タブリストが更新された時

### ステップ5: Repositoriesの確認
- [x] `CalendarEventRepository`の確認（既存）
  - [x] `update`メソッドが既に存在することを確認

### ステップ6: Factoriesの確認
- [x] `WorkStateFactory`の確認（既存）
  - [x] 既存のFactoryで十分（新規メソッドは不要）

### ステップ7: ビジネスルールの定義
- [x] URL編集に関するビジネスルールを定義
  - [x] タブリストは空であってはならない（少なくとも1つのタブが必要）
  - [x] タブの順序は0から始まる連続したインデックスである必要がある
  - [x] 追加されるURLは有効なURL形式である必要がある
  - [x] 削除後もタブリストの整合性が保たれる必要がある

### ステップ8: ドメインモデルドキュメントの作成
- [x] `aidlc-docs/design-artifacts/domain-models/bolt-08-url-edit_domain_model.md`を作成
  - [x] ドメインモデルの概要
  - [x] 既存モデルとの関係
  - [x] エンティティの拡張内容
  - [x] 新しいDomain Events
  - [x] ビジネスルール
  - [x] 不変条件
  - [x] 編集操作のフロー
  - [x] 将来の拡張

## 既存ドメインモデルとの関係

### Unit 3（Google Calendar API連携）との関係
- Bolt 8はUnit 3の拡張として実装
- `WorkState`エンティティを拡張
- `WorkStateMetadata`の`tabs`フィールドを編集可能にする
- 既存の`updateMetadata`メソッドを活用

### Unit 2（タブ状態キャプチャ）との関係
- `TabInfo` Value Objectを参照
- URL編集時も`TabInfo`の形式を維持

### Unit 5（UI/UX実装）との関係
- UI層からドメイン層への編集操作の呼び出し
- 編集結果をUIに反映

## 注意事項
- 既存のドメインモデルを破壊しないように拡張する
- URL編集は`WorkState`エンティティのメソッドとして実装
- インフラストラクチャの詳細（Google Calendar APIの呼び出しなど）は含めない
- 編集履歴の記録は将来の拡張として設計に含めるが、実装はオプション

## 次のステップ
1. ✅ ユーザーの承認を取得
2. ✅ ドメインモデルドキュメントを作成

---

**作成日**: 2026-02-03  
**最終更新**: 2026-02-03  
**ステータス**: 完了
