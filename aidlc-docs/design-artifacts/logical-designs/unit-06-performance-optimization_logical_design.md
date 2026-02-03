# Logical Design: Unit 6 - パフォーマンス最適化とテスト

## 概要
本ドキュメントは、Unit 6（パフォーマンス最適化とテスト）のLogical Designを定義します。Unit 6は、すべてのUnit（1-5）にまたがる横断的な関心事を扱い、既存のLogical Designを拡張してパフォーマンス監視、最適化、テスト実行の機能を統合します。

## アーキテクチャパターン

### 採用したパターン

1. **レイヤードアーキテクチャ**: ドメイン層、アプリケーション層、インフラストラクチャ層の分離（Unit 1-5と一貫性を保つ）
2. **Decorator パターン**: 既存サービスへのパフォーマンス監視の追加（新規）
3. **Interceptor パターン**: メソッド呼び出しのインターセプト（新規）
4. **Cache-Aside パターン**: アプリケーションレベルのキャッシュ（新規）
5. **Service Layer パターン**: アプリケーションロジックの集約（Unit 1-5のパターンを拡張）
6. **Test Runner パターン**: テスト実行の抽象化（新規）
7. **Test Reporter パターン**: テスト結果の集約とレポート（新規）

---

## レイヤー構造

### 1. ドメイン層 (Domain Layer)

**責任**: ビジネスロジックとドメインモデル

**コンポーネント**:
- `PerformanceMetric` (Value Object)
- `PerformanceThreshold` (Value Object)
- `CacheStrategy` (Value Object)
- `BatchSize` (Value Object)
- `PerformanceProfile` (Value Object)
- `TestCase` (Value Object)
- `TestResult` (Value Object)
- `TestCoverage` (Value Object)
- Domain Events (`PerformanceThresholdExceeded`, `PerformanceOptimized`, `TestExecuted`, `TestCoverageCalculated`, `CacheHit`, `CacheMiss`)
- Domain Services (`PerformanceMonitoringService`, `PerformanceOptimizationService`, `TestExecutionService`, `TestCoverageService`, `CacheManagementService`)

**特徴**:
- インフラストラクチャに依存しない
- 純粋なビジネスロジック
- テスト容易性が高い
- パフォーマンス要件（NFRs）をドメインモデルで表現

---

### 2. アプリケーション層 (Application Layer)

**責任**: ユースケースの実装、ドメイン層とインフラストラクチャ層の調整

**コンポーネント**:

#### PerformanceMonitoringService（Application Service）
パフォーマンス監視を担当するアプリケーションサービスです。

**主要メソッド**:
- `recordMetric(operationName: string, executionTimeMs: number, memoryUsageMB: number, cpuUsagePercent: number): Promise<void>`
  - パフォーマンスメトリクスを記録
  - 依存関係: Domain Layer (PerformanceMetric, PerformanceMonitoringService), Infrastructure Layer (PerformanceMetricsRepository)
  - 非同期処理でオーバーヘッドを最小化

- `checkThreshold(operationName: string, metric: PerformanceMetric): Promise<boolean>`
  - パフォーマンス閾値をチェック
  - 依存関係: Domain Layer (PerformanceThreshold, PerformanceMonitoringService)
  - 閾値を超えた場合、`PerformanceThresholdExceeded`イベントを発行

- `getProfile(operationName: string): Promise<PerformanceProfile | null>`
  - パフォーマンスプロファイルを取得
  - 依存関係: Domain Layer (PerformanceProfile), Infrastructure Layer (PerformanceMetricsRepository)

**依存関係**:
- Domain Layer (PerformanceMetric, PerformanceThreshold, PerformanceProfile, PerformanceMonitoringService)
- Infrastructure Layer (PerformanceMetricsRepository, Logger)

#### PerformanceOptimizationService（Application Service）
パフォーマンス最適化を担当するアプリケーションサービスです。

**主要メソッド**:
- `optimizeCacheStrategy(operationName: string): Promise<CacheStrategy>`
  - キャッシュ戦略を最適化
  - 依存関係: Domain Layer (CacheStrategy, PerformanceOptimizationService, PerformanceProfile)
  - パフォーマンスプロファイルに基づいて最適なキャッシュ戦略を決定

- `optimizeBatchSize(operationName: string, currentSize: number): Promise<BatchSize>`
  - バッチサイズを最適化
  - 依存関係: Domain Layer (BatchSize, PerformanceOptimizationService, PerformanceProfile)
  - パフォーマンスプロファイルに基づいて最適なバッチサイズを決定

- `shouldUseCache(operationName: string): Promise<boolean>`
  - キャッシュを使用すべきか判定
  - 依存関係: Domain Layer (PerformanceOptimizationService, PerformanceProfile)
  - 頻繁にアクセスされる操作はキャッシュを使用

**依存関係**:
- Domain Layer (CacheStrategy, BatchSize, PerformanceOptimizationService, PerformanceProfile)
- Infrastructure Layer (PerformanceMetricsRepository)

#### CacheManagementService（Application Service）
キャッシュ管理を担当するアプリケーションサービスです。

**主要メソッド**:
- `getCacheKey(operationName: string, params: Record<string, unknown>): string`
  - キャッシュキーを生成
  - 依存関係: Domain Layer (CacheManagementService)
  - 操作名とパラメータから一意のキャッシュキーを生成

- `shouldInvalidateCache(cacheKey: string, strategy: CacheStrategy): Promise<boolean>`
  - キャッシュを無効化すべきか判定
  - 依存関係: Domain Layer (CacheStrategy, CacheManagementService)
  - TTLが経過したキャッシュエントリは無効化

- `recordCacheHit(cacheKey: string): Promise<void>`
  - キャッシュヒットを記録
  - 依存関係: Domain Layer (CacheManagementService), Infrastructure Layer (CacheRepository)
  - `CacheHit`イベントを発行

- `recordCacheMiss(cacheKey: string): Promise<void>`
  - キャッシュミスを記録
  - 依存関係: Domain Layer (CacheManagementService), Infrastructure Layer (CacheRepository)
  - `CacheMiss`イベントを発行

**依存関係**:
- Domain Layer (CacheStrategy, CacheManagementService)
- Infrastructure Layer (CacheRepository, Logger)

#### TestExecutionService（Application Service）
テスト実行を担当するアプリケーションサービスです。

**主要メソッド**:
- `executeTest(testCase: TestCase): Promise<TestResult>`
  - テストを実行
  - 依存関係: Domain Layer (TestCase, TestResult, TestExecutionService), Infrastructure Layer (TestRunner)
  - テスト実行後、`TestExecuted`イベントを発行

- `executeTestSuite(testSuite: string): Promise<TestResult[]>`
  - テストスイートを実行
  - 依存関係: Domain Layer (TestCase, TestResult, TestExecutionService), Infrastructure Layer (TestRunner)
  - 並列実行をサポート（Jestの機能を活用）

- `getTestResults(testSuite: string): Promise<TestResult[]>`
  - テスト結果を取得
  - 依存関係: Infrastructure Layer (TestResultsRepository)

**依存関係**:
- Domain Layer (TestCase, TestResult, TestExecutionService)
- Infrastructure Layer (TestRunner, TestResultsRepository, Logger)

#### TestCoverageService（Application Service）
テストカバレッジ計算を担当するアプリケーションサービスです。

**主要メソッド**:
- `calculateCoverage(moduleName: string): Promise<TestCoverage>`
  - カバレッジを計算
  - 依存関係: Domain Layer (TestCoverage, TestCoverageService), Infrastructure Layer (CoverageCalculator)
  - カバレッジ計算後、`TestCoverageCalculated`イベントを発行

- `checkCoverageGoal(coverage: TestCoverage): Promise<boolean>`
  - カバレッジ目標を達成しているか確認
  - 依存関係: Domain Layer (TestCoverage, TestCoverageService)
  - 目標カバレッジは80%以上（NFR要件）

- `generateCoverageReport(): Promise<TestCoverage[]>`
  - カバレッジレポートを生成
  - 依存関係: Infrastructure Layer (CoverageCalculator)

**依存関係**:
- Domain Layer (TestCoverage, TestCoverageService)
- Infrastructure Layer (CoverageCalculator, Logger)

#### PerformanceInterceptor（Decorator パターン）
既存のサービスメソッドにパフォーマンス監視を追加するインターセプターです。

**主要メソッド**:
- `intercept<T>(operationName: string, operation: () => Promise<T>): Promise<T>`
  - 操作をインターセプトしてパフォーマンスメトリクスを記録
  - 依存関係: Application Layer (PerformanceMonitoringService), Infrastructure Layer (PerformanceMetricsCollector)
  - 実行時間、メモリ使用量、CPU使用率を測定

**実装例**:
```typescript
class PerformanceInterceptor {
  constructor(
    private readonly monitoringService: PerformanceMonitoringService,
    private readonly metricsCollector: PerformanceMetricsCollector
  ) {}

  async intercept<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = this.metricsCollector.getMemoryUsage();
    const startCpu = this.metricsCollector.getCpuUsage();

    try {
      const result = await operation();
      return result;
    } finally {
      const endTime = performance.now();
      const endMemory = this.metricsCollector.getMemoryUsage();
      const endCpu = this.metricsCollector.getCpuUsage();

      await this.monitoringService.recordMetric(
        operationName,
        endTime - startTime,
        endMemory - startMemory,
        endCpu - startCpu
      );
    }
  }
}
```

**依存関係**:
- Application Layer (PerformanceMonitoringService)
- Infrastructure Layer (PerformanceMetricsCollector)

#### CacheDecorator（Decorator パターン）
既存のサービスメソッドにキャッシュ機能を追加するデコレーターです。

**主要メソッド**:
- `withCache<T>(operationName: string, params: Record<string, unknown>, operation: () => Promise<T>, strategy: CacheStrategy): Promise<T>`
  - 操作をキャッシュでラップ
  - 依存関係: Application Layer (CacheManagementService), Infrastructure Layer (CacheRepository)
  - Cache-Aside パターンを実装

**実装例**:
```typescript
class CacheDecorator {
  constructor(
    private readonly cacheService: CacheManagementService,
    private readonly cacheRepository: CacheRepository
  ) {}

  async withCache<T>(
    operationName: string,
    params: Record<string, unknown>,
    operation: () => Promise<T>,
    strategy: CacheStrategy
  ): Promise<T> {
    const cacheKey = this.cacheService.getCacheKey(operationName, params);

    // キャッシュから取得を試みる
    const cached = await this.cacheRepository.get(cacheKey);
    if (cached && !this.cacheService.shouldInvalidateCache(cacheKey, strategy)) {
      await this.cacheService.recordCacheHit(cacheKey);
      return cached as T;
    }

    // キャッシュミス: 操作を実行
    await this.cacheService.recordCacheMiss(cacheKey);
    const result = await operation();

    // キャッシュに保存
    await this.cacheRepository.set(cacheKey, result, strategy.ttlSeconds);

    return result;
  }
}
```

**依存関係**:
- Application Layer (CacheManagementService)
- Infrastructure Layer (CacheRepository)

---

### 3. インフラストラクチャ層 (Infrastructure Layer)

**責任**: 外部APIとの通信、永続化、パフォーマンスメトリクスの収集

**コンポーネント**:

#### PerformanceMetricsRepository
パフォーマンスメトリクスの永続化を担当するリポジトリです。

**実装**:
```typescript
interface PerformanceMetricsRepository {
  save(metric: PerformanceMetric): Promise<void>;
  findByOperationName(operationName: string, limit: number): Promise<PerformanceMetric[]>;
  getProfile(operationName: string): Promise<PerformanceProfile | null>;
}
```

**実装クラス**:
- `ChromeStoragePerformanceMetricsRepository`: Chrome Storage APIを使用した実装
- メトリクスは最大1000件まで保存（古いものから削除）

#### PerformanceMetricsCollector
パフォーマンスメトリクスの収集を担当するアダプターです。

**実装**:
```typescript
class PerformanceMetricsCollector {
  getMemoryUsage(): number {
    // Chrome Extension APIを使用してメモリ使用量を取得
    // 実装はChrome Extension APIの制約に依存
    return 0; // 簡易実装
  }

  getCpuUsage(): number {
    // Chrome Extension APIを使用してCPU使用率を取得
    // 実装はChrome Extension APIの制約に依存
    return 0; // 簡易実装
  }
}
```

**制約**:
- Chrome Extension APIでは、メモリ使用量とCPU使用率の直接的な取得が制限される
- 実装は簡易的なものになる可能性がある

#### CacheRepository
キャッシュの永続化を担当するリポジトリです。

**実装**:
```typescript
interface CacheRepository {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

**実装クラス**:
- `InMemoryCacheRepository`: メモリ内キャッシュ（簡易実装）
- `ChromeStorageCacheRepository`: Chrome Storage APIを使用した実装（将来の拡張）

#### TestRunner
テスト実行を担当するアダプターです。

**実装**:
```typescript
interface TestRunner {
  runTest(testCase: TestCase): Promise<TestResult>;
  runTestSuite(testSuite: string): Promise<TestResult[]>;
}
```

**実装クラス**:
- `JestTestRunner`: Jestを使用した実装
- Jestの既存機能を活用（並列実行、カバレッジ計算など）

#### CoverageCalculator
テストカバレッジの計算を担当するアダプターです。

**実装**:
```typescript
interface CoverageCalculator {
  calculateCoverage(moduleName: string): Promise<TestCoverage>;
  generateReport(): Promise<TestCoverage[]>;
}
```

**実装クラス**:
- `JestCoverageCalculator`: Jestのカバレッジ機能を使用した実装
- Jestの`--coverage`オプションを活用

#### TestResultsRepository
テスト結果の永続化を担当するリポジトリです。

**実装**:
```typescript
interface TestResultsRepository {
  save(result: TestResult): Promise<void>;
  findByTestSuite(testSuite: string): Promise<TestResult[]>;
  getLatestResults(limit: number): Promise<TestResult[]>;
}
```

**実装クラス**:
- `FileSystemTestResultsRepository`: ファイルシステムに保存（CI/CD環境）
- `ChromeStorageTestResultsRepository`: Chrome Storage APIを使用した実装（開発環境）

---

## 既存Unitへの統合

### Unit 1: 認証
- **パフォーマンス監視**: `AuthenticationService`の各メソッドに`PerformanceInterceptor`を適用
- **キャッシュ**: 認証トークンはキャッシュしない（セキュリティ要件）
- **テスト**: 認証フローのユニットテストと統合テスト

### Unit 2: タブキャプチャ
- **パフォーマンス監視**: `TabCaptureService.getCurrentWindowTabs()`に`PerformanceInterceptor`を適用（500ms以内の要件）
- **キャッシュ**: タブ情報は5秒間キャッシュ（`CacheStrategy`で`ttlSeconds = 5`）
- **テスト**: タブキャプチャのユニットテストと統合テスト

### Unit 3: Calendar API
- **パフォーマンス監視**: 
  - `CalendarEventService.createWorkStateEvent()`に`PerformanceInterceptor`を適用（2秒以内の要件）
  - `CalendarEventService.getWorkStateEvents()`に`PerformanceInterceptor`を適用（3秒以内の要件）
- **キャッシュ**: 
  - 保存済み仕事一覧は30秒間キャッシュ（`CacheStrategy`で`ttlSeconds = 30`）
  - 個別のWorkStateは60秒間キャッシュ
- **テスト**: Calendar API連携のユニットテストと統合テスト

### Unit 4: 状態復元
- **パフォーマンス監視**: 
  - `RestoreService.restoreWorkState()`に`PerformanceInterceptor`を適用（10タブ: 5秒以内の要件）
  - `TabRestoreManager.restoreTabsInOrder()`に`PerformanceInterceptor`を適用
- **バッチ処理**: 
  - `BatchSize` Value Objectを使用して、大量タブ復元時は5個ずつ処理（100ms間隔）
- **テスト**: 復元機能のユニットテストと統合テスト

### Unit 5: UI/UX
- **パフォーマンス監視**: UI操作の応答時間を監視（100ms以内の要件）
- **テスト**: UIコンポーネントのユニットテストと統合テスト

---

## データフロー

### パフォーマンス監視のデータフロー

```
1. ユーザー操作
   ↓
2. Application Service（例: CalendarEventService）
   ↓
3. PerformanceInterceptor.intercept()
   ↓
4. PerformanceMetricsCollector（メトリクス収集）
   ↓
5. PerformanceMonitoringService.recordMetric()
   ↓
6. PerformanceMetricsRepository.save()
   ↓
7. PerformanceMonitoringService.checkThreshold()
   ↓
8. 閾値超過時: PerformanceThresholdExceeded イベント発行
```

### キャッシュのデータフロー（Cache-Aside パターン）

```
1. ユーザー操作
   ↓
2. Application Service
   ↓
3. CacheDecorator.withCache()
   ↓
4. CacheRepository.get()（キャッシュから取得を試みる）
   ↓
5a. キャッシュヒット: 結果を返す
5b. キャッシュミス: 操作を実行 → CacheRepository.set()でキャッシュに保存
```

### テスト実行のデータフロー

```
1. テスト実行コマンド（npm test）
   ↓
2. TestExecutionService.executeTestSuite()
   ↓
3. TestRunner.runTestSuite()（Jestを使用）
   ↓
4. TestResult[]を取得
   ↓
5. TestResultsRepository.save()
   ↓
6. TestExecuted イベント発行
   ↓
7. TestCoverageService.calculateCoverage()
   ↓
8. CoverageCalculator.calculateCoverage()（Jestのカバレッジ機能を使用）
   ↓
9. TestCoverageCalculated イベント発行
```

---

## 統合ポイント

### 既存サービスへの統合方法

1. **Decorator パターン**: 既存のサービスをラップしてパフォーマンス監視とキャッシュを追加
2. **Dependency Injection**: 既存のサービスに`PerformanceInterceptor`と`CacheDecorator`を注入
3. **Aspect-Oriented Programming (AOP)**: 簡易実装として、各サービスのメソッド呼び出しをインターセプト

### 実装例: CalendarEventServiceへの統合

```typescript
class CalendarEventService {
  constructor(
    // 既存の依存関係
    private readonly calendarEventRepository: CalendarEventRepository,
    // Unit 6で追加
    private readonly performanceInterceptor: PerformanceInterceptor,
    private readonly cacheDecorator: CacheDecorator
  ) {}

  async createWorkStateEvent(
    tabs: TabInfo[],
    title: string,
    memo?: string
  ): Promise<EventId> {
    return this.performanceInterceptor.intercept(
      'createWorkStateEvent',
      async () => {
        // 既存の実装
        const workState = WorkStateFactory.create(tabs, title, memo);
        const eventId = await this.calendarEventRepository.save(workState);
        return eventId;
      }
    );
  }

  async getWorkStateEvents(
    startDate: Date,
    endDate: Date
  ): Promise<WorkState[]> {
    const cacheStrategy = CacheStrategy.create(
      'getWorkStateEvents',
      30, // 30秒間キャッシュ
      100, // 最大100件
      'LRU'
    );

    return this.cacheDecorator.withCache(
      'getWorkStateEvents',
      { startDate, endDate },
      async () => {
        return this.performanceInterceptor.intercept(
          'getWorkStateEvents',
          async () => {
            // 既存の実装
            return await this.calendarEventRepository.findByDateRange(
              startDate,
              endDate
            );
          }
        );
      },
      cacheStrategy
    );
  }
}
```

---

## エラーハンドリング

### パフォーマンス監視のエラーハンドリング
- パフォーマンス監視の失敗は、メインの操作に影響を与えない（非同期処理、エラーをキャッチ）
- メトリクス収集の失敗はログに記録するのみ

### キャッシュのエラーハンドリング
- キャッシュの取得/保存に失敗した場合、メインの操作を実行（グレースフルデグラデーション）
- キャッシュエラーはログに記録するのみ

### テスト実行のエラーハンドリング
- テスト実行の失敗は、`TestResult`に`status: 'failed'`と`errorMessage`を記録
- テストスイート全体の実行は、個別のテストの失敗に関わらず続行

---

## パフォーマンス考慮事項

### パフォーマンス監視のオーバーヘッド
- メトリクス収集は非同期処理で実行し、メインの操作に影響を与えない
- メトリクスはサンプリング（例: 10%のリクエストのみ記録）でオーバーヘッドを削減

### キャッシュのメモリ使用量
- キャッシュサイズは`CacheStrategy.maxSize`で制限
- LRU（Least Recently Used）エビクションポリシーで古いエントリを削除
- メモリ使用量が50MBを超えた場合、キャッシュをクリア

### テスト実行のパフォーマンス
- テストは並列実行（Jestの機能を活用）
- テストカバレッジ計算は、テスト実行後に非同期で実行

---

## セキュリティ考慮事項

### パフォーマンスメトリクス
- パフォーマンスメトリクスには機密情報を含めない
- メトリクスはローカルストレージにのみ保存（外部送信しない）

### キャッシュ
- 認証トークンなどの機密情報はキャッシュしない
- キャッシュキーには機密情報を含めない

---

## テスト戦略

### ユニットテスト
- `PerformanceMonitoringService`、`PerformanceOptimizationService`、`CacheManagementService`のユニットテスト
- `PerformanceInterceptor`、`CacheDecorator`のユニットテスト
- テストカバレッジ80%以上を目標

### 統合テスト
- 既存サービス（`CalendarEventService`など）への統合テスト
- パフォーマンス監視とキャッシュが正常に動作することを確認

### E2Eテスト
- パフォーマンス要件（500ms、2秒、3秒、5秒）を満たすことを確認
- テストカバレッジが80%以上であることを確認

---

## 実装の優先順位

**優先度**: 高（品質保証の要）

**実装順序**:
1. パフォーマンス監視（`PerformanceInterceptor`、`PerformanceMonitoringService`）
2. キャッシュ（`CacheDecorator`、`CacheManagementService`）
3. テスト実行とカバレッジ（`TestExecutionService`、`TestCoverageService`）
4. 既存サービスへの統合

---

## リスク

- **RISK-PERF-001**: パフォーマンス監視のオーバーヘッド
  - 軽減策: 非同期処理、サンプリング、軽量な実装
- **RISK-CACHE-001**: キャッシュのメモリ使用量増加
  - 軽減策: キャッシュサイズの制限、LRUエビクション、定期的なクリア
- **RISK-TEST-001**: テスト実行のパフォーマンス影響
  - 軽減策: 並列実行、テストの最適化

---

**作成日**: 2026-02-03  
**最終更新**: 2026-02-03  
**ステータス**: 設計完了
