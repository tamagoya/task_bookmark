import { IgnoreRuleAdded } from '../../../src/domain/events/ignore-rule-added';
import { IgnoreRuleUpdated } from '../../../src/domain/events/ignore-rule-updated';
import { IgnoreRuleRemoved } from '../../../src/domain/events/ignore-rule-removed';
import { IgnoreRulesApplied } from '../../../src/domain/events/ignore-rules-applied';
import { IgnoreRule } from '../../../src/domain/value-objects/ignore-rule';
import { IgnorePattern } from '../../../src/domain/value-objects/ignore-pattern';
import { IgnoreFlags } from '../../../src/domain/value-objects/ignore-flags';

const makeRule = (id = 'r1', pattern = 'a') => {
  const baseDate = new Date('2026-05-28T00:00:00.000Z');
  return IgnoreRule.create({
    id,
    pattern: IgnorePattern.create(pattern),
    flags: IgnoreFlags.create({
      ignoreOnSave: true,
      ignoreOnClose: false,
      ignoreOnRestore: false,
    }),
    enabled: true,
    createdAt: baseDate,
    updatedAt: baseDate,
  });
};

describe('IgnoreRuleAdded', () => {
  it('正しい値で作成できる', () => {
    const event = new IgnoreRuleAdded(makeRule(), new Date());
    expect(event.rule.id).toBe('r1');
  });

  it('rule が無いとエラー', () => {
    expect(
      () =>
        new IgnoreRuleAdded(
          undefined as unknown as IgnoreRule,
          new Date()
        )
    ).toThrow(/requires a rule/);
  });

  it('occurredAt が無効ならエラー', () => {
    expect(() => new IgnoreRuleAdded(makeRule(), new Date('invalid'))).toThrow(
      /valid occurredAt/
    );
  });
});

describe('IgnoreRuleUpdated', () => {
  it('previous/current が同じ id なら作成可', () => {
    const event = new IgnoreRuleUpdated(
      makeRule('1'),
      makeRule('1'),
      new Date()
    );
    expect(event.previous.id).toBe(event.current.id);
  });

  it('previous/current の id が異なればエラー', () => {
    expect(
      () => new IgnoreRuleUpdated(makeRule('1'), makeRule('2'), new Date())
    ).toThrow(/share the same id/);
  });

  it('previous か current が無ければエラー', () => {
    expect(
      () =>
        new IgnoreRuleUpdated(
          undefined as unknown as IgnoreRule,
          makeRule('1'),
          new Date()
        )
    ).toThrow(/previous and current rules/);
  });
});

describe('IgnoreRuleRemoved', () => {
  it('正しい値で作成できる', () => {
    const event = new IgnoreRuleRemoved('r1', new Date());
    expect(event.ruleId).toBe('r1');
  });

  it('空文字の ruleId はエラー', () => {
    expect(() => new IgnoreRuleRemoved('  ', new Date())).toThrow(
      /non-empty ruleId/
    );
  });

  it('occurredAt が無効ならエラー', () => {
    expect(() => new IgnoreRuleRemoved('r1', new Date('invalid'))).toThrow(
      /valid occurredAt/
    );
  });
});

describe('IgnoreRulesApplied', () => {
  it('正しい値で作成できる', () => {
    const event = new IgnoreRulesApplied('save', 5, 3, new Date());
    expect(event.scope).toBe('save');
    expect(event.filteredOutCount).toBe(2);
  });

  it('scope が不正ならエラー', () => {
    expect(
      () =>
        new IgnoreRulesApplied(
          'invalid' as 'save',
          5,
          3,
          new Date()
        )
    ).toThrow(/scope must be save/);
  });

  it('outputCount > inputCount はエラー', () => {
    expect(() => new IgnoreRulesApplied('save', 1, 2, new Date())).toThrow(
      /outputCount cannot exceed inputCount/
    );
  });

  it('input/output が非整数ならエラー', () => {
    expect(() => new IgnoreRulesApplied('save', 1.5, 1, new Date())).toThrow(
      /inputCount must be a non-negative integer/
    );
    expect(() => new IgnoreRulesApplied('save', 1, -1, new Date())).toThrow(
      /outputCount must be a non-negative integer/
    );
  });
});
