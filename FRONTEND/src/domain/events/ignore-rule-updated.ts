import { IgnoreRule } from '../value-objects/ignore-rule';

/**
 * IgnoreRuleUpdated Domain Event
 * 無視URLルールが更新された時に発行されるイベント
 */
export class IgnoreRuleUpdated {
  constructor(
    public readonly previous: IgnoreRule,
    public readonly current: IgnoreRule,
    public readonly occurredAt: Date
  ) {
    if (!previous || !current) {
      throw new Error('IgnoreRuleUpdated requires previous and current rules');
    }
    if (previous.id !== current.id) {
      throw new Error('IgnoreRuleUpdated previous/current must share the same id');
    }
    if (!(occurredAt instanceof Date) || Number.isNaN(occurredAt.getTime())) {
      throw new Error('IgnoreRuleUpdated requires a valid occurredAt');
    }
  }
}
