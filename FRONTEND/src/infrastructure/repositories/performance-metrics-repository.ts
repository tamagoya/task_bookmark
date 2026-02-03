import { PerformanceMetric } from '../../domain/value-objects/performance-metric';
import { PerformanceProfile } from '../../domain/value-objects/performance-profile';

/**
 * PerformanceMetricsRepository インターフェース
 * パフォーマンスメトリクスの永続化を担当
 */
export interface PerformanceMetricsRepository {
  /**
   * メトリクスを保存
   * @param metric パフォーマンスメトリクス
   */
  save(metric: PerformanceMetric): Promise<void>;

  /**
   * 操作名でメトリクスを検索
   * @param operationName 操作名
   * @param limit 取得件数の上限
   * @returns メトリクスの配列
   */
  findByOperationName(
    operationName: string,
    limit: number
  ): Promise<PerformanceMetric[]>;

  /**
   * パフォーマンスプロファイルを取得
   * @param operationName 操作名
   * @returns プロファイル（存在しない場合はnull）
   */
  getProfile(operationName: string): Promise<PerformanceProfile | null>;

  /**
   * パフォーマンスプロファイルを保存
   * @param profile パフォーマンスプロファイル
   */
  saveProfile(profile: PerformanceProfile): Promise<void>;
}
