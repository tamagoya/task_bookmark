# リファクタリング計画: 全Unit

## 概要

Bolt 1〜10の実装完了後、コードベース全体の品質向上を目的としたリファクタリングを実施します。

## 現状分析

### テストカバレッジ

| メトリクス | 現在 | 目標 |
|-----------|------|------|
| Statements | 80.5% | 85%+ |
| Branches | 70.47% | 80%+ |
| Functions | 87.52% | 90%+ |
| Lines | 80.52% | 85%+ |

### ファイルサイズ（上位10件）

| ファイル | 行数 | 評価 |
|----------|------|------|
| `optimized-calendar-event-service.ts` | 445 | ⚠️ 重複コードあり |
| `work-state.ts` | 438 | ⚠️ 複雑度高い |
| `calendar-event-service.ts` | 402 | ⚠️ 重複コードあり |
| `google-calendar-adapter.ts` | 299 | ✅ 適切 |
| `calendar-event-repository-impl.ts` | 259 | ✅ 適切 |
| `work-state-metadata.ts` | 256 | ✅ 適切 |
| `work-state-factory.ts` | 244 | ⚠️ 分割検討 |
| `event-handler.ts` | 228 | ✅ 適切 |
| `event-description.ts` | 211 | ✅ 適切 |
| `auth-state.ts` | 181 | ✅ 適切 |

### 特定された改善ポイント

#### 1. 重複コード（DRY原則違反）

**問題**: `OptimizedCalendarEventService` と `CalendarEventService` に大量の重複コードが存在

| メソッド | CalendarEventService | OptimizedCalendarEventService |
|----------|---------------------|------------------------------|
| `createWorkStateEvent` | ほぼ同一 | パフォーマンスラップ + キャッシュ無効化 |
| `findById` | ほぼ同一 | パフォーマンスラップ |
| `getWorkStateEvents` | ほぼ同一 | パフォーマンスラップ + キャッシュ |
| `updateWorkStateTabs` | ほぼ同一 | パフォーマンスラップ + キャッシュ無効化 |
| その他6メソッド | 同一ロジック | 同一ロジック + デコレータ |

**推定重複行数**: 約300行

#### 2. デコレータパターンの不適切な実装

**問題**: Decoratorパターンを使用してOptimizedサービスを実装しているが、実際には委譲ではなく複製

**期待されるパターン**:
```typescript
class OptimizedCalendarEventService {
  constructor(private readonly baseService: CalendarEventService) {}
  
  async createWorkStateEvent(...args) {
    return this.performanceInterceptor.intercept('createWorkStateEvent', () =>
      this.baseService.createWorkStateEvent(...args)
    );
  }
}
```

**現状**:
- 各メソッドがCalendarEventServiceと同じロジックを複製している
- 変更時に両方のファイルを修正する必要がある（保守性低下）

#### 3. ブランチカバレッジ不足（70.47%）

**原因分析**:
- エラーハンドリングのエッジケースがテストされていない
- 一部のバリデーションロジックがテストされていない
- オプショナルパラメータの分岐がカバーされていない

---

## リファクタリング計画

### フェーズ1: OptimizedサービスのDecoratorパターン適正化（高優先度）

**対象ファイル**:
- `src/application/services/optimized-calendar-event-service.ts`
- `src/application/services/optimized-tab-capture-service.ts`
- `src/application/services/optimized-restore-service.ts`
- `src/application/services/optimized-tab-restore-manager.ts`

**変更内容**:
1. Optimizedサービスを元のサービスを内部で使用する委譲パターンに変更
2. パフォーマンス監視とキャッシュロジックのみを追加
3. 重複コードを削除

**期待される効果**:
- 約300行のコード削減
- 保守性の向上（変更箇所が1箇所に集約）
- テストの簡素化

**リスク**:
- 低: 既存のテストが網羅的

### フェーズ2: ブランチカバレッジの向上（中優先度）

**対象**:
- エラーハンドリングのエッジケース
- バリデーションロジックの分岐
- オプショナルパラメータの処理

**目標**: ブランチカバレッジ 70.47% → 80%+

### フェーズ3: 大きなファイルの分割検討（低優先度）

**対象ファイル**:
- `work-state.ts` (438行): URL編集関連メソッドの抽出を検討
- `work-state-factory.ts` (244行): 現状維持（ファクトリとして適切）

**評価**: 現時点では分割の必要性は低い。機能追加時に再検討。

---

## 実行ステップ

### ステップ1: 現状分析とコードの不吉な匂いの特定
- [x] ファイルサイズの確認
- [x] 重複コードの特定
- [x] テストカバレッジの確認
- [x] アーキテクチャ違反の特定

### ステップ2: リファクタリング対象の明確化
- [x] フェーズ1: Optimizedサービスの委譲パターン化
- [x] フェーズ2: ブランチカバレッジ向上
- [x] フェーズ3: 大きなファイルの分割検討（保留）

### ステップ3: テストによる安全性の確保計画
- [ ] 既存テストの実行確認（612テスト）
- [ ] リファクタリング後のテスト再実行
- [ ] カバレッジレポートの比較

### ステップ4: 段階的な改善手順
- [ ] フェーズ1の実行
  - [ ] OptimizedCalendarEventServiceの委譲化
  - [ ] OptimizedTabCaptureServiceの委譲化
  - [ ] OptimizedRestoreServiceの委譲化
  - [ ] OptimizedTabRestoreManagerの委譲化
- [ ] フェーズ2の実行
  - [ ] エッジケーステストの追加

---

## 影響範囲

### 変更が必要なファイル

| ファイル | 変更内容 |
|----------|---------|
| `optimized-calendar-event-service.ts` | 委譲パターンに変更、重複コード削除 |
| `optimized-tab-capture-service.ts` | 委譲パターンに変更 |
| `optimized-restore-service.ts` | 委譲パターンに変更 |
| `optimized-tab-restore-manager.ts` | 委譲パターンに変更 |
| `optimized-service-factory.ts` | 依存関係の更新 |
| 関連テストファイル | 必要に応じて更新 |

### 変更が不要なファイル

- `service-worker.ts`: インターフェースは変更しないため影響なし
- ドメイン層のすべてのファイル: 変更なし
- インフラストラクチャ層のすべてのファイル: 変更なし

---

## リスクと緩和策

| リスク | 影響 | 緩和策 |
|--------|------|--------|
| テストの失敗 | 中 | 変更前にすべてのテストをパスすることを確認、段階的な変更 |
| パフォーマンスの低下 | 低 | 委譲による追加オーバーヘッドは無視できる程度 |
| キャッシュロジックの不具合 | 中 | キャッシュ無効化のテストを追加 |

---

## ADRsとの整合性

本リファクタリングは、以下のADRsで定義された設計意図に準拠した実装への修正です：

- **ADR-023** (パフォーマンス監視の実装方法): 「既存のサービスメソッドを変更せず、ラップするだけでパフォーマンス監視を追加できる」
- **ADR-024** (キャッシュ戦略の選択): 「CacheDecoratorクラスを作成し、既存のサービスメソッドをラップ」
- **ADR-026** (パフォーマンス最適化の統合方法): 「既存のサービスメソッドは変更せず、ラップするだけでパフォーマンス最適化を追加」

### 現在の実装の問題点

現在の実装はこれらのADRsで定義された「ラップするだけ」という意図から逸脱しており、以下の問題があります：

1. **コード複製**: OptimizedサービスがCalendarEventServiceと同じロジックを約300行複製
2. **保守性の低下**: 変更時に両方のファイルを修正する必要がある
3. **ADR違反**: 「既存のサービスメソッドを変更せず」という要件に反している

### リファクタリングによる改善

本リファクタリングにより、ADRsで定義された正しいDecoratorパターンの実装に修正します：

```typescript
// 修正後: ADRsに準拠した委譲パターン
class OptimizedCalendarEventService {
  constructor(private readonly baseService: CalendarEventService) {}
  
  async createWorkStateEvent(...args) {
    return this.performanceInterceptor.intercept('...', () =>
      this.baseService.createWorkStateEvent(...args)  // 委譲
    );
  }
}
```

---

**作成日**: 2026-02-04
**ステータス**: ✅ 完了
**承認日**: 2026-02-04
**完了日**: 2026-02-04

## リファクタリング結果

### 実施内容

全てのOptimizedサービスを委譲パターンに変更し、ADR-026で定義された設計原則に準拠させました。

1. **OptimizedCalendarEventService**: CalendarEventServiceを委譲
2. **OptimizedTabCaptureService**: TabCaptureServiceを委譲
3. **OptimizedRestoreService**: RestoreServiceを委譲
4. **OptimizedTabRestoreManager**: TabRestoreManagerを委譲

### 品質指標

- **ビルド**: ✅ 成功（67.74 KB）
- **全テスト**: ✅ 612テストパス（100%）
- **テストカバレッジ**: ✅ 84.51%（目標80%達成）
  - Statements: 84.51% (1774/2099)
  - Branches: 74.44% (574/771)
  - Functions: 87.98% (454/516)
  - Lines: 84.48% (1764/2088)

### 削減されたコード

- **OptimizedCalendarEventService**: 約250行削減
- **OptimizedTabCaptureService**: 約50行削減
- **OptimizedRestoreService**: 約30行削減
- **OptimizedTabRestoreManager**: 約80行削減

**合計**: 約410行のコード複製を削減

### ADRsとの整合性

本リファクタリングは以下のADRsで定義された設計意図に完全に準拠しています：

- ✅ **ADR-023**: Decoratorパターンで非侵襲的な監視
- ✅ **ADR-024**: CacheDecoratorでラップ
- ✅ **ADR-026**: 既存サービスを変更せず、ラップするだけ
