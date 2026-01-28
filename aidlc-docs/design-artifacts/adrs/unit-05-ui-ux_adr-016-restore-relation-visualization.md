# ADR-016: 前後関係可視化UIのデザイン決定

## ステータス
承認済み

## コンテキスト
User Story 7（仕事の前後関係の可視化）を実装するため、保存済み仕事の前後関係（どの仕事から復元されたか、どの仕事に続いたか）を視覚的に表示するUIが必要です。

Bolt 6で実装された復元メタデータ（`restoredFrom`、`restoredTo`）を活用し、ユーザーが仕事の流れを理解できるようにする必要があります。

要件：
- 復元元（`restoredFrom`）の表示
- 復元先（`restoredTo`）の表示
- 一覧表示での前後関係のインジケーター
- 詳細表示での前後関係の詳細情報
- クリック可能なリンク（詳細表示への遷移）

## 決定
前後関係可視化UIのデザインとして、以下の戦略を採用します：

1. **2段階の表示アプローチ**: 一覧表示と詳細表示を分離
   - **一覧表示**: 前後関係があることを示すインジケーター（🔗アイコン）を表示
   - **詳細表示**: 前後関係の詳細情報（復元元、復元先のリスト）を表示
   - **理由**: UIの複雑化を避け、必要な情報だけを表示

2. **詳細表示のレイアウト**: 縦型の階層構造
   - **復元元**: 上に表示（← アイコンで視覚的に表現）
   - **復元先**: 下に表示（→ アイコンで視覚的に表現）
   - **理由**: 時系列の流れを直感的に理解できる

3. **クリック可能なリンク**: 前後関係の各項目をクリック可能にする
   - **動作**: クリックすると、その仕事の詳細表示に遷移
   - **理由**: 前後関係を辿って探索できるようにする

4. **データ取得の最適化**: 必要に応じて遅延読み込み
   - **一覧表示**: 前後関係の有無のみを判定（軽量）
   - **詳細表示**: 詳細情報を取得（必要時のみ）
   - **理由**: パフォーマンスを維持

5. **エラーハンドリング**: 存在しないイベントの処理
   - **削除されたイベント**: 「削除済み」と表示
   - **存在しないイベントID**: 「前後関係を取得できませんでした」と表示
   - **理由**: データの不整合に対応

## 結果

### ポジティブ
- **直感的なUI**: 時系列の流れを視覚的に理解できる
- **パフォーマンス**: 遅延読み込みにより、一覧表示のパフォーマンスを維持
- **拡張性**: 将来、復元チェーンの表示を追加しやすい
- **ユーザビリティ**: クリック可能なリンクにより、前後関係を探索できる

### ネガティブ
- **UIの複雑化**: 詳細表示が複雑になる可能性
- **データ取得のオーバーヘッド**: 詳細表示時に複数のイベントを取得する必要がある
- **エラー処理の複雑性**: 存在しないイベントの処理が必要

### 検討した代替案

#### 代替案1: 一覧表示に詳細情報を含める
- **説明**: 一覧表示に復元元・復元先の情報を直接表示
- **却下理由**: UIが複雑になりすぎる、パフォーマンスの問題

#### 代替案2: モーダルウィンドウで表示
- **説明**: 前後関係をモーダルウィンドウで表示
- **却下理由**: サイドパネルのスペースを有効活用できない、操作が複雑になる

#### 代替案3: ツリービューで表示
- **説明**: 前後関係をツリービューで表示
- **却下理由**: 実装が複雑、サイドパネルのスペースに収まらない可能性

#### 代替案4: タイムライン表示
- **説明**: 前後関係をタイムライン形式で表示
- **却下理由**: 実装が複雑、サイドパネルのスペースに収まらない可能性

## 実装例

### UI構造
```html
<!-- 一覧表示 -->
<div class="work-state-item">
  <div class="work-state-header">
    <div class="work-state-title">プロジェクトAの調査</div>
    <span class="restore-relation-indicator">🔗</span>
  </div>
  <div class="work-state-tab-count">5タブ</div>
  <button class="restore-button">復元</button>
</div>

<!-- 詳細表示 -->
<div class="restore-relations-section">
  <h3>前後関係</h3>
  
  <!-- 復元元 -->
  <div class="restored-from-section">
    <div class="restore-relation-label">← 復元元</div>
    <div class="restored-from-item">
      <div class="relation-title">プロジェクトBの調査</div>
      <div class="relation-date">保存日時: 2026-01-21 15:00</div>
      <button class="relation-link">詳細を見る</button>
    </div>
  </div>
  
  <!-- 復元先 -->
  <div class="restored-to-section">
    <div class="restore-relation-label">→ 復元先 (2件)</div>
    <div class="restored-to-item">
      <div class="relation-title">プロジェクトAの続き</div>
      <div class="relation-date">復元日時: 2026-01-22 14:00</div>
      <button class="relation-link">詳細を見る</button>
    </div>
    <div class="restored-to-item">
      <div class="relation-title">プロジェクトAの再開</div>
      <div class="relation-date">復元日時: 2026-01-23 09:00</div>
      <button class="relation-link">詳細を見る</button>
    </div>
  </div>
</div>
```

### データ構造
```typescript
interface RestoreRelations {
  restoredFrom: {
    eventId: string;
    title: string;
    savedAt: string;
  } | null;
  restoredTo: Array<{
    eventId: string;
    title: string;
    restoredAt: string; // ISO 8601形式
  }>;
}
```

## 日付
2026-01-22

---

**作成者**: アーキテクト  
**レビュー**: 承認済み
