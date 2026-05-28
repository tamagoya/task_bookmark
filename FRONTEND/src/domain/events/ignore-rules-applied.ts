/**
 * IgnoreRulesApplied Domain Event
 * 保存・閉じ・復元のいずれかで無視URLルールが適用された時に発行されるイベント
 *
 * モニタリング用途を想定しており、UI への副作用は持たせない。
 */
export type IgnoreRulesAppliedScope = 'save' | 'close' | 'restore';

export class IgnoreRulesApplied {
  constructor(
    public readonly scope: IgnoreRulesAppliedScope,
    public readonly inputCount: number,
    public readonly outputCount: number,
    public readonly occurredAt: Date
  ) {
    if (scope !== 'save' && scope !== 'close' && scope !== 'restore') {
      throw new Error('IgnoreRulesApplied scope must be save|close|restore');
    }
    if (!Number.isInteger(inputCount) || inputCount < 0) {
      throw new Error('IgnoreRulesApplied inputCount must be a non-negative integer');
    }
    if (!Number.isInteger(outputCount) || outputCount < 0) {
      throw new Error('IgnoreRulesApplied outputCount must be a non-negative integer');
    }
    if (outputCount > inputCount) {
      throw new Error('IgnoreRulesApplied outputCount cannot exceed inputCount');
    }
    if (!(occurredAt instanceof Date) || Number.isNaN(occurredAt.getTime())) {
      throw new Error('IgnoreRulesApplied requires a valid occurredAt');
    }
  }

  /**
   * 除外件数
   */
  get filteredOutCount(): number {
    return this.inputCount - this.outputCount;
  }
}
