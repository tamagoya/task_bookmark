/**
 * IgnoreRuleRemoved Domain Event
 * 無視URLルールが削除された時に発行されるイベント
 */
export class IgnoreRuleRemoved {
  constructor(
    public readonly ruleId: string,
    public readonly occurredAt: Date
  ) {
    if (!ruleId || ruleId.trim().length === 0) {
      throw new Error('IgnoreRuleRemoved requires a non-empty ruleId');
    }
    if (!(occurredAt instanceof Date) || Number.isNaN(occurredAt.getTime())) {
      throw new Error('IgnoreRuleRemoved requires a valid occurredAt');
    }
  }
}
