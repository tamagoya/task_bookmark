/**
 * PerformanceMetricsCollector
 * パフォーマンスメトリクスの収集を担当するアダプター
 * Chrome Extension APIの制約内で可能な限りのメトリクスを収集
 */
export class PerformanceMetricsCollector {
  /**
   * 現在のメモリ使用量を取得
   * @returns メモリ使用量（MB）
   * 注: Chrome Extension APIでは直接的なメモリ使用量の取得が制限されるため、
   *     簡易的な推定値を返す
   */
  getMemoryUsage(): number {
    // Performance APIを使用してメモリ情報を取得（利用可能な場合）
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as PerformanceWithMemory).memory;
      if (memory && memory.usedJSHeapSize) {
        return memory.usedJSHeapSize / (1024 * 1024); // バイトをMBに変換
      }
    }

    // 利用不可の場合は0を返す
    return 0;
  }

  /**
   * 現在のCPU使用率を取得
   * @returns CPU使用率（%）
   * 注: Chrome Extension APIではCPU使用率の直接的な取得が困難なため、
   *     0を返す（将来の拡張用にメソッドを準備）
   */
  getCpuUsage(): number {
    // Chrome Extension APIではCPU使用率の直接的な取得が困難
    // 将来的にはchrome.system.cpu APIを使用可能（要パーミッション）
    return 0;
  }

  /**
   * 現在のタイムスタンプを取得（高精度）
   * @returns タイムスタンプ（ミリ秒）
   */
  now(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
  }

  /**
   * 経過時間を計算
   * @param startTime 開始時間（performance.now()の戻り値）
   * @returns 経過時間（ミリ秒）
   */
  elapsedTime(startTime: number): number {
    return this.now() - startTime;
  }
}

/**
 * Performance API with memory extension
 */
interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}
