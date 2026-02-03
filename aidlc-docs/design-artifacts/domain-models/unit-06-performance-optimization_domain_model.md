# Domain Model: Unit 6 - パフォーマンス最適化とテスト

## 概要

Unit 6は、すべてのUnitにまたがるパフォーマンス最適化とテストに関する横断的な関心事を扱うドメインモデルです。Domain-Driven Design原則に基づいて、パフォーマンス監視、最適化、テスト実行に関するドメイン概念を定義します。

## ドメインの範囲

### パフォーマンス最適化
- パフォーマンスメトリクスの測定と監視
- パフォーマンス閾値の管理
- キャッシュ戦略の実装
- バッチ処理の最適化

### テスト
- テストケースの定義と実行
- テスト結果の記録と分析
- テストカバレッジの計算と追跡

## Value Objects

### PerformanceMetric
パフォーマンスメトリクスを表すValue Object。

**属性**:
- `operationName: string` - 操作名（例: "タブ情報の取得"、"カレンダーイベントの保存"）
- `executionTimeMs: number` - 実行時間（ミリ秒）
- `memoryUsageMB: number` - メモリ使用量（MB）
- `cpuUsagePercent: number` - CPU使用率（%）
- `timestamp: Date` - 測定日時

**不変条件**:
- `executionTimeMs >= 0`
- `memoryUsageMB >= 0`
- `cpuUsagePercent >= 0 && cpuUsagePercent <= 100`
- `operationName`は空文字列ではない

**ビジネスルール**:
- パフォーマンスメトリクスは不変である
- 測定日時は必須である

### PerformanceThreshold
パフォーマンス閾値を表すValue Object。

**属性**:
- `operationName: string` - 操作名
- `maxExecutionTimeMs: number` - 最大実行時間（ミリ秒）
- `maxMemoryUsageMB: number` - 最大メモリ使用量（MB）
- `maxCpuUsagePercent: number` - 最大CPU使用率（%）

**不変条件**:
- `maxExecutionTimeMs > 0`
- `maxMemoryUsageMB > 0`
- `maxCpuUsagePercent > 0 && maxCpuUsagePercent <= 100`
- `operationName`は空文字列ではない

**ビジネスルール**:
- パフォーマンス閾値は不変である
- 各操作に対して一意の閾値が定義される

**NFR要件との対応**:
- タブ情報の取得: `maxExecutionTimeMs = 500`
- カレンダーイベントの保存: `maxExecutionTimeMs = 2000`
- 保存済み仕事の一覧取得: `maxExecutionTimeMs = 3000`
- タブの復元（10個）: `maxExecutionTimeMs = 5000`
- メモリ使用量: `maxMemoryUsageMB = 50`
- CPU使用率（アイドル時）: `maxCpuUsagePercent = 5`

### CacheStrategy
キャッシュ戦略を表すValue Object。

**属性**:
- `cacheKey: string` - キャッシュキー
- `ttlSeconds: number` - Time To Live（秒）
- `maxSize: number` - 最大キャッシュサイズ（アイテム数）
- `evictionPolicy: 'LRU' | 'FIFO' | 'LFU'` - エビクションポリシー

**不変条件**:
- `ttlSeconds > 0`
- `maxSize > 0`
- `cacheKey`は空文字列ではない

**ビジネスルール**:
- キャッシュ戦略は不変である
- TTLが経過したキャッシュエントリは無効化される

### BatchSize
バッチ処理サイズを表すValue Object。

**属性**:
- `operationName: string` - 操作名
- `size: number` - バッチサイズ（一度に処理するアイテム数）
- `delayMs: number` - バッチ間の遅延時間（ミリ秒）

**不変条件**:
- `size > 0`
- `delayMs >= 0`
- `operationName`は空文字列ではない

**ビジネスルール**:
- バッチサイズは不変である
- 大量タブ復元時は、一度に5個ずつタブを開き、各バッチの間に100msの待機時間を設ける

### PerformanceProfile
パフォーマンスプロファイルを表すValue Object。

**属性**:
- `operationName: string` - 操作名
- `averageExecutionTimeMs: number` - 平均実行時間（ミリ秒）
- `p50ExecutionTimeMs: number` - 50パーセンタイル実行時間（ミリ秒）
- `p95ExecutionTimeMs: number` - 95パーセンタイル実行時間（ミリ秒）
- `p99ExecutionTimeMs: number` - 99パーセンタイル実行時間（ミリ秒）
- `sampleCount: number` - サンプル数
- `lastUpdated: Date` - 最終更新日時

**不変条件**:
- `averageExecutionTimeMs >= 0`
- `p50ExecutionTimeMs >= 0`
- `p95ExecutionTimeMs >= 0`
- `p99ExecutionTimeMs >= 0`
- `sampleCount > 0`
- `operationName`は空文字列ではない

**ビジネスルール**:
- パフォーマンスプロファイルは不変である
- サンプル数が増えるほど、統計値の信頼性が高くなる

### TestCase
テストケースを表すValue Object。

**属性**:
- `testName: string` - テスト名
- `testSuite: string` - テストスイート名
- `description: string` - テストの説明
- `expectedResult: string` - 期待される結果
- `testType: 'unit' | 'integration' | 'e2e'` - テストタイプ

**不変条件**:
- `testName`は空文字列ではない
- `testSuite`は空文字列ではない
- `description`は空文字列ではない

**ビジネスルール**:
- テストケースは不変である
- 各テストケースは一意の名前を持つ

### TestResult
テスト結果を表すValue Object。

**属性**:
- `testCase: TestCase` - テストケース
- `status: 'passed' | 'failed' | 'skipped'` - テストステータス
- `executionTimeMs: number` - 実行時間（ミリ秒）
- `errorMessage?: string` - エラーメッセージ（失敗時）
- `timestamp: Date` - 実行日時

**不変条件**:
- `executionTimeMs >= 0`
- `status === 'failed'`の場合、`errorMessage`は必須
- `status === 'passed'`の場合、`errorMessage`は未定義

**ビジネスルール**:
- テスト結果は不変である
- テストが失敗した場合、エラーメッセージが記録される

### TestCoverage
テストカバレッジを表すValue Object。

**属性**:
- `moduleName: string` - モジュール名
- `lineCoverage: number` - 行カバレッジ（%）
- `branchCoverage: number` - 分岐カバレッジ（%）
- `functionCoverage: number` - 関数カバレッジ（%）
- `statementCoverage: number` - ステートメントカバレッジ（%）
- `timestamp: Date` - 計算日時

**不変条件**:
- `lineCoverage >= 0 && lineCoverage <= 100`
- `branchCoverage >= 0 && branchCoverage <= 100`
- `functionCoverage >= 0 && functionCoverage <= 100`
- `statementCoverage >= 0 && statementCoverage <= 100`
- `moduleName`は空文字列ではない

**ビジネスルール**:
- テストカバレッジは不変である
- 目標カバレッジは80%以上（NFR要件）
- カバレッジが80%未満の場合、警告が発行される

## Domain Events

### PerformanceThresholdExceeded
パフォーマンス閾値を超えたことを表すDomain Event。

**属性**:
- `eventId: string` - イベントID
- `operationName: string` - 操作名
- `metric: PerformanceMetric` - 超過したメトリクス
- `threshold: PerformanceThreshold` - 超過した閾値
- `exceededBy: number` - 超過量（%）
- `occurredAt: Date` - 発生日時

**ビジネスルール**:
- パフォーマンス閾値を超えた場合、このイベントが発行される
- 超過量は、閾値に対する超過率（%）で表される

### PerformanceOptimized
パフォーマンスが最適化されたことを表すDomain Event。

**属性**:
- `eventId: string` - イベントID
- `operationName: string` - 操作名
- `beforeMetric: PerformanceMetric` - 最適化前のメトリクス
- `afterMetric: PerformanceMetric` - 最適化後のメトリクス
- `improvementPercent: number` - 改善率（%）
- `optimizedAt: Date` - 最適化日時

**ビジネスルール**:
- パフォーマンスが改善された場合、このイベントが発行される
- 改善率は、最適化前に対する改善率（%）で表される

### TestExecuted
テストが実行されたことを表すDomain Event。

**属性**:
- `eventId: string` - イベントID
- `testResult: TestResult` - テスト結果
- `executedAt: Date` - 実行日時

**ビジネスルール**:
- テストが実行されるたびに、このイベントが発行される
- テスト結果が含まれる

### TestCoverageCalculated
テストカバレッジが計算されたことを表すDomain Event。

**属性**:
- `eventId: string` - イベントID
- `coverage: TestCoverage` - テストカバレッジ
- `calculatedAt: Date` - 計算日時

**ビジネスルール**:
- テストカバレッジが計算されるたびに、このイベントが発行される
- カバレッジが80%未満の場合、警告が発行される

### CacheHit
キャッシュヒットを表すDomain Event。

**属性**:
- `eventId: string` - イベントID
- `cacheKey: string` - キャッシュキー
- `hitAt: Date` - ヒット日時

**ビジネスルール**:
- キャッシュヒットが発生するたびに、このイベントが発行される

### CacheMiss
キャッシュミスを表すDomain Event。

**属性**:
- `eventId: string` - イベントID
- `cacheKey: string` - キャッシュキー
- `missedAt: Date` - ミス日時

**ビジネスルール**:
- キャッシュミスが発生するたびに、このイベントが発行される

## Domain Services

### PerformanceMonitoringService
パフォーマンス監視を担当するDomain Service。

**責任**:
- パフォーマンスメトリクスの収集
- パフォーマンス閾値との比較
- パフォーマンスプロファイルの更新

**主要メソッド**:
- `recordMetric(metric: PerformanceMetric): void` - メトリクスを記録
- `checkThreshold(metric: PerformanceMetric, threshold: PerformanceThreshold): boolean` - 閾値をチェック
- `updateProfile(metric: PerformanceMetric): PerformanceProfile` - プロファイルを更新
- `getProfile(operationName: string): PerformanceProfile | null` - プロファイルを取得

**ビジネスルール**:
- メトリクスが閾値を超えた場合、`PerformanceThresholdExceeded`イベントを発行
- プロファイルは、新しいメトリクスが記録されるたびに更新される

### PerformanceOptimizationService
パフォーマンス最適化を担当するDomain Service。

**責任**:
- パフォーマンス最適化戦略の決定
- キャッシュ戦略の適用
- バッチ処理サイズの最適化

**主要メソッド**:
- `optimizeCacheStrategy(operationName: string): CacheStrategy` - キャッシュ戦略を最適化
- `optimizeBatchSize(operationName: string, currentSize: number): BatchSize` - バッチサイズを最適化
- `shouldUseCache(operationName: string): boolean` - キャッシュを使用すべきか判定

**ビジネスルール**:
- パフォーマンスが改善された場合、`PerformanceOptimized`イベントを発行
- 最適化戦略は、パフォーマンスプロファイルに基づいて決定される

### TestExecutionService
テスト実行を担当するDomain Service。

**責任**:
- テストケースの実行
- テスト結果の記録
- テストスイートの実行

**主要メソッド**:
- `executeTest(testCase: TestCase): Promise<TestResult>` - テストを実行
- `executeTestSuite(testSuite: string): Promise<TestResult[]>` - テストスイートを実行
- `getTestResults(testSuite: string): TestResult[]` - テスト結果を取得

**ビジネスルール**:
- テストが実行されるたびに、`TestExecuted`イベントを発行
- テスト結果は不変である

### TestCoverageService
テストカバレッジ計算を担当するDomain Service。

**責任**:
- テストカバレッジの計算
- カバレッジ目標の達成確認
- カバレッジレポートの生成

**主要メソッド**:
- `calculateCoverage(moduleName: string): TestCoverage` - カバレッジを計算
- `checkCoverageGoal(coverage: TestCoverage): boolean` - カバレッジ目標を達成しているか確認
- `generateCoverageReport(): TestCoverage[]` - カバレッジレポートを生成

**ビジネスルール**:
- カバレッジが計算されるたびに、`TestCoverageCalculated`イベントを発行
- カバレッジが80%未満の場合、警告を発行
- カバレッジ目標は80%以上（NFR要件）

### CacheManagementService
キャッシュ管理を担当するDomain Service。

**責任**:
- キャッシュエントリの管理
- キャッシュヒット/ミスの追跡
- キャッシュの無効化

**主要メソッド**:
- `getCacheKey(operationName: string, params: Record<string, unknown>): string` - キャッシュキーを生成
- `shouldInvalidateCache(cacheKey: string, strategy: CacheStrategy): boolean` - キャッシュを無効化すべきか判定
- `recordCacheHit(cacheKey: string): void` - キャッシュヒットを記録
- `recordCacheMiss(cacheKey: string): void` - キャッシュミスを記録

**ビジネスルール**:
- キャッシュヒットが発生するたびに、`CacheHit`イベントを発行
- キャッシュミスが発生するたびに、`CacheMiss`イベントを発行
- TTLが経過したキャッシュエントリは自動的に無効化される

## ビジネスルール

### パフォーマンス要件（NFR要件）

1. **タブ情報の取得**:
   - 最大20タブの取得を500ms以内で完了
   - `PerformanceThreshold`で`maxExecutionTimeMs = 500`を設定

2. **カレンダーイベントの保存**:
   - 保存リクエスト完了まで2秒以内
   - `PerformanceThreshold`で`maxExecutionTimeMs = 2000`を設定

3. **保存済み仕事の一覧取得**:
   - 過去30日分（最大600件）を3秒以内で取得
   - `PerformanceThreshold`で`maxExecutionTimeMs = 3000`を設定

4. **タブの復元**:
   - 10個のタブを5秒以内で復元
   - `PerformanceThreshold`で`maxExecutionTimeMs = 5000`を設定

5. **メモリ使用量**:
   - 拡張機能のメモリ使用量は50MB以内
   - `PerformanceThreshold`で`maxMemoryUsageMB = 50`を設定

6. **CPU使用率**:
   - バックグラウンド処理時のCPU使用率は5%以内（アイドル時）
   - `PerformanceThreshold`で`maxCpuUsagePercent = 5`を設定

### テスト要件

1. **テストカバレッジ**:
   - 目標カバレッジは80%以上（NFR要件）
   - `TestCoverage`で`lineCoverage >= 80`、`branchCoverage >= 80`を確認

2. **テストタイプ**:
   - ユニットテスト、統合テスト、E2Eテストをサポート
   - `TestCase`で`testType`を指定

3. **テスト実行**:
   - すべてのテストが実行される
   - テスト結果は記録される

### パフォーマンス最適化戦略

1. **キャッシュ戦略**:
   - 頻繁にアクセスされるデータはキャッシュする
   - TTLは操作によって異なる（例: タブ情報は5秒、カレンダーイベントは30秒）

2. **バッチ処理**:
   - 大量タブ復元時は、一度に5個ずつタブを開く
   - 各バッチの間に100msの待機時間を設ける

3. **段階的読み込み**:
   - 大量データの取得時は、段階的に読み込む
   - 最初のページを先に表示し、残りをバックグラウンドで読み込む

## 各Unitとの統合

### Unit 1: 認証
- **パフォーマンス監視**: 認証処理の実行時間を監視
- **テスト**: 認証フローのユニットテストと統合テスト

### Unit 2: タブキャプチャ
- **パフォーマンス監視**: タブ情報取得の実行時間を監視（500ms以内）
- **テスト**: タブキャプチャのユニットテストと統合テスト
- **最適化**: 大量タブ取得時のパフォーマンス最適化

### Unit 3: Calendar API
- **パフォーマンス監視**: API呼び出しの実行時間を監視（保存: 2秒以内、一覧取得: 3秒以内）
- **テスト**: Calendar API連携のユニットテストと統合テスト
- **最適化**: API呼び出しのバッチ処理、キャッシュ戦略

### Unit 4: 状態復元
- **パフォーマンス監視**: タブ復元の実行時間を監視（10個: 5秒以内）
- **テスト**: 復元機能のユニットテストと統合テスト
- **最適化**: 大量タブ復元時の段階的読み込み（5個ずつ、100ms間隔）

### Unit 5: UI/UX
- **パフォーマンス監視**: UI操作の応答時間を監視（100ms以内）
- **テスト**: UIコンポーネントのユニットテストと統合テスト
- **最適化**: UIレンダリングの最適化、仮想スクロール

## 実装の優先順位

**優先度**: 高（品質保証の要）

## リスク

- **RISK-004**: 大量タブ処理のパフォーマンス問題
  - 軽減策: 段階的読み込みの最適化、バッチ処理の実装
  - ドメインモデルでの対応: `BatchSize` Value Object、`PerformanceOptimizationService`

## 成功基準

- [ ] すべてのパフォーマンス要件を満たす
- [ ] テストカバレッジが80%以上
- [ ] パフォーマンス監視が正常に動作する
- [ ] パフォーマンス最適化が正常に動作する
- [ ] テスト実行が正常に動作する
- [ ] テストカバレッジ計算が正常に動作する

---

**作成日**: 2026-02-03  
**最終更新**: 2026-02-03  
**ステータス**: 設計完了
