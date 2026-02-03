import { PerformanceMetric } from '../../domain/value-objects/performance-metric';
import { PerformanceProfile } from '../../domain/value-objects/performance-profile';
import { PerformanceMetricsRepository } from './performance-metrics-repository';

/**
 * InMemoryPerformanceMetricsRepository
 * メモリ内でパフォーマンスメトリクスを管理するリポジトリ実装
 */
export class InMemoryPerformanceMetricsRepository
  implements PerformanceMetricsRepository
{
  private readonly metrics: Map<string, PerformanceMetric[]> = new Map();
  private readonly profiles: Map<string, PerformanceProfile> = new Map();
  private readonly maxMetricsPerOperation = 1000;

  /**
   * メトリクスを保存
   * @param metric パフォーマンスメトリクス
   */
  async save(metric: PerformanceMetric): Promise<void> {
    const operationName = metric.operationName;
    const existingMetrics = this.metrics.get(operationName) || [];

    // 最大件数を超えた場合、古いものから削除
    if (existingMetrics.length >= this.maxMetricsPerOperation) {
      existingMetrics.shift();
    }

    existingMetrics.push(metric);
    this.metrics.set(operationName, existingMetrics);
  }

  /**
   * 操作名でメトリクスを検索
   * @param operationName 操作名
   * @param limit 取得件数の上限
   * @returns メトリクスの配列
   */
  async findByOperationName(
    operationName: string,
    limit: number
  ): Promise<PerformanceMetric[]> {
    const existingMetrics = this.metrics.get(operationName) || [];
    return existingMetrics.slice(-limit);
  }

  /**
   * パフォーマンスプロファイルを取得
   * @param operationName 操作名
   * @returns プロファイル（存在しない場合はnull）
   */
  async getProfile(operationName: string): Promise<PerformanceProfile | null> {
    return this.profiles.get(operationName) || null;
  }

  /**
   * パフォーマンスプロファイルを保存
   * @param profile パフォーマンスプロファイル
   */
  async saveProfile(profile: PerformanceProfile): Promise<void> {
    this.profiles.set(profile.operationName, profile);
  }

  /**
   * すべてのメトリクスをクリア（テスト用）
   */
  clear(): void {
    this.metrics.clear();
    this.profiles.clear();
  }
}
