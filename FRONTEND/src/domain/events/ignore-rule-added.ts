import { IgnoreRule } from '../value-objects/ignore-rule';

/**
 * IgnoreRuleAdded Domain Event
 * 無視URLルールが追加された時に発行されるイベント
 */
export class IgnoreRuleAdded {
  constructor(
    public readonly rule: IgnoreRule,
    public readonly occurredAt: Date
  ) {
    if (!rule) {
      throw new Error('IgnoreRuleAdded requires a rule');
    }
    if (!(occurredAt instanceof Date) || Number.isNaN(occurredAt.getTime())) {
      throw new Error('IgnoreRuleAdded requires a valid occurredAt');
    }
  }
}
